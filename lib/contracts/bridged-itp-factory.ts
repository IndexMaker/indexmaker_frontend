import { getContract, createPublicClient, http, type PublicClient, type WalletClient } from 'viem';
import { arbitrum } from 'viem/chains';
import { bridgedItpFactoryAbi } from './abis/bridged-itp-factory';
import { BRIDGED_ITP_FACTORY_ADDRESS } from './addresses';
import { erc20Abi } from './abis/erc20';

// Use a flexible type for PublicClient to handle viem version differences
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexiblePublicClient = PublicClient | any;

/**
 * Get a read-only BridgedItpFactory contract instance
 */
export function getBridgedItpFactoryRead(publicClient: PublicClient) {
  return getContract({
    address: BRIDGED_ITP_FACTORY_ADDRESS,
    abi: bridgedItpFactoryAbi,
    client: publicClient,
  });
}

/**
 * Get a read-write BridgedItpFactory contract instance
 */
export function getBridgedItpFactoryWrite(
  publicClient: PublicClient,
  walletClient: WalletClient
) {
  return getContract({
    address: BRIDGED_ITP_FACTORY_ADDRESS,
    abi: bridgedItpFactoryAbi,
    client: { public: publicClient, wallet: walletClient },
  });
}

// =============================================================================
// BRIDGED ITP REGISTRY UTILITIES
// =============================================================================

/**
 * Represents a bridged ITP token mapping with metadata
 */
export interface BridgedItpInfo {
  /** Bridged ITP address on Arbitrum */
  arbitrumAddress: `0x${string}`;
  /** Native ITP address on Orbit */
  orbitAddress: `0x${string}`;
  /** Token name (e.g., "AI Index") */
  name: string;
  /** Token symbol (e.g., "ITP-AI") */
  symbol: string;
}

/**
 * Create an Arbitrum public client for factory queries
 */
function createFactoryClient(): FlexiblePublicClient {
  return createPublicClient({
    chain: arbitrum,
    transport: http(),
  });
}

/**
 * Fetch all bridged ITP addresses from the factory contract.
 *
 * @param client - Optional viem public client (creates one if not provided)
 * @returns Array of bridged ITP addresses on Arbitrum
 */
export async function fetchAllBridgedItps(
  client?: FlexiblePublicClient
): Promise<`0x${string}`[]> {
  const publicClient = client || createFactoryClient();

  try {
    const addresses = await publicClient.readContract({
      address: BRIDGED_ITP_FACTORY_ADDRESS,
      abi: bridgedItpFactoryAbi,
      functionName: 'getAllBridgedItps',
    });

    return addresses as `0x${string}`[];
  } catch (error) {
    console.warn('Failed to fetch bridged ITPs from factory:', error);
    return [];
  }
}

/**
 * Get the bridged ITP address on Arbitrum for a given Orbit ITP.
 *
 * @param orbitItpAddress - The native ITP address on Orbit
 * @param client - Optional viem public client
 * @returns The corresponding bridged ITP address on Arbitrum, or null if not found
 */
export async function getBridgedAddress(
  orbitItpAddress: `0x${string}`,
  client?: FlexiblePublicClient
): Promise<`0x${string}` | null> {
  const publicClient = client || createFactoryClient();

  try {
    const bridgedAddress = await publicClient.readContract({
      address: BRIDGED_ITP_FACTORY_ADDRESS,
      abi: bridgedItpFactoryAbi,
      functionName: 'orbitToArbitrum',
      args: [orbitItpAddress],
    });

    // Check for zero address (not found)
    if (bridgedAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return bridgedAddress as `0x${string}`;
  } catch (error) {
    console.warn('Failed to get bridged address for Orbit ITP:', error);
    return null;
  }
}

/**
 * Fetch token metadata (name, symbol) for a given token address.
 *
 * @param tokenAddress - The token address to query
 * @param client - Viem public client
 * @returns Object with name and symbol
 */
async function fetchTokenMetadata(
  tokenAddress: `0x${string}`,
  client: FlexiblePublicClient
): Promise<{ name: string; symbol: string }> {
  try {
    const [name, symbol] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'name',
      }),
      client.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'symbol',
      }),
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
    };
  } catch (error) {
    return { name: 'Unknown', symbol: 'UNK' };
  }
}

