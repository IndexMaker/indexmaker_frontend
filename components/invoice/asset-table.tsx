"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Asset } from "@/types";
import { redirect } from "next/navigation";
import Image from "next/image";

interface AssetTableProps {
  assets: Asset[];
}

export function AssetTable({ assets }: AssetTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) {
      return `${(num / 1e12).toFixed(2)}T`;
    }
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(2)}B`;
    }
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`;
    }
    if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)}K`;
    }
    return num.toLocaleString();
  };

  const totalPages = Math.ceil(assets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssets = assets.slice(startIndex, endIndex);

  const viewDetail = (id: string) => {
    id && redirect(`/assets/${id}`);
  };

  return (
    <>
      <Card className="bg-foreground border-none rounded-[8px] mt-4 py-0">
        <CardContent className="p-0 overflow-x-auto rounded-[8px]">
          <Table className="rounded-[16px]">
            <TableHeader className="bg-foreground">
              <TableRow className="hover:bg-transparent border-accent h-[44px]">
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Asset
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Price
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Market Cap
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Inventory in Custody
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Supply
                </TableHead>
                {/* <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]"></TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentAssets.map((asset) => {
                const supplyPercentage =
                  (asset.circulating_supply / asset.total_supply) * 100;
                return (
                  <TableRow
                    key={asset.id}
                    className="border-accent hover:bg-accent/50 h-[54px] text-[13px] cursor-pointer"
                    onClick={() => viewDetail(asset.id)}
                  >
                    <TableCell className="pl-[20px] text-card pr-18">
                      <div className="flex items-center gap-2">
                        <div className="w-[17px] h-[17px] rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          <Image
                            width={17}
                            height={17}
                            src={asset.thumb}
                            alt={asset.symbol}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-primary">
                            {asset.symbol}
                          </div>
                          <div className="text-secondary text-xs">
                            {asset.name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="pl-[20px] text-card pr-18 font-medium">
                      {formatCurrency(asset.price_usd)}
                    </TableCell>
                    <TableCell className="pl-[20px] text-card pr-18 font-medium">
                      {formatLargeNumber(asset.market_cap)}
                    </TableCell>
                    <TableCell className="pl-[20px] text-card pr-18 font-medium">
                      {asset.expected_inventory}
                    </TableCell>
                    <TableCell className="pl-[20px] text-card pr-18">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="bg-secondary h-2 rounded-full"
                            style={{ width: `${supplyPercentage}%` }}
                          />
                        </div>
                        <span className="text-secondary">
                          {supplyPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    {/* <TableCell className="pl-[20px] text-card pr-18">
                      <Link href={`/assets/${asset.id}`}>
                        <ExternalLink className="h-4 w-4 text-secondary hover:text-primary cursor-pointer" />
                      </Link>
                    </TableCell> */}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-center items-center mt-4 text-primary text-sx">
        <Button
          className="text-[11px] text-muted bg-background  hover:bg-accent p-0 h-4"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-[11px] text-muted">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          className="text-[11px] text-muted bg-background hover:bg-accent p-0 h-4"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}
