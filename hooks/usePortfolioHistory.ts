'use client';

/**
 * usePortfolioHistory Hook
 *
 * Fetches historical portfolio value data for chart display.
 *
 * MVP Implementation: Returns empty array as historical price data API
 * is not yet available. Future implementation will aggregate historical
 * data across all user's ITP holdings.
 *
 * @see Story 6.12 - Frontend Portfolio Tab (AC #6)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import {
  type PortfolioChartPoint,
  type UsePortfolioHistoryReturn,
} from '@/types/portfolio';

/**
 * Configuration for usePortfolioHistory hook
 */
export interface UsePortfolioHistoryConfig {
  /** Number of days of history to fetch (default: 7) */
  days?: number;
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Hook for fetching historical portfolio values.
 *
 * MVP Note: Currently returns an empty array since the backend
 * historical price API (GET /api/itp/{id}/history) is not yet implemented.
 * The UI should display a "Historical data coming soon" placeholder.
 *
 * Future implementation will:
 * 1. Call GET /api/itp/{id}/history for each ITP the user holds
 * 2. Aggregate the historical values across all holdings
 * 3. Return a time series of total portfolio value
 *
 * @example
 * ```tsx
 * function PortfolioChart() {
 *   const { history, isLoading, error } = usePortfolioHistory({ days: 7 });
 *
 *   if (history.length === 0) {
 *     return <div>Historical data coming soon</div>;
 *   }
 *
 *   return <Sparkline data={history} />;
 * }
 * ```
 */
export function usePortfolioHistory(
  config: UsePortfolioHistoryConfig = {}
): UsePortfolioHistoryReturn {
  const {
    // days = 7, // Unused in MVP
    fetchOnMount = true,
  } = config;

  const { address, isConnected } = useWallet();

  const [history, setHistory] = useState<PortfolioChartPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  /**
   * Fetch historical portfolio data
   *
   * MVP: Returns empty array immediately.
   * Future: Will fetch from GET /api/itp/{id}/history for each holding.
   */
  const fetchHistory = useCallback(async () => {
    if (!isConnected || !address) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // MVP Implementation: No historical data API available yet
      // Return empty array to signal "no data available"
      //
      // Future implementation:
      // 1. Get list of user's ITP holdings from usePortfolio
      // 2. For each ITP:
      //    const response = await fetch(`${API_BASE}/api/itp/${itpId}/history?days=${days}`);
      //    const data = await response.json();
      // 3. Aggregate by timestamp across all holdings
      // 4. Return sorted time series

      if (mountedRef.current) {
        setHistory([]);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch history');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isConnected, address]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  // Fetch on mount if configured
  useEffect(() => {
    if (fetchOnMount && isConnected && address) {
      fetchHistory();
    }
  }, [fetchOnMount, fetchHistory, isConnected, address]);

  // Clear history when wallet disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      setHistory([]);
      setError(null);
    }
  }, [isConnected, address]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    history,
    isLoading,
    error,
    refresh,
  };
}

export default usePortfolioHistory;
