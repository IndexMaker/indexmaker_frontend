"use client";

import {
  fetchAllIndices,
  fetchDepositTransactionData,
  getIndexMakerInfo,
} from "@/server/indices";
import { ColumnVisibilityPopover } from "@/components/elements/column-visibility-popover";
import { VaultSupply } from "@/components/elements/vault-supplyposition";
import { VaultTable } from "@/components/elements/vault-table";
import Deposit from "@/components/icons/deposit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomButton } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/language-context";
import { SupplyPosition } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  setIndices,
  setTotalManaged,
  setTotalVolume,
} from "@/redux/indexSlice";
import { setTokenPrice, setTokenSupply } from "@/redux/market-data-slice";
import { RootState } from "@/redux/store";
import { clearSelectedVault } from "@/redux/vaultSlice";
import { IndexListEntry } from "@/types/index";
import type { ItpListEntry, ItpListResponse } from "@/types/itp";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "../../../contexts/wallet-context";
import { HowEarnWorks } from "./how-earn-works";
import ConnectedWalletBalances from "@/components/elements/connect-wallet-balance";
import IBKRAlertBanner from "@/components/elements/AnnouncementBanner";
import { PendingOrders } from "@/components/elements/PendingOrders";
import { useQuoteContext } from "@/contexts/quote-context";
import Image from "next/image";
import USDC from "../../../public/logos/usd-coin.png";
import { Asset } from "@/types";
import { fetchAssets } from "@/server/indices";

// Build symbol-to-coinId mapping from centralized vendor/assets.json
import vendorAssets from "../../../../vendor/assets.json";

const VENDOR_SYMBOL_TO_COIN_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const asset of vendorAssets) {
    if (!asset.coingecko) continue;
    // Extract symbol from bitget pair (e.g., "BTCUSDC" → "BTC")
    const symbol = asset.bitget.replace(/USD[CT]$/, "");
    if (symbol) map[symbol] = asset.coingecko;
  }
  return map;
})();

type ColumnType = {
  id: string;
  title: string;
  visible: boolean;
};

const initialColumns: ColumnType[] = [
  { id: "name", title: "Index Name", visible: true },
  { id: "ticker", title: "Ticker", visible: true },
  { id: "totalSupply", title: "Total Supply", visible: true },
  { id: "ytdReturn", title: "YTD return", visible: false },
  { id: "performance", title: "Average Annual Returns", visible: false },
  { id: "curator", title: "Curator", visible: true },
  { id: "collateral", title: "Collateral", visible: true },
  { id: "assetClass", title: "Asset Class", visible: true },
  { id: "category", title: "Category", visible: true },
  { id: "inceptionDate", title: "Inception Date", visible: true },
  { id: "managementFee", title: "Management Fee", visible: false },
  { id: "actions", title: "", visible: true },
];

interface EarnContentProps {
  onSupplyClick?: (vaultId: string, token: string, address: string) => void;
  onShowVideoPopup: () => void;
}

