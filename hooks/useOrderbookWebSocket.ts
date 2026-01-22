"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Orderbook level from WebSocket
 */
export interface OrderbookLevel {
  price: number;
  quantity: number;
  usd_value: number;
}

/**
 * Orderbook data from WebSocket
 */
export interface OrderbookData {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  mid_price: number;
  spread_bps: number;
  total_bid_depth_usd: number;
  total_ask_depth_usd: number;
  assets_included: number;
  assets_failed: string[];
}

/**
 * WebSocket message types
 */
interface WsSubscribedMessage {
  type: "subscribed";
  symbols: string[];
  weights: number[];
  interval_ms: number;
}

interface WsOrderbookMessage {
  type: "orderbook";
  data: OrderbookData;
  timestamp: number;
}

interface WsErrorMessage {
  type: "error";
  message: string;
}

interface WsPongMessage {
  type: "pong";
}

type WsMessage = WsSubscribedMessage | WsOrderbookMessage | WsErrorMessage | WsPongMessage;

/**
 * Hook options
 */
export interface UseOrderbookWebSocketOptions {
  /** Asset symbols (e.g., ["BTC", "ETH", "SOL"]) */
  symbols: string[];
  /** Weights in basis points (must sum to 10000) */
  weights: number[];
  /** Number of orderbook levels (default: 10) */
  levels?: number;
  /** Update interval in milliseconds (default: 1000, min: 500) */
  intervalMs?: number;
  /** Enable/disable the connection */
  enabled?: boolean;
  /** Aggregation depth in basis points (default: 10 = 0.1%)
   * Options: 1 (0.01%), 5 (0.05%), 10 (0.1%), 25 (0.25%), 50 (0.5%), 100 (1%) */
  aggregationBps?: number;
  /** Override the mid price (e.g., for ITP initial/current price) */
  baseMidPrice?: number;
}

/**
 * Hook return value
 */
export interface UseOrderbookWebSocketResult {
  /** Current orderbook data */
  data: OrderbookData | null;
  /** Connection status */
  status: "connecting" | "connected" | "disconnected" | "error";
  /** Error message if any */
  error: string | null;
  /** Last update timestamp */
  lastUpdated: Date | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect */
  disconnect: () => void;
}

const BACKEND_WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:3002";

/**
 * Custom hook for live orderbook updates via WebSocket
 *
 * @example
 * ```tsx
 * const { data, status, error } = useOrderbookWebSocket({
 *   symbols: ["BTC", "ETH", "SOL"],
 *   weights: [5000, 3000, 2000],
 *   intervalMs: 1000,
 *   enabled: true,
 * });
 * ```
 */
export function useOrderbookWebSocket({
  symbols,
  weights,
  levels = 10,
  intervalMs = 1000,
  enabled = true,
  aggregationBps = 10,
  baseMidPrice,
}: UseOrderbookWebSocketOptions): UseOrderbookWebSocketResult {
  const [data, setData] = useState<OrderbookData | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to always have access to latest values (avoid stale closures)
  const symbolsRef = useRef(symbols);
  const weightsRef = useRef(weights);
  const levelsRef = useRef(levels);
  const intervalMsRef = useRef(intervalMs);
  const aggregationBpsRef = useRef(aggregationBps);
  const baseMidPriceRef = useRef(baseMidPrice);
  const enabledRef = useRef(enabled);

  // Update refs when values change
  useEffect(() => {
    symbolsRef.current = symbols;
    weightsRef.current = weights;
    levelsRef.current = levels;
    intervalMsRef.current = intervalMs;
    aggregationBpsRef.current = aggregationBps;
    baseMidPriceRef.current = baseMidPrice;
    enabledRef.current = enabled;
  }, [symbols, weights, levels, intervalMs, aggregationBps, baseMidPrice, enabled]);

  // Memoize subscription params for dependency tracking
  const subscriptionKey = JSON.stringify({ symbols, weights, levels, intervalMs, aggregationBps, baseMidPrice });

  const connect = useCallback(() => {
    // Use refs to get latest values
    const currentSymbols = symbolsRef.current;
    const currentWeights = weightsRef.current;
    const currentLevels = levelsRef.current;
    const currentIntervalMs = intervalMsRef.current;
    const currentAggregationBps = aggregationBpsRef.current;
    const currentBaseMidPrice = baseMidPriceRef.current;

    // Validate inputs
    if (!currentSymbols.length || !currentWeights.length) {
      return;
    }
    if (currentSymbols.length !== currentWeights.length) {
      setError("symbols and weights must have same length");
      return;
    }
    const total = currentWeights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(total - 10000) > 1) {
      setError(`weights must sum to 10000, got ${total}`);
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");
    setError(null);

    try {
      const ws = new WebSocket(`${BACKEND_WS_URL}/api/orderbook/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[OrderbookWS] Connected, sending subscription for:", currentSymbols);

        // Send subscription request with current values
        ws.send(JSON.stringify({
          action: "subscribe",
          symbols: currentSymbols,
          weights: currentWeights,
          levels: currentLevels,
          interval_ms: currentIntervalMs,
          aggregation_bps: currentAggregationBps,
          base_mid_price: currentBaseMidPrice,
        }));

        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "subscribed":
              console.log("[OrderbookWS] Subscribed:", msg.symbols.length, "symbols:", msg.symbols);
              setStatus("connected");
              break;

            case "orderbook":
              setData(msg.data);
              setLastUpdated(new Date(msg.timestamp));
              break;

            case "error":
              console.error("[OrderbookWS] Error:", msg.message);
              setError(msg.message);
              break;

            case "pong":
              // Keepalive response, ignore
              break;
          }
        } catch (e) {
          console.error("[OrderbookWS] Failed to parse message:", e);
        }
      };

      ws.onerror = (event) => {
        console.error("[OrderbookWS] Error:", event);
        setStatus("error");
        setError("WebSocket error");
      };

      ws.onclose = (event) => {
        console.log("[OrderbookWS] Closed:", event.code, event.reason);
        setStatus("disconnected");
        wsRef.current = null;

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Auto-reconnect after 3 seconds if enabled and not manually closed
        if (enabledRef.current && event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("[OrderbookWS] Reconnecting...");
            connect();
          }, 3000);
        }
      };
    } catch (e) {
      console.error("[OrderbookWS] Failed to connect:", e);
      setStatus("error");
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }, []); // No dependencies - uses refs for latest values

  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Connect/disconnect based on enabled state and subscription changes
  useEffect(() => {
    // Don't clear data - keep showing previous data until new data arrives
    // This prevents UI twitching when switching between ITPs

    if (enabled && symbols.length > 0 && weights.length > 0) {
      console.log("[OrderbookWS] Subscription params changed, reconnecting with:", { symbols, weights });
      connect();
    } else {
      disconnect();
      setData(null); // Only clear when explicitly disabled
    }

    return () => {
      disconnect();
    };
  }, [enabled, subscriptionKey, connect, disconnect]);

  return {
    data,
    status,
    error,
    lastUpdated,
    reconnect,
    disconnect,
  };
}

export default useOrderbookWebSocket;
