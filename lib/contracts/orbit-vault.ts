/**
 * Orbit VAULT Contract Utilities
 *
 * Provides functions for reading ITP metadata and details from the
 * VAULT contract on Orbit chain.
 *
 * @see Story 3-4 Task 6
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { ORBIT_VAULT_ADDRESS, ORBIT_RPC_URL } from './addresses';
import { orbitChain } from './orbit-config';
import { erc20Abi } from './abis/erc20';

// Use a flexible type for PublicClient to handle viem version differences
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexiblePublicClient = PublicClient | any;

/**
 * Minimal VAULT ABI for reading ITP data
 *
 * NOTE: This ABI is based on expected VAULT interface.
 * Update when actual contract ABI is available.
 */
export const vaultAbi = [
  {
    type: 'function',
    name: 'getItpPrice',
    inputs: [{ name: 'itpAddress', type: 'address' }],
    outputs: [{ name: 'price', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAllItps',
    inputs: [],
    outputs: [{ type: 'address[]', name: '' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getItpInfo',
    inputs: [{ name: 'itpAddress', type: 'address' }],
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'price', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

/**
 * ITP details from Orbit VAULT
 */
export interface OrbitItpDetails {
  /** ITP token address on Orbit */
  address: `0x${string}`;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Total supply (raw bigint) */
  totalSupply: bigint;
  /** Price in USDC (6 decimals) - null if unavailable */
  priceUsdc: bigint | null;
  /** Token decimals (always 18 for ITP) */
  decimals: number;
}

/**
 * Create an Orbit public client for VAULT queries
 */
function createVaultClient(): FlexiblePublicClient {
  return createPublicClient({
    chain: orbitChain,
    transport: http(ORBIT_RPC_URL),
  });
}

/**
 * Fetch ITP token metadata from Orbit chain.
 *
 * @param itpAddress - The ITP token address on Orbit
 * @param client - Optional viem public client
 * @returns Token metadata (name, symbol, totalSupply)
 */
export async function fetchOrbitItpMetadata(
  itpAddress: `0x${string}`,
  client?: FlexiblePublicClient
): Promise<{ name: string; symbol: string; totalSupply: bigint }> {
  const publicClient = client || createVaultClient();

  try {
    const [name, symbol, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: itpAddress,
        abi: erc20Abi,
        functionName: 'name',
      }),
      publicClient.readContract({
        address: itpAddress,
        abi: erc20Abi,
        functionName: 'symbol',
      }),
      publicClient.readContract({
        address: itpAddress,
        abi: erc20Abi,
        functionName: 'totalSupply',
      }),
    ]);

    return {
      name: name as string,
      symbol: symbol as string,
      totalSupply: totalSupply as bigint,
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch ITP metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch ITP price from Orbit VAULT.
 *
 * @param itpAddress - The ITP token address on Orbit
 * @param client - Optional viem public client
 * @returns Price in USDC (6 decimals), or null if unavailable
 */
export async function fetchOrbitItpPrice(
  itpAddress: `0x${string}`,
  client?: FlexiblePublicClient
): Promise<bigint | null> {
  const publicClient = client || createVaultClient();

  try {
    const price = await publicClient.readContract({
      address: ORBIT_VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: 'getItpPrice',
      args: [itpAddress],
    });

    return price as bigint;
  } catch (error) {
    // Price may not be available for all ITPs
    console.warn('Failed to fetch ITP price from VAULT:', error);
    return null;
  }
}

/**
 * Fetch complete ITP details from Orbit chain.
 *
 * @param itpAddress - The ITP token address on Orbit
 * @param client - Optional viem public client
 * @returns Complete ITP details including metadata and price
 */
export async function fetchOrbitItpDetails(
  itpAddress: `0x${string}`,
  client?: FlexiblePublicClient
): Promise<OrbitItpDetails> {
  const publicClient = client || createVaultClient();

  // Fetch metadata and price in parallel
  const [metadata, price] = await Promise.all([
    fetchOrbitItpMetadata(itpAddress, publicClient),
    fetchOrbitItpPrice(itpAddress, publicClient),
  ]);

  return {
    address: itpAddress,
    name: metadata.name,
    symbol: metadata.symbol,
    totalSupply: metadata.totalSupply,
    priceUsdc: price,
    decimals: 18, // ITP always has 18 decimals
  };
}

/**
 * Fetch all ITP addresses from Orbit VAULT.
 *
 * @param client - Optional viem public client
 * @returns Array of ITP addresses on Orbit
 */
export async function fetchAllOrbitItps(
  client?: FlexiblePublicClient
): Promise<`0x${string}`[]> {
  const publicClient = client || createVaultClient();

  try {
    const addresses = await publicClient.readContract({
      address: ORBIT_VAULT_ADDRESS,
      abi: vaultAbi,
      functionName: 'getAllItps',
    });

    return addresses as `0x${string}`[];
  } catch (error) {
    console.warn('Failed to fetch all ITPs from VAULT:', error);
    return [];
  }
}

/**
 * Fetch details for multiple ITPs in parallel.
 *
 * @param itpAddresses - Array of ITP addresses on Orbit
 * @param client - Optional viem public client
 * @returns Array of ITP details
 */
export async function fetchMultipleOrbitItpDetails(
  itpAddresses: `0x${string}`[],
  client?: FlexiblePublicClient
): Promise<OrbitItpDetails[]> {
  const publicClient = client || createVaultClient();

  const results = await Promise.all(
    itpAddresses.map(async (address): Promise<OrbitItpDetails | null> => {
      try {
        return await fetchOrbitItpDetails(address, publicClient);
      } catch (error) {
        console.warn(`Failed to fetch details for ITP ${address}:`, error);
        return null;
      }
    })
  );

  return results.filter((detail): detail is OrbitItpDetails => detail !== null);
}
