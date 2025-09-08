"use client";

import {
    fetchAllIndices,
    fetchDepositTransactionData,
    getIndexMakerInfo,
} from "@/api/indices";
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

type ColumnType = {
  id: string;
  title: string;
  visible: boolean;
};

const initialColumns: ColumnType[] = [
  { id: "name", title: "Index Name", visible: true },
  { id: "ticker", title: "Ticker", visible: true },
  { id: "totalSupply", title: "Total Supply", visible: true },
  { id: "ytdReturn", title: "YTD return", visible: true },
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
  const [supplyPositions, setSupplyPositions] = useState<SupplyPosition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [activeMyearnTab, setActiveMyearnTab] = useState<
    "position" | "historic"
  >("position");
  // const storedWallet = useSelector((state: RootState) => state.wallet?.wallet);
  const { selectedNetwork, currentChainId } = useSelector(
    (state: RootState) => state.network
  );

  const dispatch = useDispatch();
  const totalManaged = useSelector(
    (state: RootState) => state.index.totalManaged
  );
  const totalVolume = useSelector(
    (state: RootState) => state.index.totalVolume
  );
  const [depositTransactionLoading, setDepositTransactionLoading] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [indexLists, setIndexLists] = useState<IndexListEntry[]>([]);
  const [selectedIndexId, setSelectedIndexId] = useState<number | null>(null);

  const storedIndexes = useSelector((state: RootState) => state.index.indices);
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetchAllIndices();
        const data = response;
        setIndexLists(data || []);
        dispatch(setIndices(data || []));

        localStorage.setItem("storedVaults", JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching performance data:", error);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (storedIndexes.length === 0) fetchData();

    const fetchInfo = async () => {
      const response = await getIndexMakerInfo();
      if (response) {
        dispatch(setTotalManaged(response.totalManaged));
        dispatch(setTotalVolume(response.totalVolume));
      }
    };

    !totalManaged && fetchInfo();

    dispatch(clearSelectedVault())
  }, []);

  useEffect(() => {
    // const termsAccepted = localStorage.getItem("termsAccepted");
    // if ((!termsAccepted || termsAccepted === "false") && wallet) {
    //   setShowHowEarnWorks(true);
    // }

    if (wallet?.accounts) {
      const _fetchDepositTransaction = async (_indexId: number) => {
        setDepositTransactionLoading(true);
        try {
          const response = await fetchDepositTransactionData(
            -1,
            wallet?.accounts[0]?.address
          );
          const data = response;
          setSupplyPositions(data);
        } catch (error) {
          console.error("Error deposit transaction data:", error);
        } finally {
          setDepositTransactionLoading(false);
        }
      };
      _fetchDepositTransaction(-1);
    }
  }, [wallet]);
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
    // if (wallet && currentChainId === selectedNetwork) {
    // } else {
    //   setVisibleColumns(
    //     columns
    //       .filter((column) => column.visible && column.id !== "actions")
    //       .map((column) => ({
    //         ...column,
    //       }))
    //   );
    // }
  }, [wallet, columns, currentChainId, selectedNetwork]);

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
            <Link href={"./analytics"}>
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
                  <div className="font-normal text-secondary text-[15px] pb-2">
                    ${totalManaged ? totalManaged : 0}
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* <Link href={"./analytics"}>
              <Card className="bg-foreground gap-5 border-none cursor-pointer p-5 flex flex-col h-[98px] min-w-[194px] rounded-[12px]">
                <CardHeader className="flex flex-row items-center justify-between p-0 w-full">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Borrow className="h-[14px] w-[14px]" />
                      <div className="text-secondary text-[12px]">
                        {t("common.totalBorrow")}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[20px]">
                  <div className="text-[15px] font-normal text-secondary mb-2">
                    ${totalVolume ? totalVolume : 0}
                  </div>
                </CardContent>
              </Card>
            </Link> */}
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
                    supplyPositions.length === 0 ? (
                      t("common.noEarnPosition")
                    ) : (
                      <div className="mt-[-30] m-[-16]">
                        <VaultSupply
                          supplyPositions={supplyPositions}
                          myPositions={true}
                        />
                      </div>
                    )
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
                // onClick={() => setShowHowEarnWorks(true)}
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