/**
 * Fetch all bridged ITP info with their Orbit counterparts and metadata.
 * This is the main function for building the ITP registry.
 *
 * @param client - Optional viem public client
 * @returns Array of BridgedItpInfo objects with full metadata
 */
export async function fetchBridgedItpRegistry(
  client?: FlexiblePublicClient
): Promise<BridgedItpInfo[]> {
  const publicClient = client || createFactoryClient();

  try {
    // Get all bridged ITP addresses
    const bridgedAddresses = await fetchAllBridgedItps(publicClient);

    if (bridgedAddresses.length === 0) {
      return [];
    }

    // Fetch metadata for each bridged ITP in parallel
    const registry = await Promise.all(
      bridgedAddresses.map(async (arbitrumAddress): Promise<BridgedItpInfo | null> => {
        try {
          // Get metadata from the bridged token
          const metadata = await fetchTokenMetadata(arbitrumAddress, publicClient);

          // Use getBridgedItp to get the Orbit address
          // Note: The factory stores orbit -> arbitrum mapping, so we need to find the reverse
          // For now, we'll use a workaround: the orbit address is stored when the token was created
          // The contract has orbitToArbitrum mapping, not the reverse directly accessible

          // Since we can't easily reverse the mapping, we'll need to use events or a different approach
          // For now, we'll return what we have and note that orbit address needs to be fetched separately

          return {
            arbitrumAddress,
            orbitAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Placeholder - will be resolved via events
            name: metadata.name,
            symbol: metadata.symbol,
          };
        } catch (error) {
          return null;
        }
      })
    );

    // Filter out nulls
    return registry.filter((info): info is BridgedItpInfo => info !== null);
  } catch (error) {
    console.warn('Failed to fetch bridged ITP registry:', error);
    return [];
  }
}

/**
 * Parse BridgedItpCreated events to build the orbit<->arbitrum address mapping.
 * This provides the complete mapping including Orbit addresses.
 *
 * @param fromBlock - Starting block number (default: 0)
 * @param client - Optional viem public client
 * @returns Array of BridgedItpInfo with complete orbit/arbitrum address mappings
 */
export async function fetchBridgedItpRegistryFromEvents(
  fromBlock: bigint = 0n,
  client?: FlexiblePublicClient
): Promise<BridgedItpInfo[]> {
  const publicClient = client || createFactoryClient();

  try {
    const logs = await publicClient.getLogs({
      address: BRIDGED_ITP_FACTORY_ADDRESS,
      event: {
        type: 'event',
        name: 'BridgedItpCreated',
        inputs: [
          { indexed: true, name: 'orbitItp', type: 'address' },
          { indexed: true, name: 'arbitrumToken', type: 'address' },
          { indexed: false, name: 'name', type: 'string' },
          { indexed: false, name: 'symbol', type: 'string' },
        ],
      },
      fromBlock,
      toBlock: 'latest',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return logs.map((log: any) => {
      const args = log.args as {
        orbitItp: `0x${string}`;
        arbitrumToken: `0x${string}`;
        name: string;
        symbol: string;
      };

      return {
        arbitrumAddress: args.arbitrumToken,
        orbitAddress: args.orbitItp,
        name: args.name,
        symbol: args.symbol,
      };
    });
  } catch (error) {
    console.warn('Failed to fetch bridged ITP registry from events:', error);
    return [];
  }
}

export { bridgedItpFactoryAbi, BRIDGED_ITP_FACTORY_ADDRESS };
