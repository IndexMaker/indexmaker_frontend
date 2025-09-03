"use client";

import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
import { RootState } from "@/redux/store";
import { IndexListEntry } from "@/types/index";
import { ArrowDown, ArrowUp, Copy, Info } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useWallet } from "../../contexts/wallet-context";
import USDC from "../../public/logos/usd-coin.png";
import IndexMaker from "../icons/indexmaker";
import LeftArrow from "../icons/left-arrow";
import RightArrow from "../icons/right-arrow";
import CustomTooltip from "./custom-tooltip";

interface VaultTableProps {
  visibleColumns: {
    id: string;
    title: string;
    visible: boolean;
  }[];
  isLoading: boolean;
  vaults: IndexListEntry[];
  onSort?: (columnId: string, direction: "asc" | "desc") => void;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSupplyClick?: (vaultId: string, token: string) => void;
}

export function VaultTable({
  isLoading,
  visibleColumns,
  vaults,
  onSort,
  sortColumn,
  sortDirection,
  onSupplyClick,
}: VaultTableProps) {
  const { t } = useLanguage();
  const { wallet } = useWallet();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const router = useRouter();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVaults = vaults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(vaults.length / itemsPerPage);
  const dispatch = useDispatch();

  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );
  const { selectedNetwork, currentChainId } = useSelector(
    (state: RootState) => state.network
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

  const assetDetail = (vault: IndexListEntry) => {
    if (!vault.ticker) return;
    window.open("/vault/" + vault.ticker, "_blank");
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
                            ? ""
                            : col.id === "ytdReturn"
                            ? t("table.oneYearPerformance")
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
              : currentVaults.map((vault: IndexListEntry, index) => (
                  <TableRow
                    key={vault.name}
                    className="hover:bg-accent border-accent h-[54px] text-[13px] cursor-pointer"
                  >
                    {visibleColumns.map(
                      (col) =>
                        col.visible && (
                          <TableCell
                            key={col.id}
                            onClick={() => assetDetail(vault)}
                            className={cn(
                              "text-card",
                              col.id === "actions"
                                ? "sticky right-0 px-5 py-0 bg-foreground border-t before-line max-w-[92px] cursor-default"
                                : "pl-5 pr-18"
                            )}
                          >
                            {col.id === "name" && (
                              <>
                                <div className="flex items-center gap-2 pl-[1.5px]">
                                  <span>{vault.name}</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4"
                                      >
                                        <Info className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">
                                        Additional information about this vault
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </>
                            )}
                            {col.id === "ticker" && (
                              <div
                                className="flex items-center gap-2"
                                onClick={() => assetDetail(vault)}
                              >
                                <span className="text-card">
                                  {vault.ticker}
                                </span>
                              </div>
                            )}
                            {col.id === "totalSupply" && (
                              <div
                                className="flex items-center gap-2"
                                onClick={() => assetDetail(vault)}
                              >
                                <div className="flex gap-1">
                                  <Image
                                    src={USDC}
                                    alt={"Total Supply"}
                                    width={8}
                                    height={8}
                                    className="object-cover w-full h-full"
                                  />
                                  <span>{vault.totalSupply} USDC</span>
                                </div>
                                <div className="text-card p-1 ml-2 bg-accent text-xs">
                                  ${vault.totalSupplyUSD.toFixed(2) || "0"}
                                </div>
                              </div>
                            )}
                            {/* {col.id === "instantApy" && (
                          <div
                            className="flex items-center gap-1 cursor-pointer"
                            onClick={() => assetDetail(vault)}
                          >
                            {vault.instantApy}
                            {index >= 2 && (
                              <CustomTooltip
                                key={"instantApy"}
                                content={
                                  <div className="flex flex-col gap-1 min-w-[220px] rounded-[8px]">
                                    <div className="flex justify-between border-b py-1 px-3 border-accent">
                                      <span className="text-sm">
                                        Rate & Rewards
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-b py-1 px-3 border-accent">
                                      <div className="flex items-center gap-1">
                                        <BarChart2 className="h-4 w-4" />
                                        <span>Rate</span>
                                      </div>
                                      <span>+5.25%</span>
                                    </div>
                                    <div className="flex justify-between border-b py-1 px-3 border-accent">
                                      <div className="flex items-center gap-1">
                                        <Image
                                          src={USDC}
                                          alt={vault.token}
                                          width={14}
                                          height={14}
                                        />
                                        <span className="text-xs">IndexMaker</span>
                                        <Copy className="w-[15px] h-[15px] cursor-pointer" />
                                      </div>
                                      <span className="font-bold">+1.16%</span>
                                    </div>
                                    <div className="flex justify-between border-b py-1 px-3 border-accent">
                                      <div className="flex items-center">
                                        <InstantAPY className="w-[17px] h-[17px]" />
                                        <span className="text-[#2470FFe6]">
                                          IndexMaker
                                        </span>
                                      </div>
                                      <span className="font-bold text-[#2470FFe6]">
                                        = 6.41%
                                      </span>
                                    </div>
                                  </div>
                                }
                              >
                                <span className="text-xs text-blue-400">
                                  <InstantAPY className="w-[15px] h-[15px] hover:transition-all" />
                                </span>
                              </CustomTooltip>
                            )}
                          </div>
                        )} */}
                            {col.id === "ytdReturn" && (
                              <div onClick={() => assetDetail(vault)}>
                                {vault.performance?.oneYearReturn.toFixed(2) ||
                                  vault.ytdReturn}{" "}
                                %
                              </div>
                            )}
                            {col.id === "performance" && (
                              <div
                                onClick={() => assetDetail(vault)}
                                className="flex items-center justify-between gap-4 pr-4 text-center"
                              >
                                <div className="flex flex-col items-center border-r px-4">
                                  <div className="text-sm font-medium">
                                    1 Yr
                                  </div>
                                  <div
                                    className={`font-medium ${
                                      (vault.performance?.oneYearReturn || 0) >=
                                      0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {(vault.performance?.oneYearReturn || 0) >=
                                    0
                                      ? "+"
                                      : ""}
                                    {vault.performance?.oneYearReturn?.toFixed(
                                      2
                                    )}
                                    %
                                  </div>
                                </div>
                                <div className="flex flex-col items-center border-r px-4">
                                  <div className="text-sm font-medium">
                                    3 Yrs
                                  </div>
                                  <div
                                    className={`font-medium ${
                                      (vault.performance?.threeYearReturn ||
                                        0) >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {(vault.performance?.threeYearReturn ||
                                      0) >= 0
                                      ? "+"
                                      : ""}
                                    {vault.performance?.threeYearReturn?.toFixed(
                                      2
                                    )}
                                    %
                                  </div>
                                </div>
                                <div className="flex flex-col items-center border-r px-4">
                                  <div className="text-sm font-medium">
                                    5 Yrs
                                  </div>
                                  <div
                                    className={`font-medium ${
                                      (vault.performance?.fiveYearReturn ||
                                        0) >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {(vault.performance?.fiveYearReturn || 0) >=
                                    0
                                      ? "+"
                                      : ""}
                                    {vault.performance?.fiveYearReturn?.toFixed(
                                      2
                                    )}
                                    %
                                  </div>
                                </div>
                                <div className="flex flex-col items-center px-4">
                                  <div className="text-sm font-medium">
                                    10 Yrs
                                  </div>
                                  <div
                                    className={`font-medium ${
                                      (vault.performance?.tenYearReturn || 0) >=
                                      0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    {(vault.performance?.tenYearReturn || 0) >=
                                    0
                                      ? "+"
                                      : ""}
                                    {vault.performance?.tenYearReturn?.toFixed(
                                      2
                                    )}
                                    %
                                  </div>
                                </div>
                              </div>
                            )}
                            {col.id === "assetClass" && (
                              <div onClick={() => assetDetail(vault)}>
                                {vault.assetClass}
                              </div>
                            )}
                            {col.id === "category" && (
                              <div onClick={() => assetDetail(vault)}>
                                {vault.category}
                              </div>
                            )}
                            {col.id === "inceptionDate" && (
                              <div onClick={() => assetDetail(vault)}>
                                {vault.inceptionDate}
                              </div>
                            )}
                            {col.id === "curator" && (
                              <div
                                className="flex items-center gap-2"
                                onClick={() => assetDetail(vault)}
                              >
                                <IndexMaker className="w-4 h-4 text-muted" />
                                <span>{"OTC"}</span>
                              </div>
                            )}
                            {col.id === "collateral" && (
                              <div
                                className="flex items-left gap-0 min-w-[150px]"
                                onClick={() => assetDetail(vault)}
                              >
                                {vault.collateral.length > 0 ? (
                                  <>
                                    {vault.collateral
                                      .slice(0, 5)
                                      .map((collateral, index) => (
                                        <CustomTooltip
                                          key={index.toString()}
                                          content={
                                            <div className="flex flex-col gap-1 min-w-[220px] rounded-[8px]">
                                              <div className="flex justify-between border-b py-1 px-3 border-accent">
                                                <span>Collateral</span>
                                                <div className="flex items-center">
                                                  <Image
                                                    src={collateral.logo}
                                                    alt={"Collateral"}
                                                    width={17}
                                                    height={17}
                                                  />
                                                  <span>
                                                    {" "}
                                                    {collateral.name}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="flex justify-between border-b py-1 px-3 border-accent">
                                                <span className="">
                                                  Binance
                                                </span>
                                                {/* <a
                                              target="_blank"
                                              href="https://etherscan.io/address/0xDddd770BADd886dF3864029e4B377B5F6a2B6b83"
                                              className="hover:bg-[afafaf20]"
                                            >
                                              Exchange rate
                                            </a> */}
                                                <Copy className="w-[15px] h-[15px]" />
                                              </div>
                                            </div>
                                          }
                                        >
                                          <span className="hover:px-1 hover:transition-all">
                                            <div className="flex items-center gap-1">
                                              {collateral.logo !== "" && (
                                                <Image
                                                  src={collateral.logo}
                                                  alt={"Collateral"}
                                                  width={17}
                                                  height={17}
                                                  className="mr-1" // Adds slight overlap between images
                                                />
                                              )}
                                            </div>
                                          </span>
                                        </CustomTooltip>
                                      ))}
                                    {vault.collateral.length > 5 && (
                                      <CustomTooltip
                                        content={
                                          <div className="flex flex-col gap-2 p-2">
                                            {vault.collateral
                                              .slice(5)
                                              .map((collateral, index) => (
                                                <div
                                                  key={index}
                                                  className="flex items-center gap-2"
                                                >
                                                  {/* <Image
                                                src={collateral.logo}
                                                alt="Collateral"
                                                width={17}
                                                height={17}
                                              /> */}
                                                  <span>{collateral.name}</span>
                                                </div>
                                              ))}
                                          </div>
                                        }
                                      >
                                        <span className="text-[12px] pl-2">
                                          + {vault.collateral.length - 5}
                                        </span>
                                      </CustomTooltip>
                                    )}
                                  </>
                                ) : null}
                              </div>
                            )}
                            {col.id === "managementFee" && (
                              <div onClick={() => assetDetail(vault)}>
                                {vault.managementFee}
                              </div>
                            )}
                            {col.id === "actions" && (
                              <div
                                className="relative before:absolute before:top-0 before:left-0 before:w-px before:h-full before:bg-accent"
                                onClick={(e) => {
                                  return;
                                }}
                              >
                                {wallet &&
                                currentChainId === selectedNetwork ? (
                                  <Button
                                    className={cn(
                                      "bg-[#2470ff] hover:bg-blue-700 text-white text-[11px] rounded-[4px] px-[5px] py-[8px] h-[26px] sticky right-0",
                                      selectedVault
                                        .map((v) => v.name)
                                        .includes(vault.name) ||
                                        vault.name !== "SY100"
                                        ? "opacity-30 cursor-not-allowed"
                                        : "cursor-pointer"
                                    )}
                                    disabled={
                                      selectedVault
                                        .map((v) => v.name)
                                        .includes(vault.name) ||
                                      vault.name !== "SY100"
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent event from bubbling up to the row
                                      onSupplyClick?.(vault.name, vault.ticker);
                                    }}
                                  >
                                    Buy Now
                                  </Button>
                                ) : (
                                  <Button
                                    className={cn(
                                      "bg-[#2470ff] px-4 hover:bg-blue-700 text-white text-[11px] rounded-[4px] py-[8px] h-[26px] sticky right-0",
                                      "cursor-pointer"
                                    )}
                                  >
                                    Learn
                                  </Button>
                                )}
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
