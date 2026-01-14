/**
 * Balance Checking Utilities for Arbitrum Operations
 *
 * Provides utilities for checking token balances and approvals on Arbitrum.
 * Used by buy/sell flows to validate user has sufficient funds before transactions.
 */

import { formatUnits, createPublicClient, http, type PublicClient } from 'viem';
import { arbitrum } from 'viem/chains';
import { erc20Abi } from './abis/erc20';
import { USDC_ADDRESS, ORBIT_RPC_URL } from './addresses';
import { orbitChain } from './orbit-config';

// Use a flexible type for PublicClient to handle viem version differences
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexiblePublicClient = PublicClient | any;

// Token decimals
export const USDC_DECIMALS = 6;
export const ITP_DECIMALS = 18;

/**
 * Result of a balance check
 */
export interface BalanceResult {
  /** Raw balance in token's smallest unit (wei/atomic units) */
  raw: bigint;
  /** Human-readable formatted balance */
  formatted: string;
  /** Token decimals used for formatting */
  decimals: number;
}

/**
 * Result of an approval check
 */
export interface ApprovalResult {
  /** Whether the allowance is sufficient for the requested amount */
  hasApproval: boolean;
  /** Current allowance in token's smallest unit */
  currentAllowance: bigint;
}

/**
 * Check USDC balance on Arbitrum for a given address.
 *
 * @param publicClient - Viem public client configured for Arbitrum
 * @param address - The wallet address to check
 * @returns Balance result with raw and formatted values
 * @throws Error if contract read fails
 *
 * @example
 * ```ts
 * const client = createFlexiblePublicClient({ chain: arbitrum, transport: http() });
 * const balance = await checkUsdcBalance(client, '0x...');
 * console.log(`USDC Balance: ${balance.formatted}`);
 * ```
 */
