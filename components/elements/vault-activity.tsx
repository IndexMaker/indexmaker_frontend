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
import { Button } from "../ui/button";
import LeftArrow from "../icons/left-arrow";
import RightArrow from "../icons/right-arrow";
import { Activity, transactionTypes } from "@/lib/data";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";

interface VaultActivityProps {
  activities: Activity[];
  visibleColumns: { id: string; name: string; visible: boolean }[];
}
const allActivityColumns = [
  { id: "dateTime", name: "Date & Time", visible: true },
  { id: "wallet", name: "User", visible: true },
  { id: "hash", name: "Hash", visible: true },
  { id: "transactionType", name: "Transaction Type", visible: true },
  { id: "amount", name: "Amount", visible: true },
];

export function VaultActivity({
  activities,
  visibleColumns,
}: VaultActivityProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentActivities = activities.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(activities.length / itemsPerPage);

  // Helper function to render cell content based on column ID
  const renderCellContent = (activity: Activity, columnId: string) => {
    switch (columnId) {
      case "dateTime":
        return activity.dateTime;
      case "wallet":
        return (
          <div className="flex items-center gap-2">
            <Image
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4IDgiIHNoYXBlLXJlbmRlcmluZz0ib3B0aW1pemVTcGVlZCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij48cGF0aCBmaWxsPSJoc2woMTM2IDk4JSAzOSUpIiBkPSJNMCwwSDhWOEgweiIvPjxwYXRoIGZpbGw9ImhzbCgzNTEgNzklIDM4JSkiIGQ9Ik0xLDBoMXYxaC0xek02LDBoMXYxaC0xek0yLDBoMXYxaC0xek01LDBoMXYxaC0xek0zLDBoMXYxaC0xek00LDBoMXYxaC0xek0xLDJoMXYxaC0xek02LDJoMXYxaC0xek0xLDNoMXYxaC0xek02LDNoMXYxaC0xek0yLDNoMXYxaC0xek01LDNoMXYxaC0xek0zLDNoMXYxaC0xek00LDNoMXYxaC0xek0xLDRoMXYxaC0xek02LDRoMXYxaC0xek0zLDRoMXYxaC0xek00LDRoMXYxaC0xek0xLDVoMXYxaC0xek02LDVoMXYxaC0xek0yLDVoMXYxaC0xek01LDVoMXYxaC0xek0zLDZoMXYxaC0xek00LDZoMXYxaC0xek0xLDdoMXYxaC0xek02LDdoMXYxaC0xeiIvPjxwYXRoIGZpbGw9ImhzbCgyNDMgNTAlIDcyJSkiIGQ9Ik0yLDFoMXYxaC0xek01LDFoMXYxaC0xek0wLDJoMXYxaC0xek03LDJoMXYxaC0xek0yLDJoMXYxaC0xek01LDJoMXYxaC0xek0zLDVoMXYxaC0xek00LDVoMXYxaC0xek0xLDZoMXYxaC0xek02LDZoMXYxaC0xeiIvPjwvc3ZnPg=="
              className="w-[17px] h-[17px] rounded-full"
              width={17}
              height={17}
              alt="user"
            />
            <div>{shortenAddress(activity.wallet)}</div>
            <div>
              <Link
                href={`https://basescan.org/address/${activity.wallet}`}
                target="_blank"
              >
                <RightArrow
                  className="rotate-135 text-muted"
                  width="13px"
                  height="13px"
                />
              </Link>
            </div>
          </div>
        );
      case "hash":
        return (
          <div className="flex items-center gap-2">
            <div>{shortenAddress(activity.hash)}</div>
            <a
              // href={`https://basescan.org/tx/${activity.hash}`}
              target="_blank"
            >
              <RightArrow
                className="rotate-135 text-muted"
                width="13px"
                height="13px"
              />
            </a>
          </div>
        );
      case "transactionType":
        return (
          transactionTypes.filter(
            (type) => type.id === activity.transactionType
          )[0]?.name || activity.transactionType
        );
      case "amount":
        return (
          <div className="flex items-center gap-2">
            <div>
              {activity.amount.amount.toLocaleString("en-US")}{" "}
              {activity.amount.currency}
            </div>
            <div className="px-[2px] py-1 rounded-[4px] bg-accent text-secondary text-[11px] flex items-center">
              {activity.amount.amountSummary}
            </div>
          </div>
        );
      default:
        return "—";
    }
  };

  return (
    <>
      <Card className="bg-foreground border-none rounded-[8px] mt-4 py-0 rouneded-[8px]">
        <CardContent className="p-0 overflow-x-auto rouneded-[8px]">
          <Table className="rouneded-[16px]">
            <TableHeader className="bg-foreground">
              <TableRow className="hover:bg-transparent border-accent h-[44px]">
                {allActivityColumns.map((column) => {
                  return visibleColumns.filter(
                    (_column) => _column.id === column.id && _column.visible
                  ).length > 0 ? (
                    <TableHead
                      key={column.id}
                      className={cn(
                        "text-secondary text-[11px] pl-[20px] pr-[72px]",
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
                            className="text-accent"
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
              {currentActivities.length === 0 ? (
                <TableRow className="hover:bg-transparent border-accent">
                  <TableCell
                    colSpan={visibleColumns.filter((c) => c.visible).length}
                    className="h-[120px] text-center"
                  >
                    <div className="flex flex-col items-center justify-center h-full text-muted text-[13px]">
                      Data Coming in v0.8
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentActivities.map((activity) => (
                  <TableRow
                    key={activity.id}
                    className="border-accent hover:bg-foreground/50 h-[54px] text-[13px]"
                  >
                    {allActivityColumns.map((column, index) => {
                      const isVisible = visibleColumns.some(
                        (_column) => _column.id === column.id && _column.visible
                      );
                      return isVisible ? (
                        <TableCell
                          className="pl-[20px] text-card pr-18"
                          key={`${activity.id}-${index}`}
                        >
                          {renderCellContent(activity, column.id)}
                        </TableCell>
                      ) : null;
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Only show pagination if there is actually data */}
      {activities.length > 0 && (
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