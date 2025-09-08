"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset } from "@/types";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface AssetChartProps {
  assets: Asset[];
}

export function AssetChart({ assets }: AssetChartProps) {
  // Prepare data for bar chart (top 10 by market cap)
  const topAssets = assets
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 10)
    .map((asset) => ({
      symbol: asset.symbol,
      market_cap: asset.market_cap / 1e9, // Convert to billions
      volume: asset.expected_inventory, // Convert to billions
    }));

  // Prepare data for pie chart (market cap distribution)
  const pieData = assets
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, 5)
    .map((asset) => ({
      name: asset.symbol,
      value: asset.market_cap,
    }));

  const generateColors = (count: number) => {
    const colors = [];
    const hueStep = 360 / count;

    for (let i = 0; i < count; i++) {
      const hue = Math.floor(i * hueStep);
      const saturation = 70 + Math.random() * 20;
      const lightness = 50 + Math.random() * 10;

      colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }

    return colors;
  };

  const colors = useMemo(() => generateColors(assets.length), [assets.length]);

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(1)}B`;
  };

  const formatPieValue = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Market Cap Bar Chart */}
      <Card className="bg-foreground">
        <CardHeader>
          <CardTitle>Top Assets by Market Cap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topAssets}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--accent))"
                />
                <XAxis
                  dataKey="symbol"
                  stroke="hsl(var(--primary))"
                  fontSize={12}
                />
                <YAxis
                  stroke="hsl(var(--primary))"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === "market_cap" ? "Market Cap" : "24h Volume",
                  ]}
                  labelStyle={{ color: "hsl(var(--text-secondary))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--foreground))",
                    border: "1px solid hsl(var(--accent))",
                    borderRadius: "6px",
                  }}
                />
                <Bar
                  dataKey="market_cap"
                  fill="#2470ff"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Market Cap Distribution Pie Chart */}
      <Card className="bg-foreground">
        <CardHeader>
          <CardTitle>Market Cap Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    formatPieValue(value),
                    "Market Cap",
                  ]}
                  labelStyle={{ color: "hsl(var(--primary))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--foreground))",
                    border: "1px solid hsl(var(--accent))",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
