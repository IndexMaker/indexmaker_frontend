'use client';

/**
 * useBridgedItpRegistry Hook
 *
 * Fetches and caches the mapping of bridged ITPs (Arbitrum) to native ITPs (Orbit).
 * Used to know which tokens to query for dual-chain balance display.
 *
 * @see Story 3-4 Task 5
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchBridgedItpRegistryFromEvents,
  type BridgedItpInfo,
} from '@/lib/contracts/bridged-itp-factory';

/**
 * Return type for useBridgedItpRegistry hook
 */
export interface UseBridgedItpRegistryReturn {
  /** Array of bridged ITP info */
  registry: BridgedItpInfo[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Refresh the registry */
  refresh: () => Promise<void>;
  /** Get Arbitrum address for an Orbit ITP */
  getArbitrumAddress: (orbitAddress: `0x${string}`) => `0x${string}` | null;
  /** Get Orbit address for an Arbitrum ITP */
  getOrbitAddress: (arbitrumAddress: `0x${string}`) => `0x${string}` | null;
  /** Get full info by symbol */
  getBySymbol: (symbol: string) => BridgedItpInfo | null;
}

/**
 * Hook for fetching and caching the bridged ITP registry.
 *
 * @example
 * ```tsx
 * const { registry, isLoading, getArbitrumAddress, getOrbitAddress } = useBridgedItpRegistry();
 *
 * // Get all registered ITPs
 * registry.forEach((itp) => {
 *   console.log(`${itp.symbol}: Arb=${itp.arbitrumAddress}, Orbit=${itp.orbitAddress}`);
 * });
 *
 * // Lookup address mappings
 * const arbAddr = getArbitrumAddress('0xOrbitAddress...');
 * const orbitAddr = getOrbitAddress('0xArbitrumAddress...');
 * ```
 */
export function useBridgedItpRegistry(): UseBridgedItpRegistryReturn {
  const [registry, setRegistry] = useState<BridgedItpInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);

  /**
   * Fetch the registry from contract events
   */
  const fetchRegistry = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch from events to get complete orbit<->arbitrum mapping
      const data = await fetchBridgedItpRegistryFromEvents();

      if (mountedRef.current) {
        setRegistry(data);
        fetchedRef.current = true;
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch ITP registry');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading]);

  /**
   * Get Arbitrum address for an Orbit ITP
   */
  const getArbitrumAddress = useCallback(
    (orbitAddress: `0x${string}`): `0x${string}` | null => {
      const lowerOrbit = orbitAddress.toLowerCase();
      const entry = registry.find(
        (itp) => itp.orbitAddress.toLowerCase() === lowerOrbit
      );
      return entry?.arbitrumAddress ?? null;
    },
    [registry]
  );

  /**
   * Get Orbit address for an Arbitrum ITP
   */
  const getOrbitAddress = useCallback(
    (arbitrumAddress: `0x${string}`): `0x${string}` | null => {
      const lowerArb = arbitrumAddress.toLowerCase();
      const entry = registry.find(
        (itp) => itp.arbitrumAddress.toLowerCase() === lowerArb
      );
      return entry?.orbitAddress ?? null;
    },
    [registry]
  );

  /**
   * Get full ITP info by symbol
   */
  const getBySymbol = useCallback(
    (symbol: string): BridgedItpInfo | null => {
      const normalizedSymbol = symbol.toUpperCase();
      return (
        registry.find(
          (itp) =>
            itp.symbol.toUpperCase() === normalizedSymbol ||
            itp.symbol.toUpperCase().includes(normalizedSymbol)
        ) ?? null
      );
    },
    [registry]
  );

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchRegistry();
  }, [fetchRegistry]);

  // Fetch on mount
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchRegistry();
    }
  }, [fetchRegistry]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    registry,
    isLoading,
    error,
    refresh,
    getArbitrumAddress,
    getOrbitAddress,
    getBySymbol,
  };
}

export default useBridgedItpRegistry;
