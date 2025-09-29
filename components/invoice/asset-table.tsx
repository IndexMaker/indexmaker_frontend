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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Asset } from "@/types";
import { redirect } from "next/navigation";

interface AssetTableProps {
  assets: Asset[];
}

export function AssetTable({ assets }: AssetTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatNumber = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
                <TableHead className="text-secondary text-[13px] pl-[20px]">
                  Symbol
                </TableHead>
                <TableHead className="text-secondary text-[13px]">
                  Price (USD)
                </TableHead>
                <TableHead className="text-secondary text-[13px]">
                  Amount
                </TableHead>
                <TableHead className="text-secondary text-[13px]">
                  Value (USDC)
                </TableHead>
                <TableHead className="text-secondary text-[13px]">
                  Last Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentAssets.map((asset) => {
                const usdcValue = asset.expected_inventory * asset.price_usd;
                return (
                  <TableRow
                    key={asset.id}
                    className="border-accent hover:bg-accent/50 h-[54px] text-[13px] hover:cursor-pointer"
                    onClick={() => viewDetail(asset.id)}
                  >
                    <TableCell className="pl-[20px] font-medium">
                      <div className="flex items-center gap-2">
                        <span>{asset.symbol}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(asset.price_usd)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(asset.expected_inventory)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNumber(usdcValue)} USDC
                    </TableCell>
                    <TableCell className="text-secondary">
                      {formatDate(asset.last_updated)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-center items-center mt-4 text-primary text-sx">
        <Button
          className="text-[11px] text-muted bg-background hover:bg-accent p-0 h-4"
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
