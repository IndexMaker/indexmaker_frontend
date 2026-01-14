'use client';

/**
 * useOrbitItpDetails Hook
 *
 * Fetches and caches ITP details from Orbit chain.
 * Provides metadata (name, symbol, supply) and price information.
 *
 * @see Story 3-4 Task 6
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchOrbitItpDetails,
  fetchMultipleOrbitItpDetails,
  type OrbitItpDetails,
} from '@/lib/contracts/orbit-vault';

/**
 * Return type for useOrbitItpDetails hook
 */
export interface UseOrbitItpDetailsReturn {
  /** Map of ITP address to details */
  details: Map<string, OrbitItpDetails>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Fetch details for specific ITP addresses */
  fetchDetails: (addresses: `0x${string}`[]) => Promise<void>;
  /** Get details for a specific address */
  getDetails: (address: `0x${string}`) => OrbitItpDetails | null;
  /** Refresh all cached details */
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching and caching Orbit ITP details.
 *
 * @param initialAddresses - Optional array of ITP addresses to fetch on mount
 *
 * @example
 * ```tsx
 * const { details, isLoading, fetchDetails, getDetails } = useOrbitItpDetails();
 *
 * // Fetch details for specific ITPs
 * await fetchDetails(['0xITP1...', '0xITP2...']);
 *
 * // Get cached details
 * const itpInfo = getDetails('0xITP1...');
 * if (itpInfo) {
 *   console.log(`${itpInfo.symbol}: ${itpInfo.priceUsdc} USDC`);
 * }
 * ```
 */
export function useOrbitItpDetails(
  initialAddresses?: `0x${string}`[]
): UseOrbitItpDetailsReturn {
  const [details, setDetails] = useState<Map<string, OrbitItpDetails>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const fetchedAddressesRef = useRef<Set<string>>(new Set());

  /**
   * Fetch details for specific ITP addresses
   */
  const fetchDetails = useCallback(async (addresses: `0x${string}`[]) => {
    // Filter out already fetched addresses
    const newAddresses = addresses.filter(
      (addr) => !fetchedAddressesRef.current.has(addr.toLowerCase())
    );

    if (newAddresses.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await fetchMultipleOrbitItpDetails(newAddresses);

      if (mountedRef.current) {
        setDetails((prev) => {
          const updated = new Map(prev);
          results.forEach((detail) => {
            updated.set(detail.address.toLowerCase(), detail);
            fetchedAddressesRef.current.add(detail.address.toLowerCase());
          });
          return updated;
        });
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch ITP details');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  /**
   * Get cached details for a specific address
   */
  const getDetails = useCallback(
    (address: `0x${string}`): OrbitItpDetails | null => {
      return details.get(address.toLowerCase()) ?? null;
    },
    [details]
  );

  /**
   * Refresh all cached details
   */
  const refresh = useCallback(async () => {
    const addresses = Array.from(fetchedAddressesRef.current) as `0x${string}`[];
    if (addresses.length === 0) return;

    // Clear cache to force refetch
    fetchedAddressesRef.current.clear();
    await fetchDetails(addresses);
  }, [fetchDetails]);

  // Fetch initial addresses on mount
  useEffect(() => {
    if (initialAddresses && initialAddresses.length > 0) {
      fetchDetails(initialAddresses);
    }
  }, [initialAddresses, fetchDetails]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    details,
    isLoading,
    error,
    fetchDetails,
    getDetails,
    refresh,
  };
}

export default useOrbitItpDetails;
