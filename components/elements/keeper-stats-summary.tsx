"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KeeperHistoryResponse } from "@/hooks/useKeeperChartData";

interface KeeperStatsSummaryProps {
  data: KeeperHistoryResponse | null;
  isLoading: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

function StatCard({ title, value, subValue, trend, trendValue }: StatCardProps) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
        {trend && trendValue && (
          <div
            className={cn(
              "flex items-center text-xs mt-1",
              trend === "up" && "text-green-500",
              trend === "down" && "text-red-500",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" && <ArrowUpIcon className="h-3 w-3 mr-1" />}
            {trend === "down" && <ArrowDownIcon className="h-3 w-3 mr-1" />}
            {trend === "neutral" && <MinusIcon className="h-3 w-3 mr-1" />}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatValue(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString();
}

function calculateTrend(
  current: number,
  previous: number
): { trend: "up" | "down" | "neutral"; value: string } {
  if (previous === 0) {
    return { trend: "neutral", value: "No previous data" };
  }
  const percentChange = ((current - previous) / previous) * 100;
  if (Math.abs(percentChange) < 0.01) {
    return { trend: "neutral", value: "No change" };
  }
  return {
    trend: percentChange > 0 ? "up" : "down",
    value: `${Math.abs(percentChange).toFixed(2)}% vs previous`,
  };
}

export function KeeperStatsSummary({ data, isLoading }: KeeperStatsSummaryProps) {
  const stats = useMemo(() => {
    if (!data || data.data.length === 0) return null;

    const latestPoint = data.data[data.data.length - 1];
    const previousPoint = data.data.length > 1 ? data.data[data.data.length - 2] : null;

    const latestAcq1 = Number(latestPoint.acquisition.value1);
    const latestAcq2 = Number(latestPoint.acquisition.value2);
    const latestDisp1 = Number(latestPoint.disposal.value1);
    const latestDisp2 = Number(latestPoint.disposal.value2);

    const prevAcq1 = previousPoint ? Number(previousPoint.acquisition.value1) : 0;
    const prevAcq2 = previousPoint ? Number(previousPoint.acquisition.value2) : 0;
    const prevDisp1 = previousPoint ? Number(previousPoint.disposal.value1) : 0;
    const prevDisp2 = previousPoint ? Number(previousPoint.disposal.value2) : 0;

    // Calculate averages across the time range
    let sumAcq1 = 0,
      sumAcq2 = 0,
      sumDisp1 = 0,
      sumDisp2 = 0;
    for (const point of data.data) {
      sumAcq1 += Number(point.acquisition.value1);
      sumAcq2 += Number(point.acquisition.value2);
      sumDisp1 += Number(point.disposal.value1);
      sumDisp2 += Number(point.disposal.value2);
    }
    const count = data.data.length;

    return {
      totalRecords: data.total_records,
      latestAcquisition: {
        value1: latestAcq1,
        value2: latestAcq2,
        total: latestAcq1 + latestAcq2,
      },
      latestDisposal: {
        value1: latestDisp1,
        value2: latestDisp2,
        total: latestDisp1 + latestDisp2,
      },
      avgAcquisition: {
        value1: sumAcq1 / count,
        value2: sumAcq2 / count,
        total: (sumAcq1 + sumAcq2) / count,
      },
      avgDisposal: {
        value1: sumDisp1 / count,
        value2: sumDisp2 / count,
        total: (sumDisp1 + sumDisp2) / count,
      },
      acqTrend: calculateTrend(latestAcq1 + latestAcq2, prevAcq1 + prevAcq2),
      dispTrend: calculateTrend(latestDisp1 + latestDisp2, prevDisp1 + prevDisp2),
      timeRange: data.time_range,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="flex-1 min-w-[140px]">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No statistics available. Select a keeper and time range to view data.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Latest Acquisition"
        value={formatValue(stats.latestAcquisition.total)}
        subValue={`V1: ${formatValue(stats.latestAcquisition.value1)} / V2: ${formatValue(stats.latestAcquisition.value2)}`}
        trend={stats.acqTrend.trend}
        trendValue={stats.acqTrend.value}
      />
      <StatCard
        title="Latest Disposal"
        value={formatValue(stats.latestDisposal.total)}
        subValue={`V1: ${formatValue(stats.latestDisposal.value1)} / V2: ${formatValue(stats.latestDisposal.value2)}`}
        trend={stats.dispTrend.trend}
        trendValue={stats.dispTrend.value}
      />
      <StatCard
        title="Avg Acquisition"
        value={formatValue(stats.avgAcquisition.total)}
        subValue={`Over ${stats.totalRecords} data points`}
      />
      <StatCard
        title="Avg Disposal"
        value={formatValue(stats.avgDisposal.total)}
        subValue={`Over ${stats.totalRecords} data points`}
      />
    </div>
  );
}
