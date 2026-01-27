'use client';

/**
 * useOperationsWebSocket Hook - Real-time operation status updates via WebSocket
 *
 * Story 3.2 - AC #6, NFR2: Frontend receives status updates within 3 seconds
 *
 * Connects to backend WebSocket endpoint to receive real-time operation status updates.
 * Provides automatic reconnection, pending operations tracking, and status callbacks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Operation types
 */
export type OperationType = 'buy' | 'sell' | 'rebalance';

/**
 * Operation status values matching backend
 * Status progresses: initiated → approved → bridging → executing → settling → complete
 */
export type OperationStatus =
  | 'initiated'
  | 'approved'
  | 'bridging'
  | 'executing'
  | 'settling'
  | 'complete'
  | 'failed'
  | 'refunded';

/**
 * Operation error details
 */
export interface OperationError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Operation event received from WebSocket
 */
export interface OperationEvent {
  type: OperationType;
  nonce: number;
  user: string;
  status: OperationStatus;
  phase?: string;
  tx_hash?: string;
  arb_tx_hash?: string;
  orbit_tx_hash?: string;
  error?: OperationError;
  timestamp: number;
}

/**
 * Pending operation from initial state
 */
export interface PendingOperation {
  id: number;
  user_address: string;
  operation_type: string;
  nonce: number;
  status: string;
  arb_tx_hash?: string;
  orbit_tx_hash?: string;
  completion_tx_hash?: string;
  amount?: string;
  itp_amount?: string;
  itp_address?: string;
  error_code?: string;
  error_message?: string;
  retryable: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * WebSocket message types
 */
interface WsSubscribedMessage {
  type: 'subscribed';
  address: string;
}

interface WsOperationMessage {
  type: 'operation';
  operation_type: OperationType;
  nonce: number;
  user: string;
  status: OperationStatus;
  phase?: string;
  tx_hash?: string;
  arb_tx_hash?: string;
  orbit_tx_hash?: string;
  error?: OperationError;
  timestamp: number;
}

interface WsInitialMessage {
  type: 'initial';
  operations: PendingOperation[];
}

interface WsErrorMessage {
  type: 'error';
  message: string;
}

interface WsPongMessage {
  type: 'pong';
}

type WsMessage = WsSubscribedMessage | WsOperationMessage | WsInitialMessage | WsErrorMessage | WsPongMessage;

/**
 * Hook configuration
 */
export interface UseOperationsWebSocketConfig {
  /** User wallet address to subscribe to */
  userAddress: `0x${string}` | null;
  /** Whether to enable the WebSocket connection */
  enabled?: boolean;
  /** Callback when operation status changes */
  onStatusChange?: (event: OperationEvent) => void;
  /** Callback when operation completes */
  onComplete?: (event: OperationEvent) => void;
  /** Callback when operation fails */
  onError?: (event: OperationEvent) => void;
  /** Backend WebSocket URL (default: uses NEXT_PUBLIC_API_URL) */
  wsUrl?: string;
}

/**
 * Hook for real-time operation status updates via WebSocket.
 *
 * @example
 * ```tsx
 * const { pendingOperations, isConnected, getOperationStatus } = useOperationsWebSocket({
 *   userAddress: address,
 *   enabled: !!address,
 *   onComplete: (event) => {
 *     toast.success(`${event.type} completed!`);
 *   },
 *   onError: (event) => {
 *     toast.error(`${event.type} failed: ${event.error?.message}`);
 *   },
 * });
 * ```
 */
export function useOperationsWebSocket(config: UseOperationsWebSocketConfig) {
  const {
    userAddress,
    enabled = true,
    onStatusChange,
    onComplete,
    onError,
    wsUrl,
  } = config;

  const [isConnected, setIsConnected] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [operationStatuses, setOperationStatuses] = useState<Map<string, OperationEvent>>(new Map());
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Generate operation key for status tracking
  const getOperationKey = useCallback((type: string, nonce: number): string => {
    return `${type}-${nonce}`;
  }, []);

  // Get status for a specific operation
  const getOperationStatus = useCallback((type: OperationType, nonce: number): OperationEvent | undefined => {
    return operationStatuses.get(getOperationKey(type, nonce));
  }, [operationStatuses, getOperationKey]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userAddress || !enabled) return;

    // Build WebSocket URL
    const baseUrl = wsUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = baseUrl.replace(/^https?:\/\//, '');
    const url = `${wsProtocol}://${wsHost}/api/operations/ws`;

    console.log('[OperationsWS] Connecting to', url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[OperationsWS] Connected');
        setIsConnected(true);
        setLastError(null);
        reconnectAttempts.current = 0;

        // Send subscription request
        ws.send(JSON.stringify({
          action: 'subscribe',
          address: userAddress,
        }));

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'subscribed':
              console.log('[OperationsWS] Subscribed for', message.address);
              break;

            case 'initial':
              console.log('[OperationsWS] Initial state:', message.operations.length, 'pending operations');
              setPendingOperations(message.operations);
              break;

            case 'operation': {
              const opEvent: OperationEvent = {
                type: message.operation_type,
                nonce: message.nonce,
                user: message.user,
                status: message.status,
                phase: message.phase,
                tx_hash: message.tx_hash,
                arb_tx_hash: message.arb_tx_hash,
                orbit_tx_hash: message.orbit_tx_hash,
                error: message.error,
                timestamp: message.timestamp,
              };

              console.log('[OperationsWS] Operation update:', opEvent.type, opEvent.nonce, opEvent.status);

              // Update operation status
              setOperationStatuses(prev => {
                const newMap = new Map(prev);
                newMap.set(getOperationKey(opEvent.type, opEvent.nonce), opEvent);
                return newMap;
              });

              // Call callbacks
              onStatusChange?.(opEvent);

              if (opEvent.status === 'complete') {
                onComplete?.(opEvent);
                // Remove from pending
                setPendingOperations(prev =>
                  prev.filter(op => !(op.operation_type === opEvent.type && op.nonce === opEvent.nonce))
                );
              }

              if (opEvent.status === 'failed' || opEvent.status === 'refunded') {
                onError?.(opEvent);
              }
              break;
            }

            case 'pong':
              // Heartbeat response, ignore
              break;

            case 'error':
              console.error('[OperationsWS] Error:', message.message);
              setLastError(message.message);
              break;
          }
        } catch (err) {
          console.error('[OperationsWS] Failed to parse message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('[OperationsWS] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnection with exponential backoff
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current++;
          console.log(`[OperationsWS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[OperationsWS] WebSocket error:', error);
        setLastError('WebSocket connection error');
      };
    } catch (err) {
      console.error('[OperationsWS] Failed to create WebSocket:', err);
      setLastError('Failed to connect');
    }
  }, [userAddress, enabled, wsUrl, onStatusChange, onComplete, onError, getOperationKey]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ action: 'unsubscribe' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Connect on mount / address change
  useEffect(() => {
    if (enabled && userAddress) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, userAddress, connect, disconnect]);

  // Check if an operation is pending
  const isOperationPending = useCallback((type: OperationType, nonce: number): boolean => {
    const status = getOperationStatus(type, nonce);
    if (status) {
      return !['complete', 'failed', 'refunded'].includes(status.status);
    }
    return pendingOperations.some(op => op.operation_type === type && op.nonce === nonce);
  }, [getOperationStatus, pendingOperations]);

  return {
    /** Whether WebSocket is connected */
    isConnected,
    /** List of pending operations (from initial state) */
    pendingOperations,
    /** Map of operation statuses by key (type-nonce) */
    operationStatuses,
    /** Get status for a specific operation */
    getOperationStatus,
    /** Check if an operation is still pending */
    isOperationPending,
    /** Last error message */
    lastError,
    /** Manually reconnect */
    reconnect: connect,
    /** Manually disconnect */
    disconnect,
  };
}

export default useOperationsWebSocket;