export async function checkUsdcBalance(
  publicClient: FlexiblePublicClient,
  address: `0x${string}` | string
): Promise<BalanceResult> {
  try {
    const balanceRaw = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return {
      raw: balanceRaw,
      formatted: formatUnits(balanceRaw, USDC_DECIMALS),
      decimals: USDC_DECIMALS,
    };
  } catch (error) {
    throw new Error(
      `Failed to check USDC balance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check ITP token balance on Arbitrum for a given address.
 *
 * @param publicClient - Viem public client configured for Arbitrum
 * @param address - The wallet address to check
 * @param itpAddress - The ITP token contract address
 * @returns Balance result with raw and formatted values
 * @throws Error if contract read fails
 *
 * @example
 * ```ts
 * const client = createFlexiblePublicClient({ chain: arbitrum, transport: http() });
 * const balance = await checkItpBalance(client, '0x...', '0xITPAddress');
 * console.log(`ITP Balance: ${balance.formatted}`);
 * ```
 */
export async function checkItpBalance(
  publicClient: FlexiblePublicClient,
  address: `0x${string}` | string,
  itpAddress: `0x${string}` | string
): Promise<BalanceResult> {
  try {
    const balanceRaw = await publicClient.readContract({
      address: itpAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return {
      raw: balanceRaw,
      formatted: formatUnits(balanceRaw, ITP_DECIMALS),
      decimals: ITP_DECIMALS,
    };
  } catch (error) {
    throw new Error(
      `Failed to check ITP balance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a token has sufficient approval for a spender.
 *
 * @param publicClient - Viem public client configured for Arbitrum
 * @param ownerAddress - The token owner's address
 * @param tokenAddress - The token contract address
 * @param spenderAddress - The address that will spend the tokens
 * @param amount - The amount to check approval for (in token's smallest unit)
 * @returns Approval result indicating if allowance is sufficient
 * @throws Error if allowance check fails
 *
 * @example
 * ```ts
 * const client = createFlexiblePublicClient({ chain: arbitrum, transport: http() });
 * const approval = await hasApproval(
 *   client,
 *   '0xOwner',
 *   USDC_ADDRESS,
 *   BRIDGE_PROXY_ADDRESS,
 *   parseUnits('100', 6) // 100 USDC
 * );
 * if (!approval.hasApproval) {
 *   // Need to request approval
 * }
 * ```
 */
export async function hasApproval(
  publicClient: FlexiblePublicClient,
  ownerAddress: `0x${string}` | string,
  tokenAddress: `0x${string}` | string,
  spenderAddress: `0x${string}` | string,
  amount: bigint
): Promise<ApprovalResult> {
  try {
    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
    });

    return {
      hasApproval: allowance >= amount,
      currentAllowance: allowance,
    };
  } catch (error) {
    throw new Error(
      `Failed to check approval: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if user has sufficient USDC balance for a purchase.
 *
 * @param publicClient - Viem public client configured for Arbitrum
 * @param address - The wallet address to check
 * @param requiredAmount - The amount of USDC needed (in smallest unit, i.e., 1 USDC = 1000000)
 * @returns Object with balance info and sufficiency check
 */
export async function hasSufficientUsdcBalance(
  publicClient: FlexiblePublicClient,
  address: `0x${string}` | string,
  requiredAmount: bigint
): Promise<{ balance: BalanceResult; isSufficient: boolean; shortfall: bigint }> {
  const balance = await checkUsdcBalance(publicClient, address);
  const isSufficient = balance.raw >= requiredAmount;
  const shortfall = isSufficient ? 0n : requiredAmount - balance.raw;

  return {
    balance,
    isSufficient,
    shortfall,
  };
}

/**
 * Check if user has sufficient ITP balance for a sale.
 *
 * @param publicClient - Viem public client configured for Arbitrum
 * @param address - The wallet address to check
 * @param itpAddress - The ITP token contract address
 * @param requiredAmount - The amount of ITP needed (in smallest unit)
 * @returns Object with balance info and sufficiency check
 */
export async function hasSufficientItpBalance(
  publicClient: FlexiblePublicClient,
  address: `0x${string}` | string,
  itpAddress: `0x${string}` | string,
  requiredAmount: bigint
): Promise<{ balance: BalanceResult; isSufficient: boolean; shortfall: bigint }> {
  const balance = await checkItpBalance(publicClient, address, itpAddress);
  const isSufficient = balance.raw >= requiredAmount;
  const shortfall = isSufficient ? 0n : requiredAmount - balance.raw;

  return {
    balance,
    isSufficient,
    shortfall,
  };
}

// =============================================================================
// DUAL-CHAIN BALANCE UTILITIES
// =============================================================================

/**
 * Result of a dual-chain balance query
 */
export interface DualChainBalanceResult {
  /** Balance on Arbitrum (bridged ITP) */
  arbitrum: BalanceResult;
  /** Balance on Orbit (native ITP) */
  orbit: BalanceResult;
  /** Combined total balance */
  total: BalanceResult;
}

/**
 * Create a public client for Orbit chain queries
 */
export function createOrbitClient(): FlexiblePublicClient {
  return createPublicClient({
    chain: orbitChain,
    transport: http(ORBIT_RPC_URL),
  });
}

/**
 * Create a public client for Arbitrum chain queries
 */
export function createArbitrumClient(): FlexiblePublicClient {
  return createPublicClient({
    chain: arbitrum,
    transport: http(),
  });
}

/**
 * Check ITP token balance on Orbit chain (native ITP).
 *
 * @param address - The wallet address to check
 * @param itpAddress - The ITP token contract address on Orbit
 * @returns Balance result with raw and formatted values
 * @throws Error if contract read fails
 */
export async function checkOrbitItpBalance(
  address: `0x${string}` | string,
  itpAddress: `0x${string}` | string
): Promise<BalanceResult> {
  const orbitClient = createOrbitClient();
  try {
    const balanceRaw = await orbitClient.readContract({
      address: itpAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });

    return {
      raw: balanceRaw,
      formatted: formatUnits(balanceRaw, ITP_DECIMALS),
      decimals: ITP_DECIMALS,
    };
  } catch (error) {
    throw new Error(
      `Failed to check Orbit ITP balance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check ITP token balance on Arbitrum (bridged ITP).
 * This is an alias for checkItpBalance with explicit naming.
 *
 * @param publicClient - Viem public client configured for Arbitrum
 * @param address - The wallet address to check
 * @param itpAddress - The bridged ITP token contract address on Arbitrum
 * @returns Balance result with raw and formatted values
 */
export async function checkArbitrumBridgedItpBalance(
  publicClient: FlexiblePublicClient,
  address: `0x${string}` | string,
  itpAddress: `0x${string}` | string
): Promise<BalanceResult> {
  return checkItpBalance(publicClient, address, itpAddress);
}

/**
 * Fetch balances for an ITP on both Arbitrum and Orbit chains in parallel.
 *
 * @param address - The wallet address to check
 * @param arbitrumItpAddress - The bridged ITP address on Arbitrum
 * @param orbitItpAddress - The native ITP address on Orbit
 * @param arbitrumClient - Optional pre-created Arbitrum client
 * @returns Combined balance result for both chains
 */
export async function fetchDualChainBalances(
  address: `0x${string}` | string,
  arbitrumItpAddress: `0x${string}` | string,
  orbitItpAddress: `0x${string}` | string,
  arbitrumClient?: FlexiblePublicClient
): Promise<DualChainBalanceResult> {
  const arbClient = arbitrumClient || createArbitrumClient();

  // Query both chains in parallel
  const [arbitrumBalance, orbitBalance] = await Promise.all([
    checkArbitrumBridgedItpBalance(arbClient, address, arbitrumItpAddress).catch(
      (): BalanceResult => ({ raw: 0n, formatted: '0', decimals: ITP_DECIMALS })
    ),
    checkOrbitItpBalance(address, orbitItpAddress).catch(
      (): BalanceResult => ({ raw: 0n, formatted: '0', decimals: ITP_DECIMALS })
    ),
  ]);

  // Calculate total
  const totalRaw = arbitrumBalance.raw + orbitBalance.raw;

  return {
    arbitrum: arbitrumBalance,
    orbit: orbitBalance,
    total: {
      raw: totalRaw,
      formatted: formatUnits(totalRaw, ITP_DECIMALS),
      decimals: ITP_DECIMALS,
    },
  };
}
