'use client';

/**
 * PortfolioTable Component
 *
 * Table displaying all ITP positions in the portfolio.
 * Styled to match keeper-charts page pattern.
 *
 * @see Story 6.12 - Task 4.3
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PortfolioPositionRow } from './PortfolioPositionRow';
import type { PortfolioPosition } from '@/types/portfolio';

interface PortfolioTableProps {
  positions: PortfolioPosition[];
  isLoading?: boolean;
  onBridge?: (position: PortfolioPosition) => void;
}

type SortField = 'name' | 'value' | 'pnl' | 'balance';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export function PortfolioTable({
  positions,
  isLoading = false,
  onBridge,
}: PortfolioTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'value',
    direction: 'desc',
  });

  // Sort positions based on current sort config
  const sortedPositions = useMemo(() => {
    const sorted = [...positions];
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'pnl':
          const aPnl = a.pnlPercent ?? 0;
          const bPnl = b.pnlPercent ?? 0;
          comparison = aPnl - bPnl;
          break;
        case 'balance':
          comparison = Number(a.totalBalance - b.totalBalance);
          break;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [positions, sortConfig]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <span className="ml-1 text-secondary/50">↕</span>;
    }
    return (
      <span className="ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-foreground border border-accent shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Holdings</h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (positions.length === 0) {
    return null;
  }

  return (
    <Card className="bg-foreground border border-accent shadow-sm">
      <CardContent className="pt-6 px-0">
        <div className="flex items-center justify-between mb-4 px-6">
          <h3 className="text-lg font-semibold text-primary">Holdings ({positions.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-accent bg-accent/30">
                <th
                  className="py-3 px-4 text-left text-sm font-semibold text-primary cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  ITP {renderSortIndicator('name')}
                </th>
                <th
                  className="py-3 px-4 text-left text-sm font-semibold text-primary cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSort('balance')}
                >
                  Balance {renderSortIndicator('balance')}
                </th>
                <th className="py-3 px-4 text-right text-sm font-semibold text-primary">
                  Price
                </th>
                <th
                  className="py-3 px-4 text-right text-sm font-semibold text-primary cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSort('value')}
                >
                  Value {renderSortIndicator('value')}
                </th>
                <th
                  className="py-3 px-4 text-right text-sm font-semibold text-primary cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleSort('pnl')}
                >
                  P&L {renderSortIndicator('pnl')}
                </th>
                <th className="py-3 px-4 text-right text-sm font-semibold text-primary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPositions.map((position) => (
                <PortfolioPositionRow
                  key={`${position.itpId}-${position.symbol}`}
                  position={position}
                  onBridge={onBridge}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default PortfolioTable;
