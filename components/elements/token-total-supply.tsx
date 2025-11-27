"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/wallet-context";
import WalletHoldingsTable from "./wallet-assets";

/**
 * Minimal ERC20 ABI for totalSupply/decimals/symbol/name
 */
const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

export type PriceMap = Record<string, number>; // address(lowercased) -> usd price

export interface TokenTotalSupplyProps {
  /** ERC-20 token contract addresses to query. */
  tokenAddresses: string[];
  /** Optional pre-known logos per token address (lowercased). */
  logos?: Record<string, string>;
  /** Optional USD price map per token address (lowercased). */
  prices?: PriceMap;
  /** Polling interval in ms (default 60s). */
  pollInterval?: number;
  /** Explorer base URL (default BaseScan). */
  explorerBaseUrl?: string;
  className?: string;
}

export default function TokenTotalSupply({
  tokenAddresses,
  logos = {},
  prices = {},
  pollInterval = 60_000,
  explorerBaseUrl = "https://basescan.org",
  className,
}: TokenTotalSupplyProps) {
  const { wallet, isConnected } = useWallet();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  
  // We reuse the structure expected by WalletHoldingsTable (balanceRaw will hold totalSupply)
  const [supplies, setSupplies] = useState<
    Array<{
      address: string;
      symbol: string;
      name?: string;
      logoUrl?: string;
      balanceRaw: string; 
      decimals: number;
      usdPrice?: number;
    }>
  >([]);

  const provider = wallet?.provider;

  const normalized = useMemo(
    () => tokenAddresses.map((a) => a.toLowerCase()),
    [tokenAddresses]
  );

  const fetchSupplies = useCallback(async () => {
    // We only need a provider, not necessarily a connected address, 
    // but usually useWallet provides the provider only when connected or initialized.
    if (!provider) return;

    setLoading(true);
    try {
      const results: typeof supplies = [];

      // Filter out "native" if present, as standard RPC doesn't have a simple total supply call for ETH
      const erc20s = normalized.filter((a) => a !== "native");

      await Promise.all(
        erc20s.map(async (addrLower) => {
          try {
            const contract = new ethers.Contract(addrLower, ERC20_ABI, provider);
            
            // Fetch metadata and total supply
            const [decimals, symbol, name, totalSupply] = await Promise.all([
              contract.decimals().catch(() => 18),
              contract.symbol().catch(() => "UNK"),
              contract.name().catch(() => undefined),
              contract.totalSupply().catch(() => 0n), // Default to 0 if call fails
            ]);

            results.push({
              address: ethers.getAddress(addrLower),
              symbol,
              name,
              logoUrl: logos[addrLower],
              balanceRaw: totalSupply.toString(), // Storing Total Supply here
              decimals: Number(decimals),
              usdPrice: prices[addrLower],
            });
          } catch (innerErr) {
            console.warn(`Failed to fetch supply for ${addrLower}`, innerErr);
          }
        })
      );

      setSupplies(results);
    } catch (e: any) {
      console.error("Failed to fetch token supplies", e);
      setError(e?.message ?? "Failed to fetch token supplies");
    } finally {
      setLoading(false);
    }
  }, [provider, normalized, logos, prices]);

  // Initial fetch + Polling
  useEffect(() => {
    fetchSupplies();
    if (!provider) return;
    
    const id = setInterval(fetchSupplies, pollInterval);
    return () => clearInterval(id);
  }, [fetchSupplies, pollInterval, provider]);

  return (
    <div className={className}>
      {/* Reusing WalletHoldingsTable. 
        Note: The table columns might still say "Balance", 
        but the values shown will be the Total Supply.
      */}
      <WalletHoldingsTable
        tokens={supplies}
        itps={[]} // Empty array as supply positions are user-specific, not relevant for global supply
        hideZeroBalances={false} // Usually we want to see the token even if supply is 0 (rare)
        explorerBaseUrl={explorerBaseUrl}
      />
    </div>
  );
}