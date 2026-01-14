'use client';

/**
 * useDualChainBalances Hook
 *
 * Fetches and manages ITP balances across both Arbitrum (bridged) and Orbit (native) chains.
 * Provides auto-refresh, manual refresh, and error handling capabilities.
 *
 * @see Story 3-4 Task 2
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import {
  fetchDualChainBalances,
  createArbitrumClient,
  type DualChainBalanceResult,
  ITP_DECIMALS,
} from '@/lib/contracts/balance-utils';
import { ARBITRUM_CHAIN_ID, ORBIT_CHAIN_ID } from '@/lib/contracts/addresses';

/**
 * Token pair configuration for dual-chain balance queries
 */
export interface DualChainTokenPair {
  /** Human-readable name (e.g., "AI Index") */
  name: string;
  /** Token symbol (e.g., "ITP-AI") */
  symbol: string;
  /** Bridged ITP address on Arbitrum */
  arbitrumAddress: `0x${string}`;
  /** Native ITP address on Orbit */
  orbitAddress: `0x${string}`;
}

/**
 * Balance data for a single ITP across both chains
 */
export interface DualChainBalance {
  /** Token pair configuration */
  token: DualChainTokenPair;
  /** Balance on Arbitrum (bridged ITP) */
  arbitrumBalance: bigint;
  arbitrumFormatted: string;
  /** Balance on Orbit (native ITP) */
  orbitBalance: bigint;
  orbitFormatted: string;
  /** Combined total balance */
  totalBalance: bigint;
  totalFormatted: string;
  /** Token decimals (always 18 for ITP) */
  decimals: number;
  /** Loading state for this specific token */
  isLoading: boolean;
  /** Error state for this specific token */
  error?: string;
}

/**
 * Configuration for the useDualChainBalances hook
 */
export interface UseDualChainBalancesConfig {
  /** Array of token pairs to query */
  tokenPairs: DualChainTokenPair[];
  /** Auto-refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
  /** Whether to auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Return type for useDualChainBalances hook
 */
export interface UseDualChainBalancesReturn {
  /** Array of balance data for each token pair */
  balances: DualChainBalance[];
  /** Overall loading state */
  isLoading: boolean;
  /** Overall error state */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Last successful fetch timestamp */
  lastUpdated: number | null;
  /** Whether currently connected to a supported chain */
  isChainSupported: boolean;
}

/**
 * Hook for fetching ITP balances across Arbitrum and Orbit chains.
 *
 * @example
 * ```tsx
 * const { balances, isLoading, refresh, error } = useDualChainBalances({
 *   tokenPairs: [
 *     {
 *       name: 'AI Index',
 *       symbol: 'ITP-AI',
 *       arbitrumAddress: '0x...',
 *       orbitAddress: '0x...',
 *     },
 *   ],
 *   refreshInterval: 30000,
 * });
 *
 * // Display balances
 * {balances.map((b) => (
 *   <div key={b.token.symbol}>
 *     {b.token.symbol}: {b.arbitrumFormatted} (Arb) / {b.orbitFormatted} (Orbit)
 *   </div>
 * ))}
 *
 * // Manual refresh
 * <button onClick={refresh}>Refresh</button>
 * ```
 */
export function useDualChainBalances(
  config: UseDualChainBalancesConfig
): UseDualChainBalancesReturn {
  const {
    tokenPairs,
    refreshInterval = 30000,
    autoRefresh = true,
    fetchOnMount = true,
  } = config;

  const { address, chainId, isConnected } = useWallet();

  const [balances, setBalances] = useState<DualChainBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Refs for cleanup and preventing stale updates
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if current chain is supported (Arbitrum or Orbit)
  const isChainSupported = chainId
    ? [ARBITRUM_CHAIN_ID, ORBIT_CHAIN_ID].includes(
        typeof chainId === 'string' ? parseInt(chainId, 16) : chainId
      )
    : false;

  /**
   * Fetch balances for all token pairs
   */
  const fetchBalances = useCallback(async () => {
    if (!address || !isConnected) {
      setBalances([]);
      return;
    }

    if (tokenPairs.length === 0) {
      setBalances([]);
      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const arbitrumClient = createArbitrumClient();

      // Fetch all token pair balances in parallel
      const results = await Promise.all(
        tokenPairs.map(async (pair): Promise<DualChainBalance> => {
          try {
            const result = await fetchDualChainBalances(
              address,
              pair.arbitrumAddress,
              pair.orbitAddress,
              arbitrumClient
            );

            return {
              token: pair,
              arbitrumBalance: result.arbitrum.raw,
              arbitrumFormatted: result.arbitrum.formatted,
              orbitBalance: result.orbit.raw,
              orbitFormatted: result.orbit.formatted,
              totalBalance: result.total.raw,
              totalFormatted: result.total.formatted,
              decimals: ITP_DECIMALS,
              isLoading: false,
            };
          } catch (err) {
            // Return balance with error for this specific token
            return {
              token: pair,
              arbitrumBalance: 0n,
              arbitrumFormatted: '0',
              orbitBalance: 0n,
              orbitFormatted: '0',
              totalBalance: 0n,
              totalFormatted: '0',
              decimals: ITP_DECIMALS,
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch balance',
            };
          }
        })
      );

      // Only update state if this is still the latest fetch
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setBalances(results);
        setLastUpdated(Date.now());
        setError(null);
      }
    } catch (err) {
      // Only update error if this is still the latest fetch
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      }
    } finally {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [address, isConnected, tokenPairs]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchBalances();
  }, [fetchBalances]);

  // Clear balances when wallet disconnects or address changes
  useEffect(() => {
    if (!isConnected || !address) {
      setBalances([]);
      setLastUpdated(null);
      setError(null);
    }
  }, [isConnected, address]);

  // Fetch on mount if configured
  useEffect(() => {
    if (fetchOnMount && isConnected && address) {
      fetchBalances();
    }
  }, [fetchOnMount, fetchBalances, isConnected, address]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh && isConnected && address && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchBalances, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchBalances, isConnected, address]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle chain changes - refetch when chain changes
  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    balances,
    isLoading,
    error,
    refresh,
    lastUpdated,
    isChainSupported,
  };
}

export default useDualChainBalances;
