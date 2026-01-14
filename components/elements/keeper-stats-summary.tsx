"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon, TrendingUp, TrendingDown, Activity, Clock, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
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
  icon?: React.ReactNode;
  highlight?: "green" | "orange" | "blue" | "purple";
}

function StatCard({ title, value, subValue, trend, trendValue, icon, highlight }: StatCardProps) {
  const highlightClasses = {
    green: "border-l-4 border-l-green-500",
    orange: "border-l-4 border-l-orange-500",
    blue: "border-l-4 border-l-blue-500",
    purple: "border-l-4 border-l-purple-500",
  };

  return (
    <Card className={cn(
      "flex-1 min-w-[140px] bg-foreground border border-accent",
      highlight && highlightClasses[highlight]
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-secondary flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {subValue && (
          <p className="text-xs text-secondary mt-1">{subValue}</p>
        )}
        {trend && trendValue && (
          <div
            className={cn(
              "flex items-center text-xs mt-1",
              trend === "up" && "text-green-500",
              trend === "down" && "text-red-500",
              trend === "neutral" && "text-secondary"
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

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function calculateChange(current: number, previous: number): { percent: number; trend: "up" | "down" | "neutral" } {
  if (previous === 0) {
    return { percent: 0, trend: "neutral" };
  }
  const percent = ((current - previous) / previous) * 100;
  if (Math.abs(percent) < 0.01) {
    return { percent: 0, trend: "neutral" };
  }
  return {
    percent,
    trend: percent > 0 ? "up" : "down",
  };
}

function getDataPointsInTimeRange(data: KeeperHistoryResponse["data"], hoursAgo: number) {
  const cutoffTime = Date.now() - hoursAgo * 60 * 60 * 1000;
  return data.filter(point => new Date(point.timestamp).getTime() >= cutoffTime);
}

export function KeeperStatsSummary({ data, isLoading }: KeeperStatsSummaryProps) {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    if (!data || data.data.length === 0) return null;

    const allData = data.data;
    const latestPoint = allData[allData.length - 1];

    // Get data for different time periods
    const data24h = getDataPointsInTimeRange(allData, 24);
    const data7d = getDataPointsInTimeRange(allData, 24 * 7);

    // Latest values
    const latestAcq = Number(latestPoint.acquisition.value1) + Number(latestPoint.acquisition.value2);
    const latestDisp = Number(latestPoint.disposal.value1) + Number(latestPoint.disposal.value2);

    // 24h ago values (first point in 24h range or earliest available)
    const point24hAgo = data24h.length > 0 ? data24h[0] : null;
    const acq24hAgo = point24hAgo
      ? Number(point24hAgo.acquisition.value1) + Number(point24hAgo.acquisition.value2)
      : 0;
    const disp24hAgo = point24hAgo
      ? Number(point24hAgo.disposal.value1) + Number(point24hAgo.disposal.value2)
      : 0;

    // 7d ago values
    const point7dAgo = data7d.length > 0 ? data7d[0] : null;
    const acq7dAgo = point7dAgo
      ? Number(point7dAgo.acquisition.value1) + Number(point7dAgo.acquisition.value2)
      : 0;
    const disp7dAgo = point7dAgo
      ? Number(point7dAgo.disposal.value1) + Number(point7dAgo.disposal.value2)
      : 0;

    // Calculate peaks (all-time high in the dataset)
    let peakAcq = 0, peakDisp = 0;
    let peakAcqTime = "", peakDispTime = "";

    for (const point of allData) {
      const acqTotal = Number(point.acquisition.value1) + Number(point.acquisition.value2);
      const dispTotal = Number(point.disposal.value1) + Number(point.disposal.value2);

      if (acqTotal > peakAcq) {
        peakAcq = acqTotal;
        peakAcqTime = point.timestamp;
      }
      if (dispTotal > peakDisp) {
        peakDisp = dispTotal;
        peakDispTime = point.timestamp;
      }
    }

    // Calculate averages
    let sumAcq = 0, sumDisp = 0;
    for (const point of allData) {
      sumAcq += Number(point.acquisition.value1) + Number(point.acquisition.value2);
      sumDisp += Number(point.disposal.value1) + Number(point.disposal.value2);
    }
    const avgAcq = sumAcq / allData.length;
    const avgDisp = sumDisp / allData.length;

    // Calculate velocity (change per hour over last 24h)
    const hoursIn24h = data24h.length > 1
      ? (new Date(data24h[data24h.length - 1].timestamp).getTime() - new Date(data24h[0].timestamp).getTime()) / (1000 * 60 * 60)
      : 1;
    const acqVelocity = hoursIn24h > 0 ? (latestAcq - acq24hAgo) / hoursIn24h : 0;
    const dispVelocity = hoursIn24h > 0 ? (latestDisp - disp24hAgo) / hoursIn24h : 0;

    return {
      totalRecords: data.total_records,
      // Latest values
      latestAcquisition: latestAcq,
      latestAcqValue1: Number(latestPoint.acquisition.value1),
      latestAcqValue2: Number(latestPoint.acquisition.value2),
      latestDisposal: latestDisp,
      latestDispValue1: Number(latestPoint.disposal.value1),
      latestDispValue2: Number(latestPoint.disposal.value2),
      // 24h changes
      change24hAcq: calculateChange(latestAcq, acq24hAgo),
      change24hDisp: calculateChange(latestDisp, disp24hAgo),
      // 7d changes
      change7dAcq: calculateChange(latestAcq, acq7dAgo),
      change7dDisp: calculateChange(latestDisp, disp7dAgo),
      // Peaks
      peakAcq,
      peakAcqTime,
      peakDisp,
      peakDispTime,
      // Averages
      avgAcq,
      avgDisp,
      // Velocity
      acqVelocity,
      dispVelocity,
      // Time range
      timeRange: data.time_range,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="flex-1 min-w-[140px] bg-foreground border border-accent">
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
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center text-secondary py-4">
        {t("keeperCharts.noStatsAvailable")}
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Current Values Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t("keeperCharts.latestAcquisition")}
          value={formatValue(stats.latestAcquisition)}
          subValue={`ITP: ${formatValue(stats.latestAcqValue1)} / USDC: ${formatValue(stats.latestAcqValue2)}`}
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          highlight="green"
        />
        <StatCard
          title={t("keeperCharts.latestDisposal")}
          value={formatValue(stats.latestDisposal)}
          subValue={`USDC: ${formatValue(stats.latestDispValue1)} / ITP: ${formatValue(stats.latestDispValue2)}`}
          icon={<TrendingDown className="h-4 w-4 text-orange-500" />}
          highlight="orange"
        />
        <StatCard
          title={t("keeperCharts.change24h")}
          value={formatPercent(stats.change24hAcq.percent)}
          subValue={t("keeperCharts.acquisition")}
          trend={stats.change24hAcq.trend}
          trendValue={`${t("keeperCharts.disposal")}: ${formatPercent(stats.change24hDisp.percent)}`}
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          highlight="blue"
        />
        <StatCard
          title={t("keeperCharts.change7d")}
          value={formatPercent(stats.change7dAcq.percent)}
          subValue={t("keeperCharts.acquisition")}
          trend={stats.change7dAcq.trend}
          trendValue={`${t("keeperCharts.disposal")}: ${formatPercent(stats.change7dDisp.percent)}`}
          icon={<Activity className="h-4 w-4 text-purple-500" />}
          highlight="purple"
        />
      </div>

      {/* Performance Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t("keeperCharts.peakAcquisition")}
          value={formatValue(stats.peakAcq)}
          subValue={formatTime(stats.peakAcqTime)}
          icon={<Target className="h-4 w-4 text-green-500" />}
        />
        <StatCard
          title={t("keeperCharts.peakDisposal")}
          value={formatValue(stats.peakDisp)}
          subValue={formatTime(stats.peakDispTime)}
          icon={<Target className="h-4 w-4 text-orange-500" />}
        />
        <StatCard
          title={t("keeperCharts.avgAcquisition")}
          value={formatValue(stats.avgAcq)}
          subValue={`${stats.totalRecords} ${t("keeperCharts.dataPoints")}`}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title={t("keeperCharts.avgDisposal")}
          value={formatValue(stats.avgDisp)}
          subValue={`${stats.totalRecords} ${t("keeperCharts.dataPoints")}`}
          icon={<Activity className="h-4 w-4" />}
        />
      </div>

      {/* Velocity Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t("keeperCharts.acqVelocity")}
          value={`${formatValue(Math.abs(stats.acqVelocity))}/h`}
          subValue={t("keeperCharts.rateOfChange")}
          trend={stats.acqVelocity >= 0 ? "up" : "down"}
          trendValue={stats.acqVelocity >= 0 ? t("keeperCharts.increasing") : t("keeperCharts.decreasing")}
          icon={<Zap className="h-4 w-4 text-green-500" />}
        />
        <StatCard
          title={t("keeperCharts.dispVelocity")}
          value={`${formatValue(Math.abs(stats.dispVelocity))}/h`}
          subValue={t("keeperCharts.rateOfChange")}
          trend={stats.dispVelocity >= 0 ? "up" : "down"}
          trendValue={stats.dispVelocity >= 0 ? t("keeperCharts.increasing") : t("keeperCharts.decreasing")}
          icon={<Zap className="h-4 w-4 text-orange-500" />}
        />
        <StatCard
          title={t("keeperCharts.dataPoints")}
          value={stats.totalRecords.toString()}
          subValue={stats.timeRange ? `${formatTime(stats.timeRange.start)} - ${formatTime(stats.timeRange.end)}` : "-"}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          title={t("keeperCharts.efficiency")}
          value={stats.latestDisposal > 0 ? (stats.latestAcquisition / stats.latestDisposal).toFixed(2) : "-"}
          subValue={t("keeperCharts.acqDispRatio")}
          trend={stats.latestAcquisition > stats.latestDisposal ? "up" : "down"}
          trendValue={stats.latestAcquisition > stats.latestDisposal ? t("keeperCharts.acqDominant") : t("keeperCharts.dispDominant")}
          icon={<Target className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
