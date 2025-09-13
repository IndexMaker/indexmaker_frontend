"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { VaultDocument } from "@/lib/types/vault";
import { useCallback, useState } from "react";
import axios from "axios";
import { Spinner } from "@/components/elements/spinner";
import { cn } from "@/lib/utils";
import { downloadDailyPriceData, downloadRebalanceData } from "@/server/indices";

interface VaultLiteratureProps {
  literature: VaultDocument[];
  rebalanceData: any[];
  indexId: number;
  indexName?: string;
}

export function VaultLiteratureSection({
  literature,
  rebalanceData,
  indexId,
  indexName,
}: VaultLiteratureProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPriceDownloading, setIsPriceDownloading] = useState<boolean>(false);
  if (literature.length === 0) {
    return (
      <div className="bg-foreground rounded-lg p-6 border border-[#afafaf1a] text-center">
        <p className="text-zinc-400">No literature available for this vault.</p>
      </div>
    );
  }

  const _downloadRebalanceData = useCallback(async () => {
    if (!indexId) return;
    setIsLoading(true);
    await downloadRebalanceData(indexId);
    setIsLoading(false);
  }, [indexId]);

  const _downloadDailyPriceData = useCallback(async () => {
    if (!indexId) return;
    setIsPriceDownloading(true);
    await downloadDailyPriceData(indexId);
    setIsPriceDownloading(false);
  }, [indexId]);

  return (
    <div className="p-[10px] md:p-5 bg-foreground">
      <div className="grid custom-3xl-grid gap-x-8 gap-y-6">
        {literature.map((doc) => (
          <Link
            key={doc.id}
            href={`${process.env.NEXT_PUBLIC_BACKEND_API}/${doc.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-3 items-center opacity-80 hover:opacity-100 transition-opacity"
          >
            <div className="flex-shrink-0 w-12 h-14 border border-muted rounded-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-b border-r border-muted rounded-br-sm"></div>
              <FileText className="absolute bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 text-secondary" />
            </div>
            <div className="pt-0 h-full">
              <h3 className="h-full text-secondary text-[12px] font-normal group-hover:text-primary transition-colors leading-[16px] overflow-hidden text-ellipsis whitespace-normal line-clamp-3 flex flex-col gap-2 justify-between">
                <span className="text-[13px] text-primary">{doc.name}</span>
                <span className="text-[11px] overflow-ellipsis w-full whitespace-nowrap">
                  {doc.description}
                </span>
              </h3>
            </div>
          </Link>
        ))}

        {rebalanceData && rebalanceData.length > 0 && (
          <>
            <Link
              key={"rebalanceData"}
              href={"#"}
              rel="noopener noreferrer"
              className={cn(
                "group flex gap-3 items-center opacity-80 hover:opacity-100 transition-opacity",
                isLoading ? "disabled" : ""
              )}
              onClick={(e) => {
                e.preventDefault(); // Prevent default navigation
                _downloadRebalanceData(); // Call your function
              }}
            >
              <div className="flex-shrink-0 w-12 h-14 border border-muted rounded-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-4 h-4 border-b border-r border-muted rounded-br-sm"></div>
                {isLoading ? (
                  <Spinner className="absolute bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 text-secondary" />
                ) : (
                  <FileText className="absolute bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 text-secondary" />
                )}
              </div>
              <div className="pt-0">
                <h3 className="h-full text-secondary text-[12px] font-normal group-hover:text-primary transition-colors leading-[16px] overflow-hidden text-ellipsis whitespace-normal line-clamp-3 flex flex-col gap-2 justify-between">
                  <span className="text-[13px] text-primary">
                    {isLoading ? "Downloading..." : "Download Rebalance Data"}
                  </span>
                  <span className="text-[11px]"></span>
                </h3>
              </div>
            </Link>
            <Link
              key={"dailyPrices"}
              href={"#"}
              rel="noopener noreferrer"
              className={cn(
                "group flex gap-3 items-center opacity-80 hover:opacity-100 transition-opacity",
                isPriceDownloading ? "disabled" : ""
              )}
              onClick={(e) => {
                e.preventDefault(); // Prevent default navigation
                _downloadDailyPriceData(); // Call your function
              }}
            >
              <div className="flex-shrink-0 w-12 h-14 border border-muted rounded-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-4 h-4 border-b border-r border-muted rounded-br-sm"></div>
                {isPriceDownloading ? (
                  <Spinner className="absolute bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 text-secondary" />
                ) : (
                  <FileText className="absolute bottom-2 left-1/2 transform -translate-x-1/2 h-6 w-6 text-secondary" />
                )}
              </div>
              <div className="pt-0">
                <h3 className="h-full text-secondary text-[12px] font-normal group-hover:text-primary transition-colors leading-[16px] overflow-hidden text-ellipsis whitespace-normal line-clamp-3 flex flex-col gap-2 justify-between">
                  <span className="text-[13px] text-primary">
                    {isPriceDownloading
                      ? "Downloading..."
                      : "Download Daily Prices"}
                  </span>
                  <span className="text-[11px]"></span>
                </h3>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
