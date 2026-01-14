"use client";

import { useCallback, useEffect, useState } from "react";

export interface KeeperDataPoint {
  timestamp: string;
  acquisition: { value1: string; value2: string };
  disposal: { value1: string; value2: string };
}

export interface KeeperHistoryResponse {
  keeper_address: string;
  data: KeeperDataPoint[];
  total_records: number;
  time_range: { start: string; end: string } | null;
}

export interface ChartDataPoint {
  x: Date;
  y: number;
}

export interface TransformedChartData {
  acquisitionLine1: ChartDataPoint[];
  acquisitionLine2: ChartDataPoint[];
  disposalLine1: ChartDataPoint[];
  disposalLine2: ChartDataPoint[];
}

interface UseKeeperChartDataOptions {
  keeperAddress: string;
  startDate?: string;
  endDate?: string;
  refreshInterval?: number;
}

interface UseKeeperChartDataResult {
  data: KeeperHistoryResponse | null;
  chartData: TransformedChartData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function transformForChart(data: KeeperDataPoint[]): TransformedChartData {
  return {
    acquisitionLine1: data.map((d) => ({
      x: new Date(d.timestamp),
      y: Number(d.acquisition.value1),
    })),
    acquisitionLine2: data.map((d) => ({
      x: new Date(d.timestamp),
      y: Number(d.acquisition.value2),
    })),
    disposalLine1: data.map((d) => ({
      x: new Date(d.timestamp),
      y: Number(d.disposal.value1),
    })),
    disposalLine2: data.map((d) => ({
      x: new Date(d.timestamp),
      y: Number(d.disposal.value2),
    })),
  };
}

export function useKeeperChartData({
  keeperAddress,
  startDate,
  endDate,
  refreshInterval,
}: UseKeeperChartDataOptions): UseKeeperChartDataResult {
  const [data, setData] = useState<KeeperHistoryResponse | null>(null);
  const [chartData, setChartData] = useState<TransformedChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!keeperAddress || keeperAddress === "all") {
      // For aggregated data, we would need to fetch all keepers and combine
      // For now, skip if "all" is selected
      setData(null);
      setChartData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API;
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const queryString = params.toString();
      const url = `${apiBase}/api/keeper-charts/${keeperAddress}/history${
        queryString ? `?${queryString}` : ""
      }`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch keeper data: ${res.status}`);
      }

      const responseData: KeeperHistoryResponse = await res.json();
      setData(responseData);

      if (responseData.data.length > 0) {
        setChartData(transformForChart(responseData.data));
      } else {
        setChartData(null);
      }
    } catch (err) {
      console.error("Error fetching keeper chart data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      setData(null);
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  }, [keeperAddress, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    chartData,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Hook for fetching aggregated data from all keepers
export function useAllKeepersChartData({
  startDate,
  endDate,
  refreshInterval,
}: Omit<UseKeeperChartDataOptions, "keeperAddress">): UseKeeperChartDataResult {
  const [data, setData] = useState<KeeperHistoryResponse | null>(null);
  const [chartData, setChartData] = useState<TransformedChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_BACKEND_API;

      // First get all keepers
      const allKeepersRes = await fetch(`${apiBase}/api/keeper-charts/all`);
      if (!allKeepersRes.ok) {
        throw new Error(`Failed to fetch keepers: ${allKeepersRes.status}`);
      }
      const allKeepers = await allKeepersRes.json();

      if (allKeepers.keepers.length === 0) {
        setData(null);
        setChartData(null);
        setIsLoading(false);
        return;
      }

      // Fetch history for each keeper and aggregate
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      const queryString = params.toString();

      const historyPromises = allKeepers.keepers.map(
        async (keeper: { keeper_address: string }) => {
          const url = `${apiBase}/api/keeper-charts/${keeper.keeper_address}/history${
            queryString ? `?${queryString}` : ""
          }`;
          const res = await fetch(url);
          if (!res.ok) return null;
          return res.json();
        }
      );

      const histories = await Promise.all(historyPromises);
      const validHistories = histories.filter(
        (h): h is KeeperHistoryResponse => h !== null && h.data.length > 0
      );

      if (validHistories.length === 0) {
        setData(null);
        setChartData(null);
        setIsLoading(false);
        return;
      }

      // Aggregate data by timestamp
      const aggregatedByTimestamp = new Map<string, KeeperDataPoint>();

      for (const history of validHistories) {
        for (const point of history.data) {
          const existing = aggregatedByTimestamp.get(point.timestamp);
          if (existing) {
            existing.acquisition.value1 = String(
              Number(existing.acquisition.value1) + Number(point.acquisition.value1)
            );
            existing.acquisition.value2 = String(
              Number(existing.acquisition.value2) + Number(point.acquisition.value2)
            );
            existing.disposal.value1 = String(
              Number(existing.disposal.value1) + Number(point.disposal.value1)
            );
            existing.disposal.value2 = String(
              Number(existing.disposal.value2) + Number(point.disposal.value2)
            );
          } else {
            aggregatedByTimestamp.set(point.timestamp, {
              timestamp: point.timestamp,
              acquisition: { ...point.acquisition },
              disposal: { ...point.disposal },
            });
          }
        }
      }

      const aggregatedData = Array.from(aggregatedByTimestamp.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const aggregatedResponse: KeeperHistoryResponse = {
        keeper_address: "all",
        data: aggregatedData,
        total_records: aggregatedData.length,
        time_range:
          aggregatedData.length > 0
            ? {
                start: aggregatedData[0].timestamp,
                end: aggregatedData[aggregatedData.length - 1].timestamp,
              }
            : null,
      };

      setData(aggregatedResponse);
      setChartData(transformForChart(aggregatedData));
    } catch (err) {
      console.error("Error fetching aggregated keeper data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      setData(null);
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    data,
    chartData,
    isLoading,
    error,
    refetch: fetchData,
  };
}
