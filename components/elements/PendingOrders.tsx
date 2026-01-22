'use client';

/**
 * PendingOrders Component
 *
 * Displays the user's pending and recent completed orders from the bridge.
 * Shows real-time status tracking for buy/sell operations.
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
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
 * Order card component
 */
function OrderCard({ order }: { order: PendingOrder }) {
  const isBuy = order.type === 'buy';
  const statusColor = order.completed ? 'text-green-500' : 'text-yellow-500';
  const statusBg = order.completed ? 'bg-green-500/10' : 'bg-yellow-500/10';

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBuy ? (
            <ArrowDownCircle className="w-5 h-5 text-green-500" />
          ) : (
            <ArrowUpCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-medium text-primary">
            {isBuy ? 'Buy' : 'Sell'} Order
          </span>
          <span className="text-xs text-muted-foreground">#{order.nonce}</span>
        </div>

        <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs', statusBg, statusColor)}>
          {order.completed ? (
            <>
              <CheckCircle className="w-3 h-3" />
              <span>Completed</span>
            </>
          ) : (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing</span>
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {isBuy ? 'Amount (USDC)' : 'Amount'}
          </span>
          <span className="text-primary font-mono">
            {parseFloat(order.amountFormatted).toFixed(isBuy ? 2 : 6)}
            {!isBuy && ` ${getTokenDisplay(order.tokenAddress)}`}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {isBuy ? 'Target ITP' : 'ITP'}
          </span>
          <a
            href={`https://arbiscan.io/address/${order.tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2470ff] hover:underline flex items-center gap-1 font-mono text-xs"
          >
            {truncateAddress(order.tokenAddress)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Status message for pending */}
      {!order.completed && (
        <div className="bg-[#2470ff]/5 border border-[#2470ff]/20 rounded-lg p-2">
          <p className="text-xs text-[#2470ff] text-center">
            Bridge is processing your {isBuy ? 'buy' : 'sell'} order...
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="text-center py-8">
      <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">No Orders</h3>
      <p className="text-sm text-muted-foreground/70">
        Your pending and recent orders will appear here
      </p>
    </div>
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

  return (
    <div className={cn('bg-foreground border border-border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-primary">Orders</h2>
          {hasPending && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
              {pendingOrders.length} pending
            </span>
          )}
        </div>

        <button
          onClick={refresh}
          disabled={isLoading}
          className="p-2 text-muted-foreground hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Content */}
      <div className={cn('p-4 space-y-4', compact && 'p-3 space-y-3')}>
        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-xs text-red-500 text-center">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !hasOrders && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasOrders && <EmptyState />}

        {/* Pending orders */}
        {hasPending && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing
            </h3>
            {displayedPending.map((order) => (
              <OrderCard key={`${order.type}-${order.nonce}`} order={order} />
            ))}
          </div>
        )}

        {/* Completed orders */}
        {showCompleted && hasCompleted && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Completed
            </h3>
            {displayedCompleted.map((order) => (
              <OrderCard key={`${order.type}-${order.nonce}`} order={order} />
            ))}

            {/* Show more button */}
            {completedOrders.length > 3 && (
              <button
                onClick={() => setShowAllCompleted(!showAllCompleted)}
                className="w-full flex items-center justify-center gap-1 py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {showAllCompleted ? (
                  <>
                    Show less <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show {Math.min(completedOrders.length - 3, maxOrders - 3)} more{' '}
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Stats */}
        {hasOrders && !compact && (
          <div className="pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
            <span>Total buys: {depositNonce}</span>
            <span>Total sells: {sellNonce}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PendingOrders;
