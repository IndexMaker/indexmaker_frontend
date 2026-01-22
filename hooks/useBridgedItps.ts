'use client';

/**
 * useBridgedItps - Hook to fetch and lookup bridged ITPs from the factory
 *
 * Provides:
 * - List of all bridged ITPs on Arbitrum
 * - Lookup by name or symbol
 * - Loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';
import { BRIDGED_ITP_FACTORY_ADDRESS } from '@/lib/contracts/addresses';
import { bridgedItpFactoryAbi } from '@/lib/contracts/abis/bridged-itp-factory';
import { erc20Abi } from '@/lib/contracts/abis/erc20';

/**
 * Bridged ITP info with metadata
 */
export interface BridgedItpInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  totalSupply: bigint;
}

/**
 * Hook to fetch and manage bridged ITPs
 */
export function useBridgedItps() {
  const [itps, setItps] = useState<BridgedItpInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Arbitrum client
  const client = createPublicClient({
    chain: arbitrum,
    transport: http(),
  });

  /**
   * Fetch all bridged ITPs from the factory
   */
  const fetchItps = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all bridged ITP addresses
      const addresses = await client.readContract({
        address: BRIDGED_ITP_FACTORY_ADDRESS,
        abi: bridgedItpFactoryAbi,
        functionName: 'getAllBridgedItps',
      }) as `0x${string}`[];

      if (!addresses || addresses.length === 0) {
        setItps([]);
        setIsLoading(false);
        return;
      }

      // Fetch metadata for each ITP in parallel
      const itpInfos = await Promise.all(
        addresses.map(async (address): Promise<BridgedItpInfo | null> => {
          try {
            const nameResult = await client.readContract({
              address,
              abi: erc20Abi,
              functionName: 'name',
            });
            const symbolResult = await client.readContract({
              address,
              abi: erc20Abi,
              functionName: 'symbol',
            });
            const totalSupplyResult = await client.readContract({
              address,
              abi: erc20Abi,
              functionName: 'totalSupply',
            });

            return {
              address,
              name: nameResult as string,
              symbol: symbolResult as string,
              totalSupply: totalSupplyResult as bigint,
            };
          } catch (err) {
            console.warn(`Failed to fetch metadata for ITP ${address}:`, err);
            return null;
          }
        })
      );

      // Filter out failed fetches
      const validItps = itpInfos.filter((itp): itp is BridgedItpInfo => itp !== null);
      setItps(validItps);
    } catch (err) {
      console.error('Failed to fetch bridged ITPs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ITPs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchItps();
  }, [fetchItps]);

  /**
   * Find ITP by symbol (case-insensitive)
   */
  const findBySymbol = useCallback(
    (symbol: string): BridgedItpInfo | undefined => {
      const normalizedSymbol = symbol.toLowerCase();
      return itps.find(
        (itp) =>
          itp.symbol.toLowerCase() === normalizedSymbol ||
          // Also check without 'b' prefix (bridged tokens have 'b' prefix)
          itp.symbol.toLowerCase() === `b${normalizedSymbol}` ||
          itp.symbol.toLowerCase().replace(/^b/, '') === normalizedSymbol
      );
    },
    [itps]
  );

  /**
   * Find ITP by name (partial match, case-insensitive)
   */
  const findByName = useCallback(
    (name: string): BridgedItpInfo | undefined => {
      const normalizedName = name.toLowerCase();
      return itps.find(
        (itp) =>
          itp.name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(itp.name.toLowerCase())
      );
    },
    [itps]
  );

  /**
   * Get ITP address by symbol or name
   */
  const getItpAddress = useCallback(
    (symbolOrName: string): `0x${string}` | undefined => {
      const bySymbol = findBySymbol(symbolOrName);
      if (bySymbol) return bySymbol.address;

      const byName = findByName(symbolOrName);
      if (byName) return byName.address;

      return undefined;
    },
    [findBySymbol, findByName]
  );

  return {
    itps,
    isLoading,
    error,
    refresh: fetchItps,
    findBySymbol,
    findByName,
    getItpAddress,
  };
}
