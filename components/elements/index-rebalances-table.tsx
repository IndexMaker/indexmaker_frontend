"use client";

import { Copy, BarChart2, Info, ArrowUp, ArrowDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import CustomTooltip from "./custom-tooltip";
import { useState } from "react";
import RightArrow from "../icons/right-arrow";
import LeftArrow from "../icons/left-arrow";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import IndexMaker from "../icons/indexmaker";

interface RebalanceTableProps {
  visibleColumns: {
    id: string;
    title: string;
    visible: boolean;
  }[];
  isLoading: boolean;
  rebalances: RebalanceData[];
  onSort?: (columnId: string, direction: "asc" | "desc") => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSupplyClick?: (vaultId: string, token: string, address: string) => void;
}

interface RebalanceData {
  id: number;
  indexId: string;
  weights: string;
  prices: { [key: string]: number };
  timestamp: number;
  deployed?: boolean;
  coins: string[];
  createdAt: string;
}

export function RebalanceTable({
  isLoading,
  visibleColumns,
  rebalances,
  onSort,
  sortColumn,
  sortDirection,
  onSupplyClick,
}: RebalanceTableProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const router = useRouter();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVaults = rebalances.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(rebalances.length / itemsPerPage);
  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );

  // Function to handle column header click for sorting
  const handleSort = (columnId: string) => {
    if (onSort) {
      // If already sorting by this column, toggle direction
      if (sortColumn === columnId) {
        onSort(columnId, sortDirection === "asc" ? "desc" : "asc");
      } else {
        // Default to ascending for new sort column
        onSort(columnId, "asc");
      }
    }
  };

  // Determine if a column is sortable
  const isSortable = (columnId: string) => {
    // Add all sortable columns here
    return [
      "name",
      "ytdReturn",
      "totalSupply",
      "ticker",
      "assetClass",
      "category",
      "inceptionDate",
      "performanceFee",
    ].includes(columnId);
  };

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
    <TooltipProvider>
      <div className="">
        <Table className="text-primary text-xs bg-foreground rounded-[8px]">
          <TableHeader className="text-primary border-accent">
            <TableRow className="text-primary hover:bg-accent border-accent">
              {visibleColumns
                .filter((col) => col.visible)
                .map((col) => (
                  <TableHead
                    key={col.id}
                    className={
                      isSortable(col.id)
                        ? "cursor-pointer select-none text-secondary text-[11px] h-[44px] pl-5 pr-18 min-w-[180px]"
                        : cn(
                            "text-secondary text-[11px] h-[44px] pl-5 pr-18 ",
                            col.id === "actions"
                              ? "max-w-[92px] sticky right-0 bg-gradient-to-r from-transparent via-foreground to-foreground"
                              : "min-w-[180px]"
                          )
                    }
                    onClick={
                      isSortable(col.id) ? () => handleSort(col.id) : undefined
                    }
                  >
                    <div className="flex items-center gap-1">
                      {
                        <span>
                          {col.id === "actions"
                            ? "1"
                            : col.id === "timestamp"
                            ? t("table.rebalance_timestamp")
                            : col.id === "vaultApy"
                            ? t("table.supplyAPY")
                            : t("table." + col.id)}
                        </span>
                      }
                      {isSortable(col.id) && (
                        <span className="ml-1 h-3 w-3 hover:flex">
                          {sortColumn === col.id ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-zinc-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-zinc-400 opacity-30" />
                            )
                          ) : (
                            <ArrowDown className="h-3 w-3 text-zinc-400 opacity-30 " />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? // Skeleton loading state
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRow
                    key={`skeleton-${index}`}
                    className="h-[54px] border-accent"
                  >
                    {visibleColumns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <TableCell
                          key={`skeleton-${col.id}-${index}`}
                          className={cn(
                            "py-2 px-5",
                            col.id === "actions" &&
                              "sticky right-0 bg-foreground"
                          )}
                        >
                          <div className="flex items-center">
                            {col.id === "actions" ? (
                              <div className="h-8 w-20 rounded bg-accent animate-pulse" />
                            ) : (
                              <div className="h-4 w-3/4 rounded bg-accent animate-pulse" />
                            )}
                          </div>
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              : currentVaults.map((rebalance: RebalanceData, index) => (
                  <TableRow
                    key={index}
                    className="hover:bg-accent border-accent h-[54px] text-[13px] cursor-pointer"
                  >
                    {visibleColumns.map(
                      (col) =>
                        col.visible && (
                          <TableCell
                            key={col.id}
                            className={cn(
                              "text-card",
                              col.id === "actions"
                                ? "sticky right-0 px-5 py-0 bg-foreground border-t before-line max-w-[92px] cursor-default"
                                : "pl-5 pr-18"
                            )}
                          >
                            {col.id === "id" && (
                              <>
                                <div className="flex items-center gap-2 pl-[1.5px]">
                                  <span>{index + 1}</span>
                                </div>
                              </>
                            )}
                            {col.id === "timestamp" && (
                              <div className="flex items-center gap-2">
                                <span className="text-card">
                                  {new Date(
                                    rebalance.timestamp * 1000
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {col.id === "weights" && (
                              <div className="flex items-center gap-2">
                                {(
                                  <CustomTooltip
                                    content={
                                      <div className="flex flex-col gap-2 p-2 max-h-[300px] overflow-y-auto">
                                        <div className="font-semibold text-sm mb-1">
                                          Assets (
                                          {JSON.parse(rebalance.weights)
                                            .length}
                                          )
                                        </div>
                                        {JSON.parse(rebalance.weights)
                                          .map(
                                            ([asset, weight]: [
                                              string,
                                              number
                                            ]) => (
                                              <div
                                                key={asset}
                                                className="flex justify-between items-center gap-4"
                                              >
                                                <span className="text-sm">
                                                  {asset
                                                    .split(".")[1]
                                                    ?.replace("USDC", "").replace("USDT", "") ||
                                                    asset}
                                                </span>
                                                <span className="text-sm font-medium">
                                                  {(weight / 100).toFixed(2)}%
                                                </span>
                                              </div>
                                            )
                                          )}
                                      </div>
                                    }
                                  >
                                    <span className="text-xs text-muted-foreground bg-accent px-10 py-1 rounded-md ml-2 cursor-default">
                                      {JSON.parse(rebalance.weights).length}{" Assets"}
                                    </span>
                                  </CustomTooltip>
                                )}
                              </div>
                            )}

                            {col.id === "actions" && (
                              <div
                                className="relative before:absolute before:top-0 before:left-0 before:w-px before:h-full before:bg-accent"
                                onClick={(e) => {
                                  return;
                                }}
                              >
                                <Button
                                  className={cn(
                                    "bg-blue-600 hover:bg-blue-700 text-white text-[11px] rounded-[4px] px-[5px] py-[8px] h-[26px] sticky right-0",
                                    rebalance.deployed
                                      ? "opacity-30 cursor-not-allowed"
                                      : "cursor-pointer"
                                  )}
                                  disabled={rebalance.deployed}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent event from bubbling up to the row
                                    // onSupplyClick?.(vault.name, vault.ticker);
                                  }}
                                >
                                  {rebalance.deployed ? 'Deploy' : 'Deployed'}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )
                    )}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        <div className="flex justify-center items-center mt-4 text-primary text-sx">
          <Button
            className="text-[11px] text-muted bg-background p-0 h-4"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <LeftArrow className="w-4 h-4" />
          </Button>
          <span className="text-[11px] text-muted">
            {t("common.page")} {currentPage} {t("common.of")} {totalPages}
          </span>
          <Button
            className="text-[11px] text-muted bg-background p-0 h-4"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            <RightArrow className="w-[8px] h-[8px] rotate-180 " />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
