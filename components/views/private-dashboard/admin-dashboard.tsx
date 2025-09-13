"use client";

import {
    fetchAllIndices,
    fetchCurrentRebalanceById,
    fetchRebalancesById,
} from "@/server/indices";
import { RebalanceTable } from "@/components/elements/index-rebalances-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { setIndices } from "@/redux/indexSlice";
import { RootState } from "@/redux/store";
import { CircleCheck, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "../../../contexts/wallet-context";

type ColumnType = {
  id: string;
  title: string;
  visible: boolean;
};

const initialColumns: ColumnType[] = [
  { id: "id", title: "ID", visible: true },
  { id: "timestamp", title: "Rebalance Date", visible: true },
  { id: "weights", title: "Weights", visible: true },
  { id: "actions", title: "", visible: true },
];

interface AdminDashboardProps {
  onSupplyClick?: (vaultId: string, token: string) => void;
}

export function AdminDashboard({ onSupplyClick }: AdminDashboardProps) {
  const { wallet } = useWallet();
  const { t } = useLanguage();
  const [columns, setColumns] = useState(initialColumns);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // const storedWallet = useSelector((state: RootState) => state.wallet?.wallet);
  const { selectedNetwork, currentChainId } = useSelector(
    (state: RootState) => state.network
  );

  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isIndexesLoading, setIsIndexesLoading] = useState<boolean>(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [rebalanceLists, setRebalanceLists] = useState<any[]>([]);
  const [selectedIndexId, setSelectedIndexId] = useState<number | null>(null);
  const [currentRebalance, setCurrentRebalance] = useState<any>(null);
  const storedIndexes = useSelector((state: RootState) => state.index.indices);

  useEffect(() => {
    const fetchData = async () => {
      setIsIndexesLoading(true);
      try {
        const response = await fetchAllIndices();
        const data = response;
        dispatch(setIndices(data || []));
      } catch (error) {
        console.error("Error fetching performance data:", error);
        setIsIndexesLoading(false);
      } finally {
        setIsIndexesLoading(false);
      }
    };

    if (storedIndexes.length === 0) fetchData();
  }, []);

  useEffect(() => {
    if (selectedIndexId) {
      fetchCurrentRebalance();
      fetchHistoricalRebalances();
    }
  }, [selectedIndexId]);

  const fetchHistoricalRebalances = async () => {
    if (!selectedIndexId) return;
    setIsLoading(true);
    try {
      const response = await fetchRebalancesById(selectedIndexId);
      const data = response;
      setRebalanceLists(data || []);
    } catch (error) {
      console.error("Error fetching pre-calculated rebalance data:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentRebalance = async () => {
    if (!selectedIndexId) return;
    setIsLoadingCurrent(true);
    try {
      const response = await fetchCurrentRebalanceById(selectedIndexId);
      const data = response;
      setCurrentRebalance(data || {});
    } catch (error) {
      console.error("Error fetching current rebalance data:", error);
      setIsLoadingCurrent(false);
    } finally {
      setIsLoadingCurrent(false);
    }
  };

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
    if (wallet && currentChainId === selectedNetwork) {
      setVisibleColumns(
        columns
          .filter((column) => column.visible)
          .map((column) => ({
            ...column,
          }))
      );
    } else {
      setVisibleColumns(
        columns
          .filter((column) => column.visible && column.id !== "actions")
          .map((column) => ({
            ...column,
          }))
      );
    }
  }, [wallet, columns, currentChainId, selectedNetwork]);

  const parseWeights = (weights: string): { [key: string]: number } => {
    try {
      const parsed = JSON.parse(weights);
      if (!Array.isArray(parsed)) return {};

      return parsed.reduce(
        (acc: { [key: string]: number }, [key, value]: [string, number]) => {
          acc[key] = value;
          return acc;
        },
        {}
      );
    } catch (e) {
      console.error("Failed to parse weights:", e);
      return {};
    }
  };

  return (
    <div className="space-y-6 relative flex h-auto">
      <div className="flex-1 space-y-6 overflow-auto">
        <div className="flex flex-row justify-between">
          <h1 className="text-[38px] text-primary flex items-center">
            {t("common.dashboard")}
          </h1>
        </div>

        <div className="space-y-4 mt-20">
          <div className="flex gap-4 md:items-center md:justify-between flex-col md:flex-row flex-wrap">
            <div className="flex items-center gap-4">
              <h2 className="text-[16px] font-normal text-card">
                {"Index List"}
              </h2>
            </div>
          </div>

          <div className="space-y-6 ">
            {/* Index Selector */}
            <div className="flex items-start gap-4 max-h-[600px] ">
              <Table className="text-primary text-xs bg-foreground rounded-[8px] flex-2/12  h-full overflow-y-auto">
                {/* <TableHeader className="text-primary border-accent">
                  <TableRow className="text-primary hover:bg-accent border-accent">
                    <TableHead className="text-primary hover:bg-accent border-accent">
                      Index Name
                    </TableHead>
                    <TableHead className="text-primary hover:bg-accent border-accent">
                      Ticker
                    </TableHead>
                  </TableRow>
                </TableHeader> */}
                <TableBody>
                  {isIndexesLoading
                    ? Array.from({ length: 10 }).map((_, index) => (
                        <TableRow
                          key={`skeleton-${index}`}
                          className="h-[54px] border-accent"
                        >
                          <TableCell
                            key={`skeleton-1-${index}`}
                            className={cn("py-2 px-5")}
                          >
                            <div className="flex items-center">
                              <div className="h-4 w-3/4 rounded bg-accent animate-pulse" />
                            </div>
                          </TableCell>
                          <TableCell
                            key={`skeleton-2-${index}`}
                            className={cn("py-2 px-5")}
                          >
                            <div className="flex items-center">
                              <div className="h-4 w-3/4 rounded bg-accent animate-pulse" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : storedIndexes.map((index, i) => {
                        return (
                          <TableRow
                            key={`skeleton-${i}`}
                            className={`h-[54px] border-accent ${
                              selectedIndexId === index.indexId
                                ? "bg-accent"
                                : ""
                            }`}
                            onClick={() => setSelectedIndexId(index.indexId)}
                          >
                            <TableCell
                              key={`table-body-${i}`}
                              className={cn("py-2 px-5")}
                            >
                              {index.name}
                            </TableCell>
                            <TableCell
                              key={`table-body-${i} - 1`}
                              className={cn("py-2 px-5", "")}
                            >
                              <div className="flex justify-between flex-row ">
                                <span>{index.ticker}</span>
                                {selectedIndexId === index.indexId ? (
                                  <CircleCheck className="w-4 h-4 text-green-600" />
                                ) : (
                                  <></>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                </TableBody>
              </Table>

              {/* Current Rebalance Section - Updated to Table Format */}
              <Card className="bg-foreground flex-10/12">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Rebalance Weights
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {currentRebalance
                      ? new Date(
                          currentRebalance.timestamp * 1000
                        ).toDateString()
                      : ""}
                  </span>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {isLoadingCurrent ? (
                    <Table>
                      <TableHeader className="text-primary hover:bg-accent border-accent">
                        <TableRow className="text-primary hover:bg-accent border-accent">
                          <TableHead className="text-primary hover:bg-accent border-accent">
                            ID
                          </TableHead>
                          <TableHead className="text-primary hover:bg-accent border-accent">
                            Asset
                          </TableHead>
                          <TableHead className="text-primary hover:bg-accent border-accent">
                            Weight
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="max-h-[400px] overflow-y-auto">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={`skeleton-${i}`}>
                            <TableCell>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : currentRebalance ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px] text-priamry">
                            ID
                          </TableHead>
                          <TableHead className=" text-priamry">Asset</TableHead>
                          <TableHead className="text-right text-priamry">
                            Weight (%)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="max-h-[400px] overflow-y-auto">
                        {JSON.parse(currentRebalance.weights).map(
                          (
                            [asset, weight]: [string, number],
                            index: number
                          ) => (
                            <TableRow key={index + '-' + asset}>
                              <TableCell className="font-medium">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {asset
                                      .split(".")[1]
                                      ?.replace("USDC", "")
                                      .replace("USDT", "") || asset}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {asset.split(".")[1]}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {(Number(weight) / 100).toFixed(2)}%
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No index selected or data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Historical Rebalances Table */}
            <Card className="bg-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-[16px] font-medium">
                  Historical Rebalances
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                  <Input
                    placeholder="Search historical rebalances..."
                    className="pl-8"
                    value={searchQuery}
                    // onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <RebalanceTable
                  visibleColumns={visibleColumns}
                  isLoading={isLoading}
                  rebalances={rebalanceLists}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
