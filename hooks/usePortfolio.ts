'use client';

/**
 * usePortfolio Hook
 *
 * Fetches and manages the user's ITP portfolio across both Arbitrum (bridged)
 * and Orbit (native) chains. Provides auto-refresh, manual refresh, and
 * computed portfolio summary.
 *
 * @see Story 6.12 - Frontend Portfolio Tab
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useDualChainBalances, type DualChainTokenPair } from '@/hooks/useDualChainBalances';
import {
  type PortfolioPosition,
  type PortfolioSummary,
  type UsePortfolioReturn,
  type ItpListResponse,
  type ItpListItem,
} from '@/types/portfolio';
import { ITP_DECIMALS } from '@/lib/contracts/balance-utils';

/** Backend API base URL */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/** Default refresh interval in ms (30 seconds) */
const DEFAULT_REFRESH_INTERVAL = 30000;

/**
 * Configuration for usePortfolio hook
 */
export interface UsePortfolioConfig {
  /** Auto-refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
  /** Whether to auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Format a bigint balance to a human-readable number
 */
function formatBalance(balance: bigint): number {
  return Number(balance) / 10 ** ITP_DECIMALS;
}

/**
 * Calculate USD value from balance and price
 */
function calculateValue(balance: bigint, price: number): number {
  return formatBalance(balance) * price;
}

/**
 * Calculate P&L percentage
 * Returns null if costBasis is 0 (MVP - no cost basis tracking)
 */
function calculatePnlPercent(currentValue: number, costBasis: number): number | null {
  if (costBasis === 0) return null;
  return ((currentValue - costBasis) / costBasis) * 100;
}

/**
 * Hook for managing user's ITP portfolio across both chains.
 *
 * @example
 * ```tsx
 * function PortfolioPage() {
 *   const { positions, summary, isLoading, error, refresh } = usePortfolio();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error} />;
 *   if (positions.length === 0) return <EmptyPortfolio />;
 *
 *   return (
 *     <div>
 *       <PortfolioSummaryCard summary={summary} />
 *       <PortfolioTable positions={positions} />
 *     </div>
 *   );
 * }
 * ```
 */
export function usePortfolio(config: UsePortfolioConfig = {}): UsePortfolioReturn {
  const {
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    autoRefresh = true,
    fetchOnMount = true,
  } = config;

  const { address, isConnected } = useWallet();

  // ITP list from backend
  const [itpList, setItpList] = useState<ItpListItem[]>([]);
  const [itpListLoading, setItpListLoading] = useState(false);
  const [itpListError, setItpListError] = useState<string | null>(null);

  // Portfolio state
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Refs for cleanup and preventing stale updates
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Build token pairs for useDualChainBalances
  const tokenPairs: DualChainTokenPair[] = itpList.map((itp) => ({
    name: itp.name,
    symbol: itp.symbol,
    arbitrumAddress: itp.arbitrum_address,
    orbitAddress: itp.orbit_address,
  }));

  // Use dual-chain balances hook for all ITPs
  const {
    balances,
    isLoading: balancesLoading,
    error: balancesError,
    refresh: refreshBalances,
  } = useDualChainBalances({
    tokenPairs,
    refreshInterval,
    autoRefresh,
    fetchOnMount: false, // We'll trigger manually after ITP list loads
  });

  /**
   * Fetch ITP list from backend
   */
  const fetchItpList = useCallback(async () => {
    const currentFetchId = ++fetchIdRef.current;
    setItpListLoading(true);
    setItpListError(null);

    try {
      const response = await fetch(`${API_BASE}/api/itp/list`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ITP list: ${response.statusText}`);
      }

      const data: ItpListResponse = await response.json();

      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setItpList(data.itps || []);
        setItpListError(null);
      }
    } catch (err) {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setItpListError(err instanceof Error ? err.message : 'Failed to fetch ITP list');
      }
    } finally {
      if (mountedRef.current && currentFetchId === fetchIdRef.current) {
        setItpListLoading(false);
      }
    }
  }, []);

  /**
   * Build portfolio positions from balances and ITP list
   */
  useEffect(() => {
    if (balances.length === 0 || itpList.length === 0) {
      setPositions([]);
      setSummary(null);
      return;
    }

    // Map balances to positions, filtering for non-zero balances
    const newPositions: PortfolioPosition[] = balances
      .filter((balance) => balance.totalBalance > 0n)
      .map((balance) => {
        // Find matching ITP for current price
        const itp = itpList.find((i) => i.symbol === balance.token.symbol);
        const currentPrice = itp?.current_price ?? 0;
        const value = calculateValue(balance.totalBalance, currentPrice);
        const costBasis = 0; // MVP: No cost basis tracking
        const pnlPercent = calculatePnlPercent(value, costBasis);
        const pnlAbsolute = costBasis === 0 ? null : value - costBasis;

        return {
          itpId: itp?.id ?? 0,
          name: balance.token.name,
          symbol: balance.token.symbol,
          arbitrumBalance: balance.arbitrumBalance,
          arbitrumFormatted: balance.arbitrumFormatted,
          orbitBalance: balance.orbitBalance,
          orbitFormatted: balance.orbitFormatted,
          totalBalance: balance.totalBalance,
          totalFormatted: balance.totalFormatted,
          currentPrice,
          value,
          costBasis,
          pnlPercent,
          pnlAbsolute,
          arbitrumAddress: balance.token.arbitrumAddress,
          orbitAddress: balance.token.orbitAddress,
        };
      });

    // Calculate summary
    const totalValue = newPositions.reduce((sum, p) => sum + p.value, 0);
    const newSummary: PortfolioSummary = {
      totalValue,
      totalPnlPercent: null, // MVP: No cost basis
      totalPnlAbsolute: null,
      positionCount: newPositions.length,
      lastUpdated: Date.now(),
    };

    setPositions(newPositions);
    setSummary(newSummary);
    setLastUpdated(Date.now());
  }, [balances, itpList]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchItpList();
    await refreshBalances();
  }, [fetchItpList, refreshBalances]);

  // Fetch ITP list on mount if configured
  useEffect(() => {
    if (fetchOnMount && isConnected && address) {
      fetchItpList();
    }
  }, [fetchOnMount, fetchItpList, isConnected, address]);

  // Trigger balance fetch after ITP list loads
  useEffect(() => {
    if (itpList.length > 0 && isConnected && address) {
      refreshBalances();
    }
  }, [itpList, isConnected, address, refreshBalances]);

  // Clear portfolio when wallet disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      setPositions([]);
      setSummary(null);
      setLastUpdated(null);
      setItpList([]);
    }
  }, [isConnected, address]);

  // Auto-refresh ITP list
  useEffect(() => {
    if (autoRefresh && isConnected && address && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchItpList, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, fetchItpList, isConnected, address]);

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

  // Combined loading state
  const isLoading = itpListLoading || balancesLoading;

  // Combined error state
  const error = itpListError || balancesError;

  return {
    positions,
    summary,
    isLoading,
    error,
    refresh,
    lastUpdated,
  };
}

export default usePortfolio;
