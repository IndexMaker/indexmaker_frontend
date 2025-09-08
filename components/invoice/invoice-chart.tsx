"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lot } from "@/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { useMemo } from "react";

interface InvoiceChartProps {
  lots: Lot[];
}

export function InvoiceChart({ lots }: InvoiceChartProps) {
  // Function to generate random colors with good visual distinction
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

  // Calculate asset values for pie chart
  const assetData = lots.reduce((acc, lot) => {
    const value = lot.price * lot.assigned_quantity;
    if (acc[lot.symbol]) {
      acc[lot.symbol] += value;
    } else {
      acc[lot.symbol] = value;
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(assetData).map(([symbol, value]) => ({
    name: symbol,
    value: value,
  }));

  // Generate colors based on the number of assets
  const colors = useMemo(
    () => generateColors(chartData.length),
    [chartData.length]
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="bg-foreground">
      <CardHeader>
        <CardTitle>Asset Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Value"]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
