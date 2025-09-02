"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useQuoteContext } from "@/contexts/quote-context";
import { useTheme } from "next-themes";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface ChartDataPoint {
  name: string;
  date: string;
  value: number;
  price?: number;
}

interface PerformanceChartProps {
  isLoading: boolean;
  data: ChartDataPoint[] | null;
  indexId: number;
  ticker: string;
  btcData: ChartDataPoint[];
  ethData: ChartDataPoint[];
  showComparison?: boolean;
  showETHComparison?: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  isLoading,
  data,
  indexId,
  ticker,
  btcData,
  ethData,
  showComparison = false,
  showETHComparison = false,
}) => {
  const chartRef = useRef<any>(null);
  const { indexPrices } = useQuoteContext();
  const [patchedData, setPatchedData] = useState<any[]>([]);
  const [pulsePoint, setPulsePoint] = useState(false);
  const { theme } = useTheme();
  useEffect(() => {
    const interval = setInterval(() => {
      chartRef.current?.update(); // Force redraw for blinking effect
    }, 1000); // ~10 FPS for visible blinking

    return () => clearInterval(interval);
  }, []);

  const normalizeData = (
    dataset: ChartDataPoint[],
    usePercentage: boolean,
    startDate?: Date | null
  ) => {
    if (dataset.length === 0) return [];
    const filteredData = startDate
      ? dataset.filter((item) => new Date(item.date) >= startDate)
      : dataset;

    if (filteredData.length === 0) return [];

    const firstValue = filteredData[0].price || filteredData[0].value;
    return filteredData.map((item) => ({
      x: new Date(item.date),
      y: usePercentage
        ? ((item.price || item.value) / firstValue - 1) * 100
        : item.price || item.value,
    }));
  };

  const getGradient = (ctx: CanvasRenderingContext2D, chartArea: any) => {
    const gradient = ctx.createLinearGradient(
      0,
      chartArea.bottom,
      0,
      chartArea.top
    );
    gradient.addColorStop(0, "rgba(0, 0, 255, 0.005)");
    gradient.addColorStop(1, "rgba(0, 0, 255, 0.1)");
    return gradient;
  };

  const chartPlugins = useMemo(() => {
    return [
      {
        id: "customGradient",
        beforeDraw(chart: any) {
          if (!showComparison) {
            const ctx = chart.ctx;
            const chartArea = chart.chartArea;
            if (!chartArea || !ctx) return;
            const gradient = getGradient(ctx, chartArea);
            chart.data.datasets[0].backgroundColor = gradient;
          }
        },
      },
      {
        id: "lastPriceFlasher",
        afterDatasetsDraw(chart: any) {
          if (showComparison || showETHComparison) return;

          const dataset = chart.data.datasets?.[0];
          if (!dataset) return;

          const meta = chart.getDatasetMeta(0);
          const lastIndex = dataset.data.length - 1;
          const point = meta?.data?.[lastIndex];

          if (
            !point ||
            typeof point.x !== "number" ||
            typeof point.y !== "number"
          )
            return;

          const ctx = chart.ctx;

          // Create flashing alpha based on current time
          const now = Date.now();
          const blinkAlpha = 0.5 + 0.5 * Math.sin((2 * Math.PI * now) / 1000); // 1s interval

          ctx.save();
          ctx.globalAlpha = blinkAlpha;
          ctx.fillStyle = theme === "dark" ? "#ff3a33" : "#ff3a33";

          // Draw flashing circle
          ctx.beginPath();
          ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        },
      },
    ];
  }, [showComparison, showETHComparison, theme]);
  const chartKey = `${showComparison}-${showETHComparison}-${theme}`;

  const indexNormalized = normalizeData(
    data || [],
    showComparison || showETHComparison
  );
  const indexStartDate =
    indexNormalized.length > 0 ? indexNormalized[0].x : null;

  const btcNormalized = showComparison
    ? normalizeData(btcData, true, indexStartDate)
    : [];

  const ethNormalized = showETHComparison
    ? normalizeData(ethData, true, indexStartDate)
    : [];

  // 🔁 Patch last point with live price
  useEffect(() => {
    if (!indexNormalized || indexNormalized.length === 0) return;

    const lastPrice = Number(indexPrices[ticker]);
    const updated = [...indexNormalized];

    if (!isNaN(lastPrice) && isFinite(lastPrice)) {
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        y:
          showComparison || showETHComparison
            ? data?.[0]?.price || data?.[0]?.value
              ? (lastPrice / (data?.[0]?.price || data?.[0]?.value) - 1) * 100
              : lastPrice
            : lastPrice,
      };
      setPulsePoint(true); // Trigger animation
      setPatchedData(updated);
    } else {
      setPatchedData(indexNormalized);
    }

    const timeout = setTimeout(() => setPulsePoint(false), 800);
    return () => clearTimeout(timeout);
  }, [indexPrices, ticker, data]);

  if (!data || data.length === 0) {
    if (!isLoading)
      return (
        <div className="flex items-center justify-center h-64 bg-accent rounded-lg">
          <p className="text-secondary">
            No historical data available for this index
          </p>
        </div>
      );
    else {
      return (
        <div className="w-full h-96">
          <div className="w-full h-96 rounded bg-accent animate-pulse" />
        </div>
      );
    }
  }

  const chartData = {
    datasets: [
      {
        label: `${ticker} Index`,
        data: patchedData,
        borderColor:
          showComparison || showETHComparison ? "#3b82f6" : "#3b82f6",
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const { chartArea } = chart;
          if (!chartArea) return null;
          return showComparison || showETHComparison
            ? "#3b82f6"
            : getGradient(chart.ctx, chartArea);
        },
        tension: 0.4,
        pointRadius: (ctx: any) => {
          const index = ctx.dataIndex;
          const lastIndex = patchedData.length - 1;
          return index === lastIndex ? 0 : 0;
        },
        pointBackgroundColor: (ctx: any) => {
          const index = ctx.dataIndex;
          const lastIndex = patchedData.length - 1;
          return index === lastIndex ? "#e95f6a" : "transparent";
        },
        pointHoverRadius: 5,
        borderWidth: 2,
        fill: showComparison || showETHComparison ? false : "origin",
      },
      ...(showComparison
        ? [
            {
              label: "Bitcoin (BTC)",
              data: btcNormalized,
              borderColor: "#f7931a",
              backgroundColor: "rgba(247, 147, 26, 0.1)",
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 2,
            },
          ]
        : []),
      ...(showETHComparison
        ? [
            {
              label: "Ethereum (ETH)",
              data: ethNormalized,
              borderColor: "#e95f6a",
              backgroundColor: "rgba(98, 126, 234, 0.1)",
              tension: 0.4,
              pointRadius: 0,
              borderWidth: 2,
            },
          ]
        : []),
    ],
  };

  const options: any = {
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
          unit: "month",
          tooltipFormat: "dd MMM yyyy",
          displayFormats: {
            month: "MMM yyyy",
          },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: number | string) =>
            typeof value === "number"
              ? showComparison || showETHComparison
                ? `${value.toFixed(2)}%`
                : `$${value.toLocaleString()}`
              : value,
        },
        title: {
          display: true,
          text:
            showComparison || showETHComparison
              ? "Percentage Change"
              : "Price (USD)",
        },
      },
    },
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          title: (ctx: any) =>
            new Date(ctx[0].parsed.x).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          label: (ctx: any) => {
            const label = ctx.dataset.label || "";
            const value = ctx.parsed.y;
            return showComparison || showETHComparison
              ? `${label}: ${value.toFixed(2)}%`
              : `${label}: $${value.toFixed(2)}`;
          },
          footer: (ctx: any) => {
            if ((!showComparison && !showETHComparison) || ctx.length < 2)
              return null;
            const indexValue = ctx[0]?.parsed.y ?? 0;
            const btc = ctx.find((c: any) => c.dataset.label.includes("BTC"))
              ?.parsed.y;
            const eth = ctx.find((c: any) => c.dataset.label.includes("ETH"))
              ?.parsed.y;

            const lines = ["Comparison:"];
            if (btc !== undefined) {
              lines.push(`vs BTC: ${(indexValue - btc).toFixed(2)}%`);
              lines.push(
                indexValue > btc ? "Outperforming BTC" : "Underperforming BTC"
              );
            }
            if (eth !== undefined) {
              lines.push(`vs ETH: ${(indexValue - eth).toFixed(2)}%`);
              lines.push(
                indexValue > eth ? "Outperforming ETH" : "Underperforming ETH"
              );
            }
            return lines;
          },
        },
        backgroundColor: "rgba(0,0,0,0.8)",
        padding: 12,
        bodyFont: { size: 14, weight: "bold" },
        footerFont: { size: 12 },
      },
    },
  };

  return (
    <div className="w-full h-96">
      {isLoading ? (
        <div className="w-full h-96 rounded bg-accent animate-pulse" />
      ) : (
        <Line
          key={chartKey}
          ref={chartRef}
          data={chartData as any}
          options={options}
          plugins={chartPlugins}
        />
      )}
    </div>
  );
};
