'use client';

/**
 * ItpPriceChart Component
 *
 * Displays ITP price history as an area chart with selectable time periods.
 * Integrates into the ITP detail page, replacing the "Chart coming soon" placeholder.
 *
 * @see Story 6.13 - ITP Price Chart Component
 */

import { useState, useMemo } from 'react';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePriceHistory, type PriceHistoryPeriod } from '@/hooks/usePriceHistory';

/** Period selector options */
const PERIODS: { label: string; value: PriceHistoryPeriod }[] = [
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: 'ALL', value: 'all' },
];

/** Chart color - uses CSS variable with fallback for recharts SVG compatibility */
const CHART_COLOR = 'hsl(var(--chart-1))';

/** Component props */
interface ItpPriceChartProps {
  /** ITP ID (orbit_address) to fetch history for */
  itpId: string;
  /** Additional CSS classes */
  className?: string;
}

/** Chart tooltip props */
interface TooltipPayload {
  timestamp: Date;
  price: number;
}

/** Custom tooltip component */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TooltipPayload }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const dateFormat = 'MMM d, yyyy h:mm a';

  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">
        {format(data.timestamp, dateFormat)}
      </p>
      <p className="text-sm font-semibold text-primary">
        ${data.price.toFixed(4)}
      </p>
    </div>
  );
}

/**
 * ITP Price Chart Component
 *
 * Displays historical price data for an ITP with selectable time periods.
 *
 * @example
 * ```tsx
 * <ItpPriceChart itpId="0x1234...abcd" className="mt-4" />
 * ```
 */
export function ItpPriceChart({ itpId, className }: ItpPriceChartProps) {
  const [period, setPeriod] = useState<PriceHistoryPeriod>('7d');

  const { data, isLoading, error, refetch } = usePriceHistory({
    itpId,
    period,
  });

  // Transform data for recharts (needs string timestamps for x-axis formatting)
  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      timestampMs: point.timestamp.getTime(),
    }));
  }, [data]);

  // Format X-axis ticks based on period
  const formatXAxis = (timestampMs: number) => {
    const date = new Date(timestampMs);
    switch (period) {
      case '1d':
        return format(date, 'HH:mm');
      case '7d':
        return format(date, 'EEE');
      case '30d':
        return format(date, 'MMM d');
      case 'all':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'MMM d');
    }
  };

  // Format price for Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(2)}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex justify-between items-center">
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Skeleton key={p.value} className="h-8 w-10" />
            ))}
          </div>
        </div>
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="h-[200px] flex flex-col items-center justify-center gap-2 bg-muted/20 rounded-lg">
          <span className="text-muted-foreground">Failed to load chart</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state (new ITPs with no history)
  if (data.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="h-[200px] flex items-center justify-center bg-muted/20 rounded-lg text-muted-foreground">
          No price history available yet
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Period selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="text-muted-foreground hover:text-primary"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="timestampMs"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={CHART_COLOR}
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ItpPriceChart;
