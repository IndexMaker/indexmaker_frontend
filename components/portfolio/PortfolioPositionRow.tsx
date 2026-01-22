'use client';

/**
 * PortfolioPositionRow Component
 *
 * Displays a single ITP position in the portfolio table.
 * Styled to match keeper-charts page pattern.
 *
 * @see Story 6.12 - Task 4.2
 */

import type { PortfolioPosition } from '@/types/portfolio';

interface PortfolioPositionRowProps {
  position: PortfolioPosition;
  onBridge?: (position: PortfolioPosition) => void;
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
 * Format price with more precision
 */
function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
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

export function PortfolioPositionRow({
  position,
  onBridge,
}: PortfolioPositionRowProps) {
  const pnlColor =
    position.pnlPercent === null
      ? 'text-secondary'
      : position.pnlPercent >= 0
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <tr className="border-b border-accent hover:bg-accent/30 transition-colors">
      {/* ITP Info */}
      <td className="py-4 px-4">
        <div>
          <p className="font-semibold text-primary">{position.name}</p>
          <p className="text-sm text-secondary">{position.symbol}</p>
        </div>
      </td>

      {/* Balance Breakdown */}
      <td className="py-4 px-4">
        <div className="text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-secondary">Arbitrum:</span>
            <span className="font-mono text-primary">{position.arbitrumFormatted}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-secondary">Orbit:</span>
            <span className="font-mono text-primary">{position.orbitFormatted}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-accent mt-1 pt-1">
            <span className="text-secondary font-medium">Total:</span>
            <span className="font-mono font-medium text-primary">{position.totalFormatted}</span>
          </div>
        </div>
      </td>

      {/* Current Price */}
      <td className="py-4 px-4 text-right">
        <span className="font-mono text-primary">{formatPrice(position.currentPrice)}</span>
      </td>

      {/* Position Value */}
      <td className="py-4 px-4 text-right">
        <span className="font-semibold text-primary">{formatUSD(position.value)}</span>
      </td>

      {/* P&L */}
      <td className="py-4 px-4 text-right">
        <span className={`font-semibold ${pnlColor}`}>
          {formatPnL(position.pnlPercent)}
        </span>
        {position.pnlAbsolute !== null && (
          <p className={`text-sm ${pnlColor}`}>
            {position.pnlAbsolute >= 0 ? '+' : ''}
            {formatUSD(position.pnlAbsolute)}
          </p>
        )}
      </td>

      {/* Bridge Button */}
      <td className="py-4 px-4 text-right">
        {onBridge && (
          <button
            onClick={() => onBridge(position)}
            className="text-sm px-3 py-1 rounded border border-accent text-secondary hover:bg-accent hover:text-primary transition-colors disabled:opacity-50"
            disabled
            title="Bridge coming soon"
          >
            Bridge
          </button>
        )}
      </td>
    </tr>
  );
}

export default PortfolioPositionRow;
