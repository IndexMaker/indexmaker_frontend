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
import { cn, shortenAddress } from "@/lib/utils";
import { ReAllocation } from "@/lib/data";
import { Button } from "../ui/button";
import LeftArrow from "../icons/left-arrow";
import RightArrow from "../icons/right-arrow";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import USDC from "../../public/logos/usd-coin.png";
import Link from "next/link";

interface VaultReAllocationProps {
  reallocations: ReAllocation[];
  visibleColumns: { id: string; name: string; visible: boolean }[];
}
const allReAllocationColumns = [
  { id: "timestamp", name: "Date & Time", visible: true },
  { id: "user", name: "User", visible: true },
  { id: "hash", name: "Hash", visible: true },
  { id: "type", name: "Type", visible: true },
];

export function VaultReAllocation({
  reallocations,
  visibleColumns,
}: VaultReAllocationProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVaults = reallocations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(reallocations.length / itemsPerPage);

  // Helper function to render cell content based on column ID
  const renderCellContent = (allocation: ReAllocation, columnId: string) => {
    switch (columnId) {
      case "timestamp":
        return allocation.timestamp;
      case "user":
        return (
          <div className="flex items-center gap-2">
            <Image
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4IDgiIHNoYXBlLXJlbmRlcmluZz0ib3B0aW1pemVTcGVlZCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij48cGF0aCBmaWxsPSJoc2woMTM2IDk4JSAzOSUpIiBkPSJNMCwwSDhWOEgweiIvPjxwYXRoIGZpbGw9ImhzbCgzNTEgNzklIDM4JSkiIGQ9Ik0xLDBoMXYxaC0xek02LDBoMXYxaC0xek0yLDBoMXYxaC0xek01LDBoMXYxaC0xek0zLDBoMXYxaC0xek00LDBoMXYxaC0xek0xLDJoMXYxaC0xek02LDJoMXYxaC0xek0xLDNoMXYxaC0xek02LDNoMXYxaC0xek0yLDNoMXYxaC0xek01LDNoMXYxaC0xek0zLDNoMXYxaC0xek00LDNoMXYxaC0xek0xLDRoMXYxaC0xek02LDRoMXYxaC0xek0zLDRoMXYxaC0xek00LDRoMXYxaC0xek0xLDVoMXYxaC0xek02LDVoMXYxaC0xek0yLDVoMXYxaC0xek01LDVoMXYxaC0xek0zLDZoMXYxaC0xek00LDZoMXYxaC0xek0xLDdoMXYxaC0xek02LDdoMXYxaC0xeiIvPjxwYXRoIGZpbGw9ImhzbCgyNDMgNTAlIDcyJSkiIGQ9Ik0yLDFoMXYxaC0xek01LDFoMXYxaC0xek0wLDJoMXYxaC0xek03LDJoMXYxaC0xek0yLDJoMXYxaC0xek01LDJoMXYxaC0xek0zLDVoMXYxaC0xek00LDVoMXYxaC0xek0xLDZoMXYxaC0xek02LDZoMXYxaC0xeiIvPjwvc3ZnPg=="
              className="w-[17px] h-[17px] rounded-full"
              width={17}
              height={17}
              alt="user"
            />
            <div>{shortenAddress(allocation.user)}</div>
            <div>
              <RightArrow
                className="rotate-135 text-[#FFFFFF99]"
                width="13px"
                height="13px"
              />
            </div>
          </div>
        );
      case "hash":
        return (
          <Link
            href={`https://basescan.org/tx/${allocation.hash}`}
            target="_blank"
          >
            <div className="flex items-center gap-2">
              {shortenAddress(allocation.hash)}
              <RightArrow
                className="rotate-135 text-[#FFFFFF99]"
                width="13px"
                height="13px"
              />
            </div>
          </Link>
        );
      case "amount":
        return (
          allocation.amount.toLocaleString("en-US") +
            " " +
            allocation.currency || "—"
        );
      case "currency":
        return allocation.currency || "—";
      case "type":
        return allocation.type || "—";
      case "market":
        return (
          <div className="flex items-center gap-2">
            <Image src={USDC} alt="currency" width={21} height={21} />
            <div>{allocation.market}</div>
            <span>(LLTV {allocation.letv}%)</span>
            <div>
              <RightArrow
                className="rotate-135 text-[#FFFFFF]"
                width="11px"
                height="11px"
              />
            </div>
          </div>
        );
      default:
        return "—";
    }
  };

  // Calculate colSpan dynamically based on your visible logic
  const columnCount = allReAllocationColumns.filter((column) => {
    return (
      visibleColumns.filter(
        (_column) => _column.id === column.id && _column.visible
      ).length > 0 ||
      (column.id !== "timestamp" && column.id !== "market")
    );
  }).length;

  return (
    <>
      <Card className="bg-foreground border-none rounded-[8px] mt-4 py-0 rouneded-[8px]">
        <CardContent className="p-0 overflow-x-auto rouneded-[8px]">
          <Table className="rouneded-[16px]">
            <TableHeader className="bg-foreground">
              <TableRow className="hover:bg-transparent border-[#afafaf1a] h-[44px]">
                {allReAllocationColumns.map((column) => {
                  return visibleColumns.filter(
                    (_column) => _column.id === column.id && _column.visible
                  ).length > 0 ||
                    (column.id !== "timestamp" && column.id !== "market") ? (
                    <TableHead
                      key={column.id}
                      className={cn(
                        "text-secondary text-[13px] pl-[20px] pr-[72px]",
                        column.id === "percentage" && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {t("table." + column.id)}
                        {column.id === "percentage" && (
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
                  ) : (
                    <></>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentVaults.length === 0 ? (
                <TableRow className="hover:bg-transparent border-[#afafaf1a]">
                  <TableCell
                    colSpan={columnCount}
                    className="h-[150px] text-center"
                  >
                    <div className="flex flex-col items-center justify-center h-full text-muted text-[13px]">
                      Data Coming in v0.8
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentVaults.map((allocation) => (
                  <TableRow
                    key={allocation.id}
                    className="border-[#afafaf1a] hover:bg-foreground/50 h-[54px] text-[13px]"
                  >
                    {allReAllocationColumns.map((column, index) => {
                      return visibleColumns.filter(
                        (_column) => _column.id === column.id && _column.visible
                      ).length > 0 ||
                        (column.id !== "timestamp" &&
                          column.id !== "market") ? (
                        <TableCell
                          className="pl-[20px] text-card pr-18"
                          key={`${allocation.id}-${index}`}
                        >
                          {renderCellContent(allocation, column.id)}
                        </TableCell>
                      ) : (
                        <></>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {reallocations.length > 0 && (
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