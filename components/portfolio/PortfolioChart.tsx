'use client';

/**
 * PortfolioChart Component
 *
 * Displays a 7-day sparkline chart of historical portfolio value.
 * Styled to match keeper-charts page pattern.
 *
 * @see Story 6.12 - Task 4.4
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PortfolioChartPoint } from '@/types/portfolio';

interface PortfolioChartProps {
  history: PortfolioChartPoint[];
  isLoading?: boolean;
  error?: string | null;
}

export function PortfolioChart({
  history,
  isLoading = false,
  error = null,
}: PortfolioChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">7-Day Performance</h3>
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">7-Day Performance</h3>
          </div>
          <div className="h-24 flex items-center justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // MVP: No historical data available
  if (history.length === 0) {
    return (
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">7-Day Performance</h3>
          </div>
          <div className="h-24 flex items-center justify-center border border-dashed border-accent rounded bg-accent/20">
            <div className="text-center">
              <p className="text-sm text-secondary">
                Historical data coming soon
              </p>
              <p className="text-xs text-secondary/70 mt-1">
                Portfolio performance tracking will be available in a future update
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Future implementation: Render sparkline chart with history data
  return (
    <Card className="bg-foreground border border-accent shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">7-Day Performance</h3>
          <span className="text-sm text-secondary">
            {history.length} data points
          </span>
        </div>
        <div className="h-24 flex items-center justify-center">
          <p className="text-sm text-secondary">
            Chart visualization coming soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default PortfolioChart;
