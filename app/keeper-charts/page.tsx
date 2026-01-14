"use client";

import { Suspense, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeeperSelector } from "@/components/elements/keeper-selector";
import { TimeRangeSelector } from "@/components/elements/time-range-selector";
import { KeeperActivityChart } from "@/components/elements/keeper-activity-chart";
import { KeeperStatsSummary } from "@/components/elements/keeper-stats-summary";
import {
  useKeeperChartData,
  useAllKeepersChartData,
} from "@/hooks/useKeeperChartData";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

function KeeperChartsPageContent() {
  const [selectedKeeper, setSelectedKeeper] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<{
    startDate: string | undefined;
    endDate: string | undefined;
  }>({ startDate: undefined, endDate: undefined });

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Keeper Charts</h1>
            <p className="text-sm text-gray-600">
              Monitor Keeper acquisition and disposal activity over time
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">
                Keeper
              </label>
              <KeeperSelector
                selectedKeeper={selectedKeeper}
                onKeeperChange={setSelectedKeeper}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">
                Time Range
              </label>
              <TimeRangeSelector onTimeRangeChange={setTimeRange} />
            </div>
          </div>
        </div>

        {/* Statistics Summary */}
        <KeeperStatsSummary
          data={activeData.data}
          isLoading={activeData.isLoading}
        />

        {/* Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activity Over Time</h3>
            {activeData.data && (
              <span className="text-sm text-gray-500">
                {activeData.data.total_records} data points
              </span>
            )}
          </div>
          <KeeperActivityChart
            chartData={activeData.chartData}
            isLoading={activeData.isLoading}
            error={activeData.error}
            onRefresh={activeData.refetch}
          />
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Understanding the Data</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-green-600 font-semibold mb-2">
                Acquisition (Green Lines)
              </h4>
              <p className="text-sm text-gray-600">
                Shows how the Keeper realizes new orders. The two values
                represent different aspects of the acquisition process from the{" "}
                <code className="text-xs bg-gray-100 text-gray-800 px-1 rounded">
                  getClaimableAcquisition
                </code>{" "}
                method.
              </p>
            </div>
            <div>
              <h4 className="text-orange-600 font-semibold mb-2">
                Disposal (Orange Lines)
              </h4>
              <p className="text-sm text-gray-600">
                Shows how often users claim ITP/Withdrawals. The two values
                represent different aspects of the disposal process from the{" "}
                <code className="text-xs bg-gray-100 text-gray-800 px-1 rounded">
                  getClaimableDisposal
                </code>{" "}
                method.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeeperChartsPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[300px]" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function KeeperChartsPage() {
  return (
    <Suspense fallback={<KeeperChartsPageSkeleton />}>
      <KeeperChartsPageContent />
    </Suspense>
  );
}
