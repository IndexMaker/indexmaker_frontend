"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { VaultAsset } from "@/lib/data";
import { Button } from "../ui/button";
import LeftArrow from "../icons/left-arrow";
import RightArrow from "../icons/right-arrow";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import Info from "../icons/info";
import { useLanguage } from "@/contexts/language-context";
import Image from "next/image";
import BinanceLogo from "./../../public/icons/binance.png";
import BitgetLogo from "./../../public/icons/bitget.svg";

interface VaultAssetsProps {
  isLoading: boolean;
  assets: VaultAsset[];
  visibleColumns: { id: string; name: string; visible: boolean }[];
}

export function VaultAssets({
  isLoading,
  assets,
  visibleColumns,
}: VaultAssetsProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssets = assets.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(assets.length / itemsPerPage);

  // Format market cap to human-readable format
  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  // Format weights to percentage
  const formatWeights = (value: number) => {
    return `${value}%`;
  };

  // Helper function to render cell content based on column ID
  const renderCellContent = (asset: VaultAsset, columnId: string) => {
    switch (columnId) {
      case "ticker":
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{asset.ticker}</span>
          </div>
        );
      case "assetname":
        return (
          <div className="flex items-center gap-2">
            <span>{asset.assetname}</span>
            <Image
              src={
                asset.listing.toLowerCase() === "bg" ? BitgetLogo : BinanceLogo
              }
              className="h-[17px] rounded-full"
              height={17}
              alt="Listing"
            />
          </div>
        );
      case "sector":
        return asset.sector;
      case "market_cap":
        return formatMarketCap(asset.market_cap);
      case "weights":
        return (
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <div>{formatWeights(asset.weights)}</div>
              {asset.weights < 0.01 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="h-4 w-4 text-card rounded-none bg"
                    >
                      <Info className="h-3 w-3 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs p-2">
                      <span className="font-bold text-[12px] text-primary">
                        This asset has a small weight in the portfolio.
                        <a
                          target="_blank"
                          rel="noreferrer noopener"
                          className="font-normal text-card text-[11px]"
                          href="#"
                        >
                          Learn more →
                        </a>
                      </span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        );
      default:
        return "—";
    }
  };

  const visibleColumnCount = visibleColumns.filter((c) => c.visible).length;

  return (
    <>
      <Card className="bg-foreground border-none rounded-[8px] mt-4 py-0 rouneded-[8px]">
        <CardContent className="p-0 overflow-x-auto rouneded-[8px]">
          <Table className="rouneded-[16px]">
            <TableHeader className="bg-foreground">
              <TableRow className="hover:bg-transparent border-[#afafaf1a] h-[44px]">
                {visibleColumns
                  .filter((column) => column.visible)
                  .map((column) => (
                    <TableHead
                      key={column.id}
                      className={cn(
                        "text-secondary text-[11px] pl-[20px] pr-[72px]",
                        column.id === "weights" && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-1 text-[13px]">
                        {t("table." + column.id)}
                        {column.id === "weights" && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-zinc-400"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        )}
                      </div>
                    </TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
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
              ) : currentAssets.length === 0 ? (
                <TableRow className="hover:bg-transparent border-[#afafaf1a]">
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-[150px] text-center"
                  >
                    <div className="flex flex-col items-center justify-center h-full text-muted text-[13px]">
                      Data Coming in v0.8
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentAssets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="border-[#afafaf1a] hover:bg-foreground/50 h-[54px] text-[13px]"
                  >
                    {visibleColumns
                      .filter((column) => column.visible)
                      .map((column, index) => (
                        <TableCell
                          className="pl-[20px] text-card pr-18"
                          key={`${asset.id}-${index}`}
                        >
                          {renderCellContent(asset, column.id)}
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {!isLoading && assets.length > 0 && (
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
      )}
    </>
  );
}