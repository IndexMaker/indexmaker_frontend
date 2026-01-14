"use client";

import { Suspense, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { KeeperSelector } from "@/components/elements/keeper-selector";
import { TimeRangeSelector, TimeRangePreset } from "@/components/elements/time-range-selector";
import { KeeperActivityChart } from "@/components/elements/keeper-activity-chart";
import { KeeperStatsSummary } from "@/components/elements/keeper-stats-summary";
import {
  useKeeperChartData,
  useAllKeepersChartData,
} from "@/hooks/useKeeperChartData";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { useLanguage } from "@/contexts/language-context";

const REFRESH_INTERVAL = 30 * 1000; // 30 seconds

function KeeperChartsPageContent() {
  const { t } = useLanguage();
  const [selectedKeeper, setSelectedKeeper] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<{
    startDate: string | undefined;
    endDate: string | undefined;
    preset: TimeRangePreset;
  }>({ startDate: undefined, endDate: undefined, preset: "30d" });

  // Use the appropriate hook based on selection
  const singleKeeperData = useKeeperChartData({
    keeperAddress: selectedKeeper,
    startDate: timeRange.startDate,
    endDate: timeRange.endDate,
    refreshInterval: REFRESH_INTERVAL,
  });

  const allKeepersData = useAllKeepersChartData({
    startDate: timeRange.startDate,
    endDate: timeRange.endDate,
    refreshInterval: REFRESH_INTERVAL,
  });

  // Select the appropriate data based on keeper selection
  const activeData = useMemo(() => {
    if (selectedKeeper === "all") {
      return allKeepersData;
    }
    return singleKeeperData;
  }, [selectedKeeper, allKeepersData, singleKeeperData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{t("keeperCharts.title")}</h1>
          <p className="text-sm text-secondary">
            {t("keeperCharts.subtitle")}
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-4">{t("keeperCharts.filters")}</h3>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">
                {t("keeperCharts.keeper")}
              </label>
              <KeeperSelector
                selectedKeeper={selectedKeeper}
                onKeeperChange={setSelectedKeeper}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">
                {t("keeperCharts.timeRange")}
              </label>
              <TimeRangeSelector onTimeRangeChange={setTimeRange} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <KeeperStatsSummary
        data={activeData.data}
        isLoading={activeData.isLoading}
      />

      {/* Chart */}
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">{t("keeperCharts.activityOverTime")}</h3>
            {activeData.data && (
              <span className="text-sm text-secondary">
                {activeData.data.total_records} {t("keeperCharts.dataPointsLabel")}
              </span>
            )}
          </div>
          <KeeperActivityChart
            chartData={activeData.chartData}
            isLoading={activeData.isLoading}
            error={activeData.error}
            onRefresh={activeData.refetch}
            timeRangePreset={timeRange.preset}
          />
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-primary mb-4">{t("keeperCharts.understandingData")}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-green-600 dark:text-green-400 font-semibold mb-2">
                {t("keeperCharts.acquisition")} (Green Lines)
              </h4>
              <p className="text-sm text-secondary">
                {t("keeperCharts.acquisitionDesc")}
              </p>
            </div>
            <div>
              <h4 className="text-orange-600 dark:text-orange-400 font-semibold mb-2">
                {t("keeperCharts.disposal")} (Orange Lines)
              </h4>
              <p className="text-sm text-secondary">
                {t("keeperCharts.disposalDesc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KeeperChartsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Card className="bg-foreground border border-accent">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Card className="bg-foreground border border-accent">
        <CardContent className="pt-6">
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function KeeperChartsPage() {
  return (
    <Dashboard>
      <Suspense fallback={<KeeperChartsPageSkeleton />}>
        <KeeperChartsPageContent />
      </Suspense>
    </Dashboard>
  );
}
