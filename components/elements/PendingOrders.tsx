'use client';

/**
 * PendingOrders Component
 *
 * Displays the user's pending and recent completed orders from the bridge.
 * Shows real-time status tracking for buy/sell operations.
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Loader2,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingOrders, type PendingOrder } from '@/hooks/usePendingOrders';
import { useWallet } from '@/contexts/wallet-context';

/**
 * Token symbol lookup (can be extended with actual lookups)
 */
const TOKEN_SYMBOLS: Record<string, string> = {
  // Add known ITP addresses here for display
};

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get token symbol or truncated address
 */
function getTokenDisplay(address: string): string {
  return TOKEN_SYMBOLS[address.toLowerCase()] || truncateAddress(address);
}

/**
 * Status badge component styled like "Bridge is processing"
 */
function StatusBadge({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-500">
        <CheckCircle className="w-3 h-3" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#2470ff]">
      <Loader2 className="w-3 h-3 animate-spin" />
      Bridge is processing
    </span>
  );
}

/**
 * PendingOrders Component Props
 */
interface PendingOrdersProps {
  /** Maximum number of orders to show (default: 10) */
  maxOrders?: number;
  /** Show completed orders (default: true) */
  showCompleted?: boolean;
  /** Auto-refresh interval in ms (default: 10000) */
  refreshInterval?: number;
  /** Compact mode (default: false) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PendingOrders Component
 *
 * Displays pending and completed bridge orders for the connected user.
 */
export function PendingOrders({
  maxOrders = 10,
  showCompleted = true,
  refreshInterval = 10000,
  compact = false,
  className,
}: PendingOrdersProps) {
  const { isConnected } = useWallet();
  const {
    pendingOrders,
    completedOrders,
    allOrders,
    isLoading,
    error,
    refresh,
    depositNonce,
    sellNonce,
  } = usePendingOrders(true, refreshInterval);

  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // Don't render if wallet not connected
  if (!isConnected) {
    return null;
  }

  // Filter orders based on props
  const displayedPending = pendingOrders.slice(0, maxOrders);
  const displayedCompleted = showCompleted
    ? showAllCompleted
      ? completedOrders.slice(0, maxOrders)
      : completedOrders.slice(0, 3)
    : [];

  const hasOrders = allOrders.length > 0;
  const hasPending = pendingOrders.length > 0;
  const hasCompleted = completedOrders.length > 0;

  // Hide completely if no orders
  if (!isLoading && !hasOrders) {
    return null;
  }

  // Combine all displayed orders
  const displayedOrders = [...displayedPending, ...displayedCompleted];

  return (
    <div className={cn('rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-primary">Orders</h2>
          {hasPending && (
            <span className="px-2 py-0.5 text-xs bg-[#2470ff]/10 text-[#2470ff] rounded-full">
              {pendingOrders.length} pending
            </span>
          )}
        </div>

        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-1 text-muted-foreground hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mb-2">
          <p className="text-xs text-red-500 text-center">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !hasOrders && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Orders table */}
      {displayedOrders.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground text-left border-b border-border">
              <th className="py-1.5 font-medium">Type</th>
              <th className="py-1.5 font-medium">Amount</th>
              <th className="py-1.5 font-medium">Target ITP</th>
              <th className="py-1.5 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedOrders.map((order) => {
              const isBuy = order.type === 'buy';
              return (
                <tr key={`${order.type}-${order.nonce}`} className="border-b border-border/50">
                  <td className="py-2">
                    <span className={cn('flex items-center gap-1', isBuy ? 'text-green-500' : 'text-red-500')}>
                      {isBuy ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                      {isBuy ? 'Buy' : 'Sell'}
                    </span>
                  </td>
                  <td className="py-2 text-primary font-mono">
                    {parseFloat(order.amountFormatted).toFixed(isBuy ? 2 : 6)}
                    {isBuy ? ' USDC' : ` ${getTokenDisplay(order.tokenAddress)}`}
                  </td>
                  <td className="py-2">
                    <a
                      href={`https://arbiscan.io/address/${order.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2470ff] hover:underline flex items-center gap-1 font-mono"
                    >
                      {truncateAddress(order.tokenAddress)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="py-2 text-right">
                    <StatusBadge completed={order.completed} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Show more button */}
      {showCompleted && completedOrders.length > 3 && (
        <button
          onClick={() => setShowAllCompleted(!showAllCompleted)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {showAllCompleted ? (
            <>
              Show less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Show {Math.min(completedOrders.length - 3, maxOrders - 3)} more{' '}
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default PendingOrders;