export function EarnContent({
  onSupplyClick,
  onShowVideoPopup,
}: EarnContentProps) {
  const { wallet, isConnected } = useWallet();
  const { t } = useLanguage();
  const [columns, setColumns] = useState(initialColumns);
  const [searchInput, setSearchInput] = useState(""); // Immediate input value
  const [searchQuery, setSearchQuery] = useState(""); // Debounced search query
  const [sortColumn, setSortColumn] = useState<string>("");

  // Debounced search update (300ms delay as per Task 4.1)
  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value);
  }, 300);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMyIndex, setFilterMyIndex] = useState(false);
  const [itps, setItps] = useState<ItpListEntry[]>([]);
  const [itpLoading, setItpLoading] = useState(false);
  const [itpTotalAum, setItpTotalAum] = useState<number | null>(null);
  const [symbolToCoinId, setSymbolToCoinId] = useState<Record<string, string>>(VENDOR_SYMBOL_TO_COIN_ID);

  const [activeMyearnTab, setActiveMyearnTab] = useState<
    "position" | "historic"
  >("position");
  
  const { selectedNetwork, currentChainId } = useSelector(
    (state: RootState) => state.network
  );

  const dispatch = useDispatch();
  const { indexPrices } = useQuoteContext();

  // --- REDUX SELECTORS ---
  const storedIndexes = useSelector((state: RootState) => state.index.indices);
  const totalManaged = useSelector((state: RootState) => state.index.totalManaged);
  
  // Get Live Prices and Supplies from the Market Data Slice
  const { prices: reduxPrices, supplies: reduxSupplies } = useSelector(
    (state: RootState) => state.marketData
  );

  const formatUSDC = (n?: number) =>
    n == null || Number.isNaN(n)
      ? "0.00"
      : new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(
          n
        );

  const [depositTransactionLoading, setDepositTransactionLoading] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [indexLists, setIndexLists] = useState<IndexListEntry[]>([]);

  // ---- helper to get a live price for a ticker (Redux Aware) ----
  const normalize = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAllIndices();
        setIndexLists(data || []);
        dispatch(setIndices(data || []));
        localStorage.setItem("storedVaults", JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching indices:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Always fetch on mount to ensure we have fresh data
    fetchData();

    dispatch(clearSelectedVault());
  }, []);

  // ------------------------------------------------------------------
  //  Fetch coin symbol mapping for asset logos
  // ------------------------------------------------------------------
  useEffect(() => {
    const fetchCoinMapping = async () => {
      try {
        const response = await fetch("/api/coins/symbol-mapping");
        if (!response.ok) {
          console.warn("Failed to fetch coin mapping, logos may not display");
          return;
        }
        const data = await response.json();
        // Convert array of {symbol, coin_id} to Record<string, string>
        const mapping: Record<string, string> = { ...VENDOR_SYMBOL_TO_COIN_ID };
        for (const item of data.mappings || []) {
          mapping[item.symbol.toUpperCase()] = item.coin_id;
        }
        setSymbolToCoinId(mapping);
      } catch (error) {
        console.warn("Failed to fetch coin mapping", { error });
      }
    };

    fetchCoinMapping();
  }, []);

  // ------------------------------------------------------------------
  //  Fetch ITPs on mount and poll every 5 seconds for price updates
  // ------------------------------------------------------------------
  useEffect(() => {
    const fetchItpList = async (isInitial = false) => {
      if (isInitial) setItpLoading(true);
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API || "http://localhost:3002";
        console.log(`[ITP Poll] Fetching prices at ${new Date().toLocaleTimeString()}`);
        const response = await fetch(`${BACKEND_URL}/api/itp/list?limit=100`);
        if (!response.ok) {
          // API might not have this endpoint yet - silently fail
          console.warn("ITP endpoint not available:", response.status);
          setItps([]);
          return;
        }
        const data: ItpListResponse = await response.json();
        setItps(data.itps || []);

        // Store total AUM from backend if available
        if (data.total_aum != null) {
          setItpTotalAum(data.total_aum);
        }

        // Update Redux with ITP prices and supplies (keyed by orbit_address for uniqueness)
        for (const itp of data.itps || []) {
          if (itp.current_price != null) {
            dispatch(setTokenPrice({ ticker: itp.orbit_address, price: itp.current_price }));
          }
          // Parse total_supply (it's a string in 18 decimals)
          const supply = parseFloat(itp.total_supply) / 1e18;
          if (!Number.isNaN(supply)) {
            dispatch(setTokenSupply({ ticker: itp.orbit_address, supply }));
          }
        }

        // Also store valid ITPs in Redux indices for SupplyPanel compatibility
        // This is done after the first fetch to ensure ITPs are available in the store
        if (isInitial && data.itps && data.itps.length > 0) {
          // We'll update this in a separate effect that depends on itps state
        }
      } catch (error) {
        console.warn("Error fetching ITPs:", error);
        setItps([]);
      } finally {
        if (isInitial) setItpLoading(false);
      }
    };

    fetchItpList(true); // Initial fetch with loading state

    // Poll every 5 seconds for price updates
    const intervalId = setInterval(() => fetchItpList(false), 5000);

    return () => clearInterval(intervalId);
  }, [dispatch]);

  // ------------------------------------------------------------------
  //  Update Redux indices with valid ITPs for SupplyPanel compatibility
  // ------------------------------------------------------------------
  useEffect(() => {
    // Filter and convert ITPs to IndexListEntry format
    const validItpEntries = itps
      .filter(itp => {
        // Validate weights sum to ~1.0
        if (!itp.weights || itp.weights.length === 0) return false;
        const sum = itp.weights.reduce((acc, w) => acc + w, 0);
        if (Math.abs(sum - 1.0) >= 0.01) return false;
        // Validate has price data
        if (!itp.current_price || itp.current_price <= 0) return false;
        if (!itp.assets || itp.assets.length === 0) return false;
        return true;
      })
      .map((itp): IndexListEntry => {
        // Build collateral from ITP assets with logos and weights
        const weights = itp.weights || [];
        const collateral = (itp.assets || []).map((symbol, idx) => ({
          name: symbol,
          logo: `/logos/${symbol.toLowerCase()}.png`,
          // Convert weight from decimal (0-1) to basis points (0-10000)
          weight: weights[idx] !== undefined ? Math.round(weights[idx] * 10000) : undefined,
        }));

        return {
          indexId: itp.id,
          name: itp.name,
          address: itp.orbit_address,
          ticker: itp.symbol,
          curator: itp.admin_address || itp.orbit_address || "",
          arbitrumAddress: itp.arbitrum_address,
          totalSupply: parseFloat(itp.total_supply) / 1e18,
          totalSupplyUSD: (parseFloat(itp.total_supply) / 1e18) * (itp.current_price ?? 0),
          ytdReturn: itp.price_24h_change ?? 0,
          collateral: collateral.length > 0 ? collateral : [{ name: "USDC", logo: "/logos/usd-coin.png" }],
          managementFee: 0,
          assetClass: "Crypto",
          category: itp.methodology || "ITP",
          inceptionDate: new Date(itp.created_at * 1000).toISOString().split("T")[0],
          indexPrice: itp.current_price ?? undefined,
          performance: {
            ytdReturn: itp.price_24h_change ?? 0,
            oneYearReturn: itp.price_24h_change ?? 0,
            threeYearReturn: 0,
            fiveYearReturn: 0,
            tenYearReturn: 0,
          },
        };
      });

    // Only update if we have ITPs to add
    if (validItpEntries.length > 0) {
      // Merge with existing traditional indices (avoiding duplicates by address)
      const existingIndices = indexLists.filter(
        idx => !validItpEntries.some(itp => itp.address === idx.address)
      );
      const mergedIndices = [...existingIndices, ...validItpEntries];
      dispatch(setIndices(mergedIndices));
    }
  }, [itps, indexLists, dispatch]);

  // ------------------------------------------------------------------
  //  Validate ITP weights sum to ~1.0 (within 0.01 tolerance)
  // ------------------------------------------------------------------
  const isValidItpWeights = (itp: ItpListEntry): boolean => {
    if (!itp.weights || itp.weights.length === 0) return false;
    const sum = itp.weights.reduce((acc, w) => acc + w, 0);
    return Math.abs(sum - 1.0) < 0.01;
  };

  // ------------------------------------------------------------------
  //  Check if ITP has valid price data (has assets and current_price)
  //  ITPs are valid if they have tradeable assets for price calculation
  // ------------------------------------------------------------------
  const hasValidPrice = (itp: ItpListEntry): boolean => {
    // Must have current_price and assets
    if (!itp.current_price || itp.current_price <= 0) return false;
    if (!itp.assets || itp.assets.length === 0) return false;
    return true;
  };

  // ------------------------------------------------------------------
  //  Convert ITP to IndexListEntry format for VaultTable compatibility
  // ------------------------------------------------------------------
  // Helper function to get logo URL for an asset symbol
  const getAssetLogo = (symbol: string): string | null => {
    const upperSymbol = symbol.toUpperCase();
    const coinId = symbolToCoinId[upperSymbol];
    if (coinId) return `/logos/${coinId}.png`;
    // Fallback: try lowercase symbol as coin_id
    return `/logos/${symbol.toLowerCase()}.png`;
  };

  const itpToIndexEntry = (itp: ItpListEntry): IndexListEntry => {
    // Build collateral from ITP assets with logos and weights
    const weights = itp.weights || [];
    const collateral = (itp.assets || []).map((symbol, idx) => ({
      name: symbol,
      logo: getAssetLogo(symbol) || "",
      // Convert weight from decimal (0-1) to basis points (0-10000)
      weight: weights[idx] !== undefined ? Math.round(weights[idx] * 10000) : undefined,
    }));

    return {
      indexId: itp.id,
      name: itp.name,
      address: itp.orbit_address,
      ticker: itp.symbol,
      curator: itp.admin_address || itp.orbit_address || "",
      arbitrumAddress: itp.arbitrum_address,
      totalSupply: parseFloat(itp.total_supply) / 1e18,
      totalSupplyUSD: (parseFloat(itp.total_supply) / 1e18) * (itp.current_price ?? 0),
      ytdReturn: itp.price_24h_change ?? 0,
      collateral: collateral.length > 0 ? collateral : [{ name: "USDC", logo: "/logos/usd-coin.png" }],
      managementFee: 0,
      assetClass: "Crypto",
      category: itp.methodology || "ITP",
      inceptionDate: new Date(itp.created_at * 1000).toISOString().split("T")[0],
      indexPrice: itp.current_price ?? undefined,
      performance: {
        ytdReturn: itp.price_24h_change ?? 0,
        oneYearReturn: itp.price_24h_change ?? 0,
        threeYearReturn: 0,
        fiveYearReturn: 0,
        tenYearReturn: 0,
      },
    };
  };

  // ------------------------------------------------------------------
  //  MODIFIED: Calculate Total Deposits (AUM) using Redux Market Data + ITPs
  // ------------------------------------------------------------------
  useEffect(() => {
    // Calculate AUM from traditional indexes
    const indices: IndexListEntry[] =
      storedIndexes && storedIndexes.length > 0 ? storedIndexes : indexLists;

    let liveTotalAUM = 0;

    // Sum up (Supply * Price) for traditional indexes
    if (indices && indices.length > 0) {
      liveTotalAUM = indices.reduce((acc, idx) => {
        const ticker = idx.ticker;
        const supply = reduxSupplies[ticker] ?? 0;
        let price = reduxPrices[ticker];

        if (price === undefined) {
          const norm = normalize(ticker);
          for (const [k, v] of Object.entries(reduxPrices)) {
            if (normalize(k) === norm) {
              price = v;
              break;
            }
          }
        }

        return acc + supply * (price ?? 0);
      }, 0);
    }

    // Add ITP AUM (calculated from Redux prices/supplies for ITPs, keyed by address)
    for (const itp of itps) {
      const key = itp.orbit_address;
      const supply = reduxSupplies[key] ?? 0;
      const price = reduxPrices[key] ?? 0;
      liveTotalAUM += supply * price;
    }

    // Update Redux with the new Total Managed value
    dispatch(setTotalManaged(String(liveTotalAUM)));
  }, [reduxPrices, reduxSupplies, storedIndexes, indexLists, itps, dispatch]);


  // Function to handle sorting
  const handleSort = (columnId: string, direction: "asc" | "desc") => {
    setSortColumn(columnId);
    setSortDirection(direction);
  };

  // Filter and sort vaults based on search query and sort settings
  const filteredAndSortedVaults = useMemo(() => {
    let filtered: IndexListEntry[];

    // Filter out ITPs with invalid weights (must sum to ~1.0) and no valid price
    const validItps = itps.filter(itp => isValidItpWeights(itp) && hasValidPrice(itp));

    // Convert valid ITPs to IndexListEntry format
    const itpEntries = validItps.map(itpToIndexEntry);

    if (filterMyIndex && wallet?.accounts?.[0]?.address) {
      // When "My Index" is enabled: Show ITPs deployed by connected wallet
      // Filter on raw ITP data first (admin_address is the deployer wallet)
      const walletAddress = wallet.accounts[0].address.toLowerCase();
      const myItpAddresses = new Set(
        validItps
          .filter(itp => itp.admin_address?.toLowerCase() === walletAddress)
          .map(itp => itp.orbit_address)
      );
      filtered = itpEntries.filter(vault => myItpAddresses.has(vault.address));
    } else {
      // Show only valid ITPs from API
      filtered = itpEntries;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      filtered = filtered.filter((vault) => {
        // Search in multiple fields
        return (
          vault.name.toLowerCase().includes(query) ||
          vault.ticker.toLowerCase().includes(query) ||
          vault.curator.toLowerCase().includes(query) ||
          vault.totalSupply.toString().toLowerCase().includes(query) ||
          vault.ytdReturn.toString().toLowerCase().includes(query) ||
          vault.managementFee.toString().toLowerCase().includes(query)
        );
      });
    }

    // Then sort the filtered results
    if (sortColumn !== "")
      return [...filtered].sort((a, b) => {
        let valueA: number | string;
        let valueB: number | string;

        // Extract the values to compare based on the sort column
        switch (sortColumn) {
          case "name":
            valueA = a.name;
            valueB = b.name;
            break;
          case "ticker":
            valueA = a.ticker;
            valueB = b.ticker;
            break;
          case "totalSupply":
            // Sort by USD value for totalSupply
            valueA = a.totalSupply;
            valueB = b.totalSupply;
            break;
          case "curator":
            valueA = a.curator;
            valueB = b.curator;
            break;
          case "managementFee":
            valueA = a.managementFee;
            valueB = b.managementFee;
            break;
          default:
            valueA = a.name;
            valueB = b.name;
        }

        // Compare the values based on sort direction
        if (valueA < valueB) {
          return sortDirection === "asc" ? -1 : 1;
        }
        if (valueA > valueB) {
          return sortDirection === "asc" ? 1 : -1;
        }
        return 0;
      });
    else return filtered;
  }, [searchQuery, sortColumn, sortDirection, storedIndexes, filterMyIndex, itps, wallet, isConnected, symbolToCoinId]);
  
  // Function to handle column visibility changes
  const handleColumnVisibilityChange = (columnId: string, visible: boolean) => {
    setColumns(
      columns.map((column) =>
        column.id === columnId ? { ...column, visible } : column
      )
    );
  };

  const [visibleColumns, setVisibleColumns] = useState<ColumnType[]>([]);
  useEffect(() => {
    setVisibleColumns(
      columns
        .filter((column) => column.visible)
        .map((column) => ({
          ...column,
        }))
    );
  }, [wallet, columns, currentChainId, selectedNetwork]);

  // Kept for inventory/assets logic, but decoupled from Total Deposits display
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const [assetsData] = await Promise.all([
          fetchAssets(),
        ]);

        // Inventory data is not currently fetched - use empty map
        const invMap: Record<string, number> = {};

        const filtered = assetsData
          .filter((a) => invMap[a.symbol] != null)
          .map((a) => ({
            ...a,
            expected_inventory: invMap[a.symbol],
          }));

        setAssets(filtered);
      } catch (error) {
        console.error("Failed to load assets:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAssets(); // Initial fetch

    const intervalId = setInterval(loadAssets, 5000); // Fetch every 5 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  return (
    <div className="space-y-6 relative flex h-auto">
      <div className="flex-1 space-y-6 overflow-auto">
        <div className="flex flex-row justify-between">
          <h1 className="text-[38px] text-primary flex items-center">
            {t("common.index")}
          </h1>
          <div className="hidden gap-3 md:flex">
            {/* Total Deposits Card */}
            <Card className="bg-foreground gap-5 border-none cursor-pointer p-5 flex flex-col h-[98px] min-w-[194px] rounded-[12px]">
              <CardHeader className="flex flex-row items-center justify-between p-0 w-full">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  <div className="flex items-center gap-2 w-full">
                    <Deposit className="h-[14px] w-[14px]" />
                    <div className="text-secondary text-[12px]">
                      {t("common.totalDeposits")}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-[20px]">
                <div className="flex items-center justify-between font-normal text-secondary text-[15px] pb-2">
                  {/* Show loading only during initial load, then show actual value (including 0) */}
                  {isLoading ? (
                    <div className="h-5 w-24 bg-muted/50 animate-pulse rounded" />
                  ) : (
                    <span>{formatUSDC(Number(totalManaged || 0))}</span>
                  )}
                  <Image
                    src={USDC}
                    alt={"Total Supply"}
                    width={16}
                    height={16}
                    className="object-cover w-[16px] h-[16px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4 mt-20">
          {wallet ? (
            <>
              <div className="flex gap-4 md:items-center justify-between flex-wrap">
                <div className="flex items-center gap-4  flex-wrap">
                  <h2 className="text-[16px] font-normal text-card">
                    {t("common.myEarn")}
                  </h2>
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-secondary px-[8px] py-[5px] h-[26px] text-[11px] rounded-[4px] cursor-pointer hover:text-primary",
                        activeMyearnTab === "position" ? "bg-accent" : "bg-none"
                      )}
                      onClick={() => setActiveMyearnTab("position")}
                    >
                      <span>{t("common.positions")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "text-secondary px-[8px] py-[5px] h-[26px] text-[11px] rounded-[4px] cursor-pointer  hover:text-primary",
                        activeMyearnTab === "historic"
                          ? "bg-accent "
                          : " bg-none"
                      )}
                      onClick={() => setActiveMyearnTab("historic")}
                    >
                      <span>{t("common.historics")}</span>
                    </Button>
                  </div>
                </div>
                <div className="gap-4 hidden sm:flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CustomButton
                        disabled={true}
                        className="bg-[#2470ff] disabled hover:bg-blue-700 text-[11px] rounded-[3px] cursor-pointer disabled:cursor-default disabled:opacity-30"
                      >
                        {t("common.closePosition")}
                      </CustomButton>
                    </TooltipTrigger>
                    <TooltipContent className="">
                      <span className="text-foreground text-[12px]">
                        Coming in Beta
                      </span>
                    </TooltipContent>
                  </Tooltip>

                  {activeMyearnTab === "position" ? (
                    <ColumnVisibilityPopover
                      columns={columns}
                      onColumnVisibilityChange={handleColumnVisibilityChange}
                    />
                  ) : (
                    <></>
                  )}
                </div>
              </div>
              <div className="p-4 border-none bg-foreground mb-10">
                <div className="text-secondary text-center text-[12px]">
                  {depositTransactionLoading ? (
                    // Skeleton loading state
                    <div className="space-y-3 animate-pulse">
                      <div className="h-4 bg-muted rounded w-full mx-auto"></div>
                    </div>
                  ) : activeMyearnTab === "position" ? (
                    <div className="mt-0 space-y-4">
                      <ConnectedWalletBalances
                        tokenAddresses={[
                          "native", // show native chain balance
                          "0x833589fCD6eDb6E08f4c7C32D4f71b54bDa02913", // USDC on Base
                          "0xcdce4c5ffd9cd0025d536dbc69a12cf7ada82193", // SYME
                          "0x0cee77782fa57cfb66403c94c08e2e3e376dc388", // SYL2
                          "0x8a8cf8860f97d007fcf46ed790df794e008b3ce8", // SYAZ
                          "0x700892f09f8f8589ff3e69341b806adb06bb67fd", // SYAI
                          "0xbab03330d8b41b20eb540b6361ab30b59d8ee849", // SYDF
                          "0x03a4Ba7e555330a0631F457BA55b751785DEe091", // SY100
                        ]}
                        prices={{
                          native: 3200,
                          "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": 1,
                          "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": 1,
                        }}
                        logos={{
                          native: "/logos/ethereum.png",
                          "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913":
                            "/logos/usd-coin.png",
                          "0xcdce4c5ffd9cd0025d536dbc69a12cf7ada82193":
                            "/logos/ethereum.png",
                          "0x0cee77782fa57cfb66403c94c08e2e3e376dc388":
                            "/logos/ethereum.png",
                          "0x8a8cf8860f97d007fcf46ed790df794e008b3ce8":
                            "/logos/ethereum.png",
                          "0x700892f09f8f8589ff3e69341b806adb06bb67fd":
                            "/logos/ethereum.png",
                          "0xbab03330d8b41b20eb540b6361ab30b59d8ee849":
                            "/logos/ethereum.png",
                          "0x03a4Ba7e555330a0631F457BA55b751785DEe091":
                            "/logos/ethereum.png",
                        }}
                        explorerBaseUrl="https://basescan.org"
                      />
                      {/* Pending Bridge Orders */}
                      <PendingOrders compact={true} maxOrders={5} />
                    </div>
                  ) : (
                    t("common.noClaimableRewards")
                  )}
                </div>
              </div>
            </>
          ) : (
            <></>
          )}

          <div className="flex gap-4 md:items-center md:justify-between flex-col md:flex-row flex-wrap">
            <div className="flex items-center gap-4">
              <h2 className="text-[16px] font-normal text-card">
                {t("common.depositInVault")}
              </h2>
              <CustomButton
                variant="secondary"
                className="h-auto text-[11px] rounded-[2px] cursor-pointer"
                onClick={onShowVideoPopup}
              >
                {t("common.howDoesItWork")}
              </CustomButton>
            </div>

            <div className="flex items-center gap-2 justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CustomButton
                      variant="secondary"
                      className={cn(
                        "h-[32px] text-[11px] rounded-[3px]",
                        filterMyIndex ? "bg-accent" : "",
                        !isConnected ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      )}
                      onClick={() => {
                        if (isConnected) {
                          setFilterMyIndex(!filterMyIndex);
                        }
                      }}
                      disabled={!isConnected}
                    >
                      My Index
                    </CustomButton>
                  </div>
                </TooltipTrigger>
                {!isConnected && (
                  <TooltipContent>
                    <span className="text-foreground text-[12px]">
                      {t("common.connectWallet")} to filter your indexes
                    </span>
                  </TooltipContent>
                )}
              </Tooltip>
              <ColumnVisibilityPopover
                columns={columns.filter((col) => col.id !== "actions")}
                onColumnVisibilityChange={handleColumnVisibilityChange}
              />
              <div className="relative max-h-[32px]">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground border-[#fafafa14]" />
                <Input
                  type="search"
                  placeholder={t("common.searchVaults")}
                  className="pl-8 !text-[12px] h-[32px] md:w-[150px] text-primary border-[#afafaf1a] focus:border-[#afafaf1a] focus:border-none"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    debouncedSetSearch(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>

          <IBKRAlertBanner />

          <VaultTable
            isLoading={isLoading || itpLoading}
            visibleColumns={visibleColumns}
            vaults={filteredAndSortedVaults}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSupplyClick={onSupplyClick}
          />
          
          {/* Create Index Button */}
          <div className="flex justify-end pt-6">
            <Link href="/create-itp">
              <CustomButton
                className="bg-[#2470ff] hover:bg-blue-700 text-[11px] rounded-[3px] cursor-pointer flex items-center gap-2"
              >
                Start issuing an index
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="inline-block"
                >
                  <path 
                    d="M2 6H10M10 6L6 2M10 6L6 10" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </CustomButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
