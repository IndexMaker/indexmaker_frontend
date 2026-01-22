'use client';

/**
 * usePriceHistory Hook
 *
 * Fetches historical price data for a specific ITP from the backend API.
 * Supports multiple time periods with automatic granularity adjustment.
 *
 * @see Story 6.13 - ITP Price Chart Component
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/** Supported time periods for price history */
export type PriceHistoryPeriod = '1d' | '7d' | '30d' | 'all';

/** Single price point from the API */
export interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number;
}

/** Transformed price point for chart consumption */
export interface ChartPricePoint {
  timestamp: Date;
  price: number;
}

/** API response structure */
interface PriceHistoryApiResponse {
  data: PricePoint[];
  itp_id: string;
  period: string;
}

/** Return type for the hook */
export interface UsePriceHistoryReturn {
  data: ChartPricePoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Hook configuration options */
export interface UsePriceHistoryConfig {
  /** ITP ID (orbit_address) to fetch history for */
  itpId: string;
  /** Time period to fetch (default: '7d') */
  period?: PriceHistoryPeriod;
  /** Whether to fetch immediately on mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Hook for fetching ITP price history data.
 *
 * @example
 * ```tsx
 * function PriceChart({ itpId }) {
 *   const { data, isLoading, error, refetch } = usePriceHistory({
 *     itpId,
 *     period: '7d',
 *   });
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorState onRetry={refetch} />;
 *   if (data.length === 0) return <EmptyState />;
 *
 *   return <AreaChart data={data} />;
 * }
 * ```
 */
export function usePriceHistory(config: UsePriceHistoryConfig): UsePriceHistoryReturn {
  const { itpId, period = '7d', fetchOnMount = true } = config;

  const [data, setData] = useState<ChartPricePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track component mount state - initialized as true, only set false on unmount
  const mountedRef = useRef(true);
  // Track current fetch to allow cancellation on cleanup or period change
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Transform API response to chart-compatible format
   */
  const transformData = useCallback((apiData: PricePoint[]): ChartPricePoint[] => {
    return apiData.map((point) => ({
      timestamp: new Date(point.timestamp),
      price: point.price,
    }));
  }, []);

  /**
   * Fetch price history from the backend API
   */
  const fetchHistory = useCallback(async () => {
    if (!itpId) {
      setData([]);
      setError(null);
      return;
    }

    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API || '';
      const url = `${apiBase}/api/itp/${encodeURIComponent(itpId)}/history?period=${period}`;

      const response = await fetch(url, { signal: abortController.signal });

      if (!response.ok) {
        if (response.status === 404) {
          // ITP not found - return empty data
          if (mountedRef.current) {
            setData([]);
            setError(null);
          }
          return;
        }
        throw new Error(`Failed to fetch price history: ${response.status}`);
      }

      const responseData: PriceHistoryApiResponse = await response.json();

      if (mountedRef.current) {
        const transformedData = transformData(responseData.data);
        setData(transformedData);
        setError(null);
      }
    } catch (err) {
      // Ignore abort errors - they're expected when cancelling requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch price history');
        setData([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [itpId, period, transformData]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (fetchOnMount && itpId) {
      fetchHistory();
    }
  }, [fetchOnMount, fetchHistory, itpId]);

  // Reset state when itpId changes
  useEffect(() => {
    if (!itpId) {
      setData([]);
      setError(null);
    }
  }, [itpId]);

  // Cleanup on unmount - abort any in-flight requests and mark as unmounted
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

export default usePriceHistory;
