"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/wallet-context"; // your WalletProvider above
import WalletHoldingsTable, { ITPBalance } from "./wallet-assets";
import { fetchDepositTransactionData } from "@/server/indices";
import { SupplyPosition } from "@/lib/data";

/**
 * Minimal ERC20 ABI for balance/decimals/symbol/name
 */
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];

export type PriceMap = Record<string, number>; // address(lowercased) -> usd price

export interface ConnectedWalletBalancesProps {
  /** ERC-20 token contract addresses to query. Use "native" for the chain's gas token. */
  tokenAddresses: string[];
  /** Optional pre-known logos per token address (lowercased). */
  logos?: Record<string, string>;
  /** Optional USD price map per token address (lowercased). */
  prices?: PriceMap;
  /** Hide tokens with zero balance. */
  hideZeroBalances?: boolean;
  /** Polling interval in ms (default 30s). */
  pollInterval?: number;
  /** Explorer base URL (default BaseScan). */
  explorerBaseUrl?: string;
  className?: string;
}

export default function ConnectedWalletBalances({
  tokenAddresses,
  logos = {},
  prices = {},
  hideZeroBalances = true,
  pollInterval = 30_000,
  explorerBaseUrl = "https://basescan.org",
  className,
}: ConnectedWalletBalancesProps) {
  const { wallet, address, isConnected } = useWallet();
  const [supplyPositions, setSupplyPositions] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [balances, setBalances] = useState<
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

  useEffect(() => {
    if (wallet?.accounts) {
      let intervalId: NodeJS.Timeout;
      setSupplyPositions([])
      const _fetchDepositTransaction = async (_indexId: number) => {
        try {
          const response = await fetchDepositTransactionData(
            -1,
            wallet.accounts[0]?.address
          );
          const data = response;
          setSupplyPositions(data);
        } catch (error) {
          console.error("Error deposit transaction data:", error);
        } finally {
        }
      };

      // Fetch immediately
      _fetchDepositTransaction(-1);

      // Set up interval to fetch every 10 seconds
      intervalId = setInterval(() => {
        _fetchDepositTransaction(-1);
      }, 10000);

      // Cleanup function to clear interval when component unmounts or dependencies change
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [wallet]);

  const fetchBalances = useCallback(async () => {
    if (!provider || !address) return;

    setLoading(true);
    try {
      const results: Array<{
        address: string;
        symbol: string;
        name?: string;
        logoUrl?: string;
        balanceRaw: string;
        decimals: number;
        usdPrice?: number;
      }> = [];

      // 1) Native balance (if requested via pseudo-address "native")
      const nativeIndex = normalized.indexOf("native");
      if (nativeIndex !== -1) {
        const [bal, net] = await Promise.all([
          provider.getBalance(address),
          provider.getNetwork(),
        ]);
        const symbol = nativeSymbolFromChainId(Number(net.chainId));
        results.push({
          address: "native",
          symbol,
          name: symbol,
          logoUrl: logos["native"],
          balanceRaw: bal.toString(),
          decimals: 18,
          usdPrice: prices["native"],
        });
      }

      // 2) ERC-20 balances
      const erc20s = normalized.filter((a) => a !== "native");
      await Promise.all(
        erc20s.map(async (addrLower) => {
          const contract = new ethers.Contract(addrLower, ERC20_ABI, provider);
          // Fetch metadata first to know decimals
          const [decimals, symbol, name] = await Promise.all([
            contract.decimals().catch(() => 18),
            contract.symbol().catch(() => "UNK"),
            contract.name().catch(() => undefined),
          ]);
          const bal = await contract.balanceOf(address);
          results.push({
            address: ethers.getAddress(addrLower),
            symbol,
            name,
            logoUrl: logos[addrLower],
            balanceRaw: bal.toString(),
            decimals: Number(decimals),
            usdPrice: prices[addrLower],
          });
        })
      );

      setBalances(results);
    } catch (e: any) {
      console.error("Failed to fetch balances", e);
      setError(e?.message ?? "Failed to fetch balances");
    } finally {
      setLoading(false);
    }
  }, [provider, address, normalized, logos, prices]);

  // initial + polling
  useEffect(() => {
    fetchBalances();
    if (!isConnected || !provider || !address) return;
    const id = setInterval(fetchBalances, pollInterval);
    return () => clearInterval(id);
  }, []);

  return (
    <WalletHoldingsTable
      tokens={balances}
      itps={supplyPositions}
      hideZeroBalances={true}
      explorerBaseUrl="https://basescan.org"
    />
  );
}

function nativeSymbolFromChainId(chainId: number): string {
  // Basic mapping; extend as needed
  switch (chainId) {
    case 1:
      return "ETH";
    case 8453:
      return "ETH"; // Base uses ETH as gas
    case 42161:
      return "ETH";
    case 137:
      return "MATIC";
    case 10:
      return "ETH"; // OP Mainnet
    default:
      return "ETH";
  }
}
