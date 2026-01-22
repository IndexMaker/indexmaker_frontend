'use client';

/**
 * PortfolioSummaryCard Component
 *
 * Displays the total portfolio value, P&L, and position count.
 * Styled to match keeper-charts page pattern.
 *
 * @see Story 6.12 - Task 4.1
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PortfolioSummary } from '@/types/portfolio';

interface PortfolioSummaryCardProps {
  summary: PortfolioSummary | null;
  isLoading?: boolean;
  onExport?: () => void;
}

/**
 * Format USD value for display
 */
function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format P&L percentage for display
 */
function formatPnL(pnl: number | null): string {
  if (pnl === null) return '--';
  const sign = pnl >= 0 ? '+' : '';
  return `${sign}${pnl.toFixed(2)}%`;
}

/**
 * Format timestamp for display
 */
function formatLastUpdated(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function PortfolioSummaryCard({
  summary,
  isLoading = false,
  onExport,
}: PortfolioSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Portfolio Summary</h3>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Portfolio Summary</h3>
          </div>
          <p className="text-secondary">No portfolio data available</p>
        </CardContent>
      </Card>
    );
  }

  const pnlColor =
    summary.totalPnlPercent === null
      ? 'text-secondary'
      : summary.totalPnlPercent >= 0
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <Card className="bg-foreground border border-accent shadow-sm">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Portfolio Summary</h3>
          {onExport && (
            <button
              onClick={onExport}
              className="text-sm text-secondary hover:text-primary transition-colors px-3 py-1 rounded border border-accent hover:bg-accent"
            >
              Export CSV
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Value */}
          <div>
            <p className="text-sm text-secondary mb-1">Total Value</p>
            <p className="text-2xl font-bold text-primary">{formatUSD(summary.totalValue)}</p>
          </div>

          {/* Total P&L */}
          <div>
            <p className="text-sm text-secondary mb-1">Total P&L</p>
            <p className={`text-xl font-semibold ${pnlColor}`}>
              {formatPnL(summary.totalPnlPercent)}
            </p>
            {summary.totalPnlAbsolute !== null && (
              <p className={`text-sm ${pnlColor}`}>
                {summary.totalPnlAbsolute >= 0 ? '+' : ''}
                {formatUSD(summary.totalPnlAbsolute)}
              </p>
            )}
            {summary.totalPnlPercent === null && (
              <p className="text-xs text-secondary">P&L tracking coming soon</p>
            )}
          </div>

          {/* Position Count */}
          <div>
            <p className="text-sm text-secondary mb-1">Positions</p>
            <p className="text-xl font-semibold text-primary">{summary.positionCount}</p>
          </div>

          {/* Last Updated */}
          <div>
            <p className="text-sm text-secondary mb-1">Last Updated</p>
            <p className="text-sm text-primary">{formatLastUpdated(summary.lastUpdated)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PortfolioSummaryCard;
