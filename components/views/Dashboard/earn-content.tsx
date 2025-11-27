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
import { RootState } from "@/redux/store";
import { clearSelectedVault } from "@/redux/vaultSlice";
import { IndexListEntry } from "@/types/index";
import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "../../../contexts/wallet-context";
import { HowEarnWorks } from "./how-earn-works";
import ConnectedWalletBalances from "@/components/elements/connect-wallet-balance";
import IBKRAlertBanner from "@/components/elements/AnnouncementBanner";
import { useQuoteContext } from "@/contexts/quote-context";
import Image from "next/image";
import USDC from "../../../public/logos/usd-coin.png";
import { Asset } from "@/types";
import { fetchAssets, fetchInventory } from "@/server/invoice";

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
  { id: "collateral", title: "Collateral", visible: false },
  { id: "assetClass", title: "Asset Class", visible: true },
  { id: "category", title: "Category", visible: true },
  { id: "inceptionDate", title: "Inception Date", visible: false },
  { id: "managementFee", title: "Management Fee", visible: false },
  { id: "actions", title: "", visible: true },
];

interface EarnContentProps {
  onSupplyClick?: (vaultId: string, token: string) => void;
  showHowEarnWorks: boolean;
  setShowHowEarnWorks: (showHowEarnWorks: boolean) => void;
}

export function EarnContent({
  onSupplyClick,
  showHowEarnWorks,
  setShowHowEarnWorks,
}: EarnContentProps) {
  const { wallet } = useWallet();
  const { t } = useLanguage();
  const [columns, setColumns] = useState(initialColumns);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

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
        console.error("Error fetching performance data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (storedIndexes.length === 0) fetchData();

    dispatch(clearSelectedVault());
  }, []);

  // ------------------------------------------------------------------
  //  MODIFIED: Calculate Total Deposits (AUM) using Redux Market Data
  // ------------------------------------------------------------------
  useEffect(() => {
    // 1. Identify which list of indexes to use
    const indices: IndexListEntry[] =
      storedIndexes && storedIndexes.length > 0 ? storedIndexes : indexLists;

    if (!indices || indices.length === 0) return;

    // 2. Sum up (Supply * Price) for every asset
    const liveTotalAUM = indices.reduce((acc, idx) => {
      const ticker = idx.ticker;

      // Get Supply from Redux (Live on-chain data)
      const supply = reduxSupplies[ticker] ?? 0;

      // Get Price from Redux (Live feed)
      let price = reduxPrices[ticker];

      // Fallback: Fuzzy match price if exact ticker not found
      if (price === undefined) {
        const norm = normalize(ticker);
        for (const [k, v] of Object.entries(reduxPrices)) {
          if (normalize(k) === norm) {
            price = v;
            break;
          }
        }
      }

      // Calculate USD value for this asset
      const assetValueUSD = supply * (price ?? 0);

      return acc + assetValueUSD;
    }, 0);

    // 3. Update Redux with the new Total Managed value
    dispatch(setTotalManaged(String(liveTotalAUM)));
  }, [reduxPrices, reduxSupplies, storedIndexes, indexLists, dispatch]);


  // Function to handle sorting
  const handleSort = (columnId: string, direction: "asc" | "desc") => {
    setSortColumn(columnId);
    setSortDirection(direction);
  };

  // Filter and sort vaults based on search query and sort settings
  const filteredAndSortedVaults = useMemo(() => {
    // First filter by search query
    let filtered = storedIndexes;
    if (!filtered) return [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      filtered = storedIndexes.filter((vault) => {
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
  }, [searchQuery, sortColumn, sortDirection, storedIndexes]);
  
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
        const [assetsData, inventory] = await Promise.all([
          fetchAssets(),
          fetchInventory(),
        ]);

        console.log("🚀 ~ loadAssets ~ inventory:", inventory)

        const invMap: Record<string, number> = Object.fromEntries(
          Object.entries(inventory?.positions ?? {}).map(([key, val]) => {
            const sym = val?.inventory_position?.symbol ?? key;
            const raw = val?.actual_balance ?? 0;
            const num = typeof raw === "string" ? parseFloat(raw) : raw;
            return [sym, Number.isFinite(num) ? num : 0];
          })
        );

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

  if (showHowEarnWorks) {
    return (
      <div className="bg-foreground border-none border-zinc-800 rounded-lg p-0 -mt-[60px] md:mt-0">
        <HowEarnWorks onClose={() => setShowHowEarnWorks(false)} />
      </div>
    );
  }

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
                  {/* Updated Logic: Show loading if isLoading is true OR totalManaged is 0/undefined */}
                  {isLoading || !totalManaged || Number(totalManaged) === 0 ? (
                    <div className="h-5 w-24 bg-muted/50 animate-pulse rounded" />
                  ) : (
                    <span>{formatUSDC(Number(totalManaged))}</span>
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
                    <div className="mt-0">
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
                className="h-auto text-[11px] rounded-[2px]"
              >
                <Link
                  target="_blank"
                  href={"https://psymm.gitbook.io/indexmaker"}
                >
                  {t("common.howDoesItWork")}
                </Link>
              </CustomButton>
            </div>

            <div className="flex items-center gap-2 justify-between">
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <IBKRAlertBanner />

          <VaultTable
            isLoading={isLoading}
            visibleColumns={visibleColumns}
            vaults={filteredAndSortedVaults}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSupplyClick={onSupplyClick}
          />
        </div>
      </div>
    </div>
  );
}