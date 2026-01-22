"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, RefreshCw, AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrderbookWebSocket, type OrderbookData } from "@/hooks/useOrderbookWebSocket";

interface OrderbookLevel {
  price: number;
  quantity: number;
  usd_value: number;
}

interface AssetOrderbookSummary {
  symbol: string;
  weight_bps: number;
  mid_price: number;
  spread_bps: number;
  bid_depth_usd: number;
  ask_depth_usd: number;
}

interface VirtualOrderbookData {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  mid_price: number;
  spread_bps: number;
  total_bid_depth_usd: number;
  total_ask_depth_usd: number;
  assets_included: number;
  assets_failed: string[];
  asset_details?: AssetOrderbookSummary[];
}

interface VirtualOrderbookProps {
  /** Asset symbols (e.g., ["BTC", "ETH", "SOL"]) */
  symbols: string[];
  /** Weights in basis points (must sum to 10000) */
  weights: number[];
  /** Optional: Number of orderbook levels to display (default: 5) */
  displayLevels?: number;
  /** Optional: Show asset breakdown panel */
  showAssetBreakdown?: boolean;
  /** Optional: Compact mode for sidebar display */
  compact?: boolean;
  /** Optional: Auto-refresh interval in seconds (ignored, using WebSocket) */
  autoRefreshInterval?: number;
  /** Optional: Custom class name */
  className?: string;
  /** Optional: Start collapsed (default: false) */
  defaultCollapsed?: boolean;
  /** Optional: Use WebSocket for live updates (default: true) */
  useWebSocket?: boolean;
  /** Optional: Override the mid price (e.g., for ITP initial/current price) */
  baseMidPrice?: number;
}

/**
 * Format USD value with appropriate suffix
 */
function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Format price with appropriate decimals
 */
function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

/**
 * VirtualOrderbook Component
 *
 * Displays an aggregated virtual orderbook for an index composition.
 * Fetches real-time orderbook data from the backend and visualizes it.
 */
export function VirtualOrderbook({
  symbols,
  weights,
  displayLevels = 5,
  showAssetBreakdown = false,
  compact = false,
  autoRefreshInterval = 0,
  className,
  defaultCollapsed = false,
  useWebSocket = true,
  baseMidPrice,
}: VirtualOrderbookProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [pollingData, setPollingData] = useState<VirtualOrderbookData | null>(null);
  const [pollingLoading, setPollingLoading] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [pollingLastUpdated, setPollingLastUpdated] = useState<Date | null>(null);
  // Aggregation depth in basis points (like Binance depth selector)
  // 0 = no aggregation (raw), higher values = more aggregation
  const [aggregationBps, setAggregationBps] = useState(0);

  // Depth options for the selector (in basis points)
  // Includes both granular and deep aggregation options
  const depthOptions = [
    { value: 0, label: "Raw" },
    { value: 1, label: "0.01%" },
    { value: 2, label: "0.02%" },
    { value: 5, label: "0.05%" },
    { value: 10, label: "0.1%" },
    { value: 25, label: "0.25%" },
    { value: 50, label: "0.5%" },
    { value: 100, label: "1%" },
    { value: 200, label: "2%" },
    { value: 500, label: "5%" },
  ];

  // Validate weights
  const weightsValid = useMemo(() => {
    if (weights.length === 0) return false;
    const total = weights.reduce((sum, w) => sum + w, 0);
    return Math.abs(total - 10000) <= 1;
  }, [weights]);

  // WebSocket connection for live updates
  const {
    data: wsData,
    status: wsStatus,
    error: wsError,
    lastUpdated: wsLastUpdated,
    reconnect: wsReconnect,
  } = useOrderbookWebSocket({
    symbols,
    weights,
    levels: displayLevels * 2,
    intervalMs: 200, // 200ms for real-time feel (5 updates/sec)
    enabled: useWebSocket && !isCollapsed && weightsValid && symbols.length > 0,
    aggregationBps,
    baseMidPrice,
  });

  // Use WebSocket data if available, otherwise use polling data
  const data: VirtualOrderbookData | null = wsData
    ? { ...wsData, asset_details: undefined }
    : pollingData;
  const loading = wsStatus === "connecting" || pollingLoading;
  const error = wsError || pollingError;
  const lastUpdated = wsLastUpdated || pollingLastUpdated;
  const isConnected = wsStatus === "connected";

  // Fallback polling fetch (used when WebSocket fails or is disabled)
  const fetchOrderbook = useCallback(async () => {
    if (symbols.length === 0 || weights.length === 0) {
      setPollingData(null);
      return;
    }

    if (!weightsValid) {
      const total = weights.reduce((sum, w) => sum + w, 0);
      setPollingError(`Invalid weights: sum is ${total}, expected 10000`);
      return;
    }

    setPollingLoading(true);
    setPollingError(null);

    try {
      const response = await fetch("/api/orderbook/virtual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols,
          weights,
          levels: displayLevels * 2,
          aggregation_bps: aggregationBps,
          base_mid_price: baseMidPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const result: VirtualOrderbookData = await response.json();
      setPollingData(result);
      setPollingLastUpdated(new Date());
    } catch (err) {
      setPollingError(err instanceof Error ? err.message : "Failed to load orderbook");
    } finally {
      setPollingLoading(false);
    }
  }, [symbols, weights, displayLevels, weightsValid, aggregationBps, baseMidPrice]);

  // Initial fetch for fallback data (only if WebSocket is disabled or fails)
  useEffect(() => {
    if (!useWebSocket || wsStatus === "error" || wsStatus === "disconnected") {
      fetchOrderbook();
    }
  }, [fetchOrderbook, useWebSocket, wsStatus]);

  // Polling fallback when WebSocket is disabled
  useEffect(() => {
    if (useWebSocket && wsStatus === "connected") return;
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(fetchOrderbook, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchOrderbook, useWebSocket, wsStatus]);

  // Calculate max depth for bar visualization
  const maxDepth = data && data.bids?.length && data.asks?.length
    ? Math.max(
        ...data.bids.map((l) => l.usd_value),
        ...data.asks.map((l) => l.usd_value)
      )
    : 0;

  // Early return for no assets
  if (symbols.length === 0) {
    return (
      <div className={cn("bg-foreground border border-border rounded-lg p-4", className)}>
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Select assets to preview orderbook
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-foreground border border-border rounded-lg", compact && "rounded-md", className)}>
      {/* Header - Collapsible - Compact Bitget style */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsCollapsed(!isCollapsed)}
        onKeyDown={(e) => e.key === "Enter" && setIsCollapsed(!isCollapsed)}
        className={cn(
          "w-full flex items-center justify-between hover:bg-accent/30 transition-colors cursor-pointer",
          compact ? "px-3 py-3" : "p-4"
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold text-primary", compact ? "text-sm" : "text-base")}>
            Orderbook
          </span>
          {data && (
            <span className={cn(
              "font-mono rounded text-xs px-2 py-0.5",
              (data.spread_bps || 0) < 10
                ? "text-green-500 bg-green-500/10"
                : (data.spread_bps || 0) < 50
                ? "text-yellow-500 bg-yellow-500/10"
                : "text-red-500 bg-red-500/10"
            )}>
              {(data.spread_bps || 0).toFixed(1)} bps
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Depth selector */}
          <select
            value={aggregationBps}
            onChange={(e) => {
              e.stopPropagation();
              setAggregationBps(Number(e.target.value));
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "bg-accent border border-accent rounded text-primary cursor-pointer focus:outline-none",
              compact ? "text-xs px-2 py-1" : "text-xs px-2 py-1"
            )}
            title="Depth"
          >
            {depthOptions.slice(0, 6).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {/* Live indicator */}
          {useWebSocket && isConnected && (
            <span className="w-2 h-2 bg-green-500 rounded-full" title="Live" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (useWebSocket) {
                wsReconnect();
              } else {
                fetchOrderbook();
              }
            }}
            disabled={loading}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              !isCollapsed && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <>
          {/* Error state - compact */}
          {error && (
            <div className={cn(
              "border-t border-border",
              compact ? "p-2" : "p-4"
            )}>
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className={compact ? "w-3 h-3" : "w-4 h-4"} />
                <span className={compact ? "text-xs" : "text-sm"}>{error}</span>
              </div>
            </div>
          )}

          {/* Loading state - compact */}
          {loading && !data && (
            <div className={cn(
              "text-center border-t border-border",
              compact ? "p-4" : "p-8"
            )}>
              <Loader2 className={cn(
                "animate-spin mx-auto text-muted-foreground",
                compact ? "w-4 h-4" : "w-6 h-6"
              )} />
              <p className={cn(
                "text-muted-foreground mt-2",
                compact ? "text-xs" : "text-sm"
              )}>Loading...</p>
            </div>
          )}

          {/* Orderbook data */}
          {data && data.bids && data.asks && (
        <>
          {/* Mid price header row */}
          <div className={cn(
            "flex items-center justify-between bg-accent/50 border-b border-border",
            compact ? "px-3 py-2 text-sm" : "px-4 py-2 text-sm"
          )}>
            <span className="text-secondary">Mid Price</span>
            <span className="font-mono font-medium text-primary">
              ${formatPrice(data.mid_price || 0)}
            </span>
          </div>

          {/* Orderbook levels - Bitget style */}
          <div className={cn(compact ? "px-2 py-1" : "p-2")}>
            {/* Column headers */}
            <div className={cn(
              "grid grid-cols-3 text-muted-foreground font-medium mb-1",
              compact ? "px-2 text-xs" : "px-2 text-xs"
            )}>
              <span className="text-left">Price</span>
              <span className="text-center">Size</span>
              <span className="text-right">Total</span>
            </div>

            {/* Asks (sells) - shown in reverse order (highest to lowest) */}
            <div className={compact ? "space-y-0.5" : "space-y-0.5"}>
              {(data.asks || []).slice(0, displayLevels).reverse().map((level, idx) => (
                <OrderbookRow
                  key={`ask-${idx}`}
                  price={level.price}
                  quantity={level.quantity}
                  usdValue={level.usd_value}
                  maxDepth={maxDepth}
                  type="ask"
                  compact={compact}
                />
              ))}
            </div>

            {/* Spread line */}
            <div className={cn(
              "flex items-center justify-center border-y border-border/50 text-muted-foreground font-mono",
              compact ? "my-1 py-1 text-xs" : "my-2 py-1 text-xs"
            )}>
              {(data.spread_bps || 0).toFixed(1)} bps spread
            </div>

            {/* Bids (buys) - shown highest to lowest */}
            <div className={compact ? "space-y-0.5" : "space-y-0.5"}>
              {(data.bids || []).slice(0, displayLevels).map((level, idx) => (
                <OrderbookRow
                  key={`bid-${idx}`}
                  price={level.price}
                  quantity={level.quantity}
                  usdValue={level.usd_value}
                  maxDepth={maxDepth}
                  type="bid"
                  compact={compact}
                />
              ))}
            </div>
          </div>

          {/* Depth summary */}
          <div className={cn(
            "flex items-center justify-between border-t border-border bg-accent/30",
            compact ? "px-3 py-2 text-sm" : "px-4 py-2 text-sm"
          )}>
            <div className="flex items-center gap-2">
              <span className="text-green-500 font-medium">Bid</span>
              <span className="font-mono text-secondary">{formatUsd(data.total_bid_depth_usd || 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-secondary">{formatUsd(data.total_ask_depth_usd || 0)}</span>
              <span className="text-red-500 font-medium">Ask</span>
            </div>
          </div>

          {/* Failed assets warning */}
          {data.assets_failed && data.assets_failed.length > 0 && (
            <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
              <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                <AlertCircle className="w-3 h-3" />
                <span>
                  Missing data for: {data.assets_failed.join(", ")}
                </span>
              </div>
            </div>
          )}

          {/* Asset breakdown (optional) */}
          {showAssetBreakdown && data.asset_details && data.asset_details.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/30">
                Asset Breakdown
              </div>
              <div className="divide-y divide-border">
                {data.asset_details.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="px-4 py-2 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-primary">
                        {asset.symbol}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(asset.weight_bps / 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-primary">
                        ${formatPrice(asset.mid_price)}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-mono",
                          asset.spread_bps < 10
                            ? "text-green-500"
                            : asset.spread_bps < 50
                            ? "text-yellow-500"
                            : "text-red-500"
                        )}
                      >
                        {asset.spread_bps.toFixed(1)} bps
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          </>
        )}
        </>
      )}
    </div>
  );
}

/**
 * Single orderbook row component - Bitget style
 */
function OrderbookRow({
  price,
  quantity,
  usdValue,
  maxDepth,
  type,
  compact,
}: {
  price: number;
  quantity: number;
  usdValue: number;
  maxDepth: number;
  type: "bid" | "ask";
  compact: boolean;
}) {
  const depthPercent = maxDepth > 0 ? (usdValue / maxDepth) * 100 : 0;
  const isBid = type === "bid";

  return (
    <div className="relative">
      {/* Depth bar background */}
      <div
        className={cn(
          "absolute inset-0 transition-all",
          isBid ? "bg-green-500/10" : "bg-red-500/10"
        )}
        style={{
          width: `${Math.min(depthPercent, 100)}%`,
          [isBid ? "left" : "right"]: 0,
        }}
      />

      {/* Row content - 3 columns */}
      <div
        className={cn(
          "relative grid grid-cols-3 font-mono",
          compact ? "px-2 py-1 text-sm" : "px-2 py-1 text-sm"
        )}
      >
        <span
          className={cn(
            "font-medium text-left",
            isBid ? "text-green-500" : "text-red-500"
          )}
        >
          {formatPrice(price)}
        </span>
        <span className="text-secondary text-center">
          {quantity.toFixed(4)}
        </span>
        <span className="text-primary text-right">
          {formatUsd(usdValue)}
        </span>
      </div>
    </div>
  );
}

export default VirtualOrderbook;
