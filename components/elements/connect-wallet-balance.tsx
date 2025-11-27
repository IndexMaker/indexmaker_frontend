"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/wallet-context";
import WalletHoldingsTable, { ITPBalance } from "./wallet-assets";
import { fetchDepositTransactionData } from "@/server/indices";
import { SupplyPosition } from "@/lib/data";
// 1. Import Redux hooks
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

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
  prices: propPrices = {}, // Renamed to avoid confusion with Redux prices
  hideZeroBalances = true,
  pollInterval = 30_000,
  explorerBaseUrl = "https://basescan.org",
  className,
}: ConnectedWalletBalancesProps) {
  const { wallet, address, isConnected } = useWallet();
  const [supplyPositions, setSupplyPositions] = useState<any[]>([]);

  // 2. Select Prices from Redux
  const { prices: reduxPrices } = useSelector(
    (state: RootState) => state.marketData
  );

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

  // Helper to normalize tickers for lookup (remove special chars, uppercase)
  const normalizeTicker = (s: string) =>
    s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  // Helper to find price: Redux Ticker -> Redux Address -> Prop Address
  const getPrice = useCallback(
    (symbol: string, address: string) => {
      // 1. Check Redux by Symbol/Ticker (most common for this app)
      const tickerPrice = reduxPrices[symbol] ?? reduxPrices[normalizeTicker(symbol)];
      if (tickerPrice !== undefined) return Number(tickerPrice);

      // 2. Check Redux by Address (if stored by address)
      const addrPrice = reduxPrices[address] ?? reduxPrices[address.toLowerCase()];
      if (addrPrice !== undefined) return Number(addrPrice);

      // 3. Fallback to Props
      return propPrices[address.toLowerCase()] ?? propPrices[symbol];
    },
    [reduxPrices, propPrices]
  );

  useEffect(() => {
    if (wallet?.accounts) {
      let intervalId: NodeJS.Timeout;
      setSupplyPositions([]);
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
        
        // Resolve Price for Native
        const price = getPrice(symbol, "native");

        results.push({
          address: "native",
          symbol,
          name: symbol,
          logoUrl: logos["native"],
          balanceRaw: bal.toString(),
          decimals: 18,
          usdPrice: price,
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
          
          // Resolve Price using Symbol or Address
          const price = getPrice(symbol, addrLower);

          results.push({
            address: ethers.getAddress(addrLower),
            symbol,
            name,
            logoUrl: logos[addrLower],
            balanceRaw: bal.toString(),
            decimals: Number(decimals),
            usdPrice: price,
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
  }, [provider, address, normalized, logos, getPrice]); 

  // Initial + Polling
  // Re-run if Redux prices change (via getPrice dependency)
  useEffect(() => {
    fetchBalances();
    if (!isConnected || !provider || !address) return;
    const id = setInterval(fetchBalances, pollInterval);
    return () => clearInterval(id);
  }, [fetchBalances, pollInterval, isConnected, provider, address]);

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