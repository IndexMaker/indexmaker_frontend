"use client";

import { useMemo, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import zoomPlugin from "chartjs-plugin-zoom";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, ZoomOut } from "lucide-react";
import type { TransformedChartData } from "@/hooks/useKeeperChartData";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  zoomPlugin
);

interface KeeperActivityChartProps {
  chartData: TransformedChartData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

export function KeeperActivityChart({
  chartData,
  isLoading,
  error,
  onRefresh,
}: KeeperActivityChartProps) {
  const chartRef = useRef<any>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const chartColors = useMemo(
    () => ({
      acquisition1: isDark ? "#10b981" : "#059669", // Green
      acquisition2: isDark ? "#34d399" : "#10b981", // Lighter green
      disposal1: isDark ? "#f97316" : "#ea580c", // Orange
      disposal2: isDark ? "#fb923c" : "#f97316", // Lighter orange
      grid: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      text: isDark ? "#d0cece" : "#374151",
    }),
    [isDark]
  );

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const data = useMemo(() => {
    if (!chartData) return null;

    return {
      datasets: [
        {
          label: "Acquisition (Value 1)",
          data: chartData.acquisitionLine1,
          borderColor: chartColors.acquisition1,
          backgroundColor: `${chartColors.acquisition1}20`,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          fill: false,
        },
        {
          label: "Acquisition (Value 2)",
          data: chartData.acquisitionLine2,
          borderColor: chartColors.acquisition2,
          backgroundColor: `${chartColors.acquisition2}20`,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          fill: false,
        },
        {
          label: "Disposal (Value 1)",
          data: chartData.disposalLine1,
          borderColor: chartColors.disposal1,
          backgroundColor: `${chartColors.disposal1}20`,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          fill: false,
        },
        {
          label: "Disposal (Value 2)",
          data: chartData.disposalLine2,
          borderColor: chartColors.disposal2,
          backgroundColor: `${chartColors.disposal2}20`,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          fill: false,
        },
      ],
    };
  }, [chartData, chartColors]);

  const options: any = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "hour",
            tooltipFormat: "dd MMM yyyy HH:mm",
            displayFormats: {
              hour: "HH:mm",
              day: "MMM dd",
            },
          },
          grid: {
            display: false,
          },
          ticks: {
            color: chartColors.text,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Claimable Value",
            color: chartColors.text,
          },
          grid: {
            color: chartColors.grid,
          },
          ticks: {
            color: chartColors.text,
            callback: (value: number) => {
              if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
              if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
              if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
              return value.toString();
            },
          },
        },
      },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: chartColors.text,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: isDark ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.95)",
          titleColor: isDark ? "#fff" : "#000",
          bodyColor: isDark ? "#d0cece" : "#374151",
          borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            title: (ctx: any) => {
              if (ctx[0]?.parsed?.x) {
                return new Date(ctx[0].parsed.x).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });
              }
              return "";
            },
            label: (ctx: any) => {
              const value = ctx.parsed.y;
              let formattedValue: string;
              if (value >= 1e9) formattedValue = `${(value / 1e9).toFixed(2)}B`;
              else if (value >= 1e6) formattedValue = `${(value / 1e6).toFixed(2)}M`;
              else if (value >= 1e3) formattedValue = `${(value / 1e3).toFixed(2)}K`;
              else formattedValue = value.toLocaleString();
              return `${ctx.dataset.label}: ${formattedValue}`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true,
            },
            mode: "x" as const,
          },
          pan: {
            enabled: true,
            mode: "x" as const,
          },
        },
      },
    }),
    [chartColors, isDark]
  );

  if (isLoading) {
    return (
      <div className="w-full h-96">
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-accent rounded-lg">
        <p className="text-destructive mb-4">{error}</p>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (!chartData || !data) {
    return (
      <div className="flex items-center justify-center h-96 bg-accent rounded-lg">
        <p className="text-muted-foreground">
          No data available for the selected keeper and time range.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetZoom}
          className="h-8 px-2"
          title="Reset zoom"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8 px-2"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="w-full h-96">
        <Line ref={chartRef} data={data} options={options} />
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Scroll to zoom, drag to pan. Use the zoom out button to reset.
      </p>
    </div>
  );
}
