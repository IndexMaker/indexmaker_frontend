'use client';

/**
 * useOrbitEventMonitor Hook
 *
 * Watches for bridge completion events on the Orbit chain.
 * Monitors BuyCompleted, SellCompleted, and OperationFailed events.
 *
 * IMPLEMENTATION NOTE: This is a stub implementation that will be wired
 * to actual contract events when BridgeProxy contracts are deployed.
 * Currently provides the interface and mock behavior for UI development.
 *
 * @see Story 3-3 Task 3
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ORBIT_CHAIN_ID, ORBIT_RPC_URL } from '@/lib/contracts/addresses';

/**
 * Bridge event types that can be monitored
 */
export type BridgeEventType = 'BuyCompleted' | 'SellCompleted' | 'OperationFailed';

/**
 * Status of the event monitoring
 */
export type MonitorStatus = 'idle' | 'watching' | 'completed' | 'failed' | 'timeout';

/**
 * Data returned when a bridge event is detected
 */
export interface BridgeEventData {
  /** Type of event detected */
  eventType: BridgeEventType;
  /** User address involved in the operation */
  userAddress: `0x${string}`;
  /** Operation nonce/ID */
  nonce?: bigint;
  /** Amount involved (ITP for buy, USDC for sell) */
  amount?: bigint;
  /** Orbit transaction hash */
  txHash?: `0x${string}`;
  /** Block number on Orbit */
  blockNumber?: bigint;
  /** Timestamp of the event */
  timestamp?: number;
  /** Error message if operation failed */
  errorMessage?: string;
}

/**
 * Configuration for the event monitor
 */
export interface OrbitEventMonitorConfig {
  /** User address to filter events for */
  userAddress: `0x${string}`;
  /** Operation nonce to watch for (optional - filters by nonce if provided) */
  operationNonce?: bigint;
  /** Type of operation being monitored */
  operationType: 'buy' | 'sell';
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 3 seconds) */
  pollingInterval?: number;
}

/**
 * Return type for the useOrbitEventMonitor hook
 */
export interface UseOrbitEventMonitorReturn {
  /** Current status of the monitor */
  status: MonitorStatus;
  /** Event data when detected */
  eventData: BridgeEventData | null;
  /** Error message if monitoring failed */
  error: string | null;
  /** Start monitoring for events */
  startMonitoring: (config: OrbitEventMonitorConfig) => void;
  /** Stop monitoring */
  stopMonitoring: () => void;
  /** Reset the monitor state */
  reset: () => void;
}

/**
 * ABI for bridge events (to be updated when contracts are deployed)
 * These are placeholder event signatures based on architecture docs
 */
const BRIDGE_EVENTS_ABI = [
  {
    type: 'event',
    name: 'BuyCompleted',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'itpAmount', type: 'uint256' },
      { indexed: false, name: 'nonce', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'SellCompleted',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'usdcAmount', type: 'uint256' },
      { indexed: false, name: 'nonce', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'OperationFailed',
    inputs: [
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'nonce', type: 'uint256' },
      { indexed: false, name: 'reason', type: 'string' },
    ],
  },
] as const;

/**
 * Hook for monitoring bridge completion events on Orbit chain.
 *
 * IMPORTANT: Contract functions are NOT YET DEPLOYED. This hook currently
 * provides a stub implementation that simulates event monitoring.
 * When contracts are deployed, this will use actual event listeners.
 *
 * @example
 * ```tsx
 * const { status, eventData, error, startMonitoring, stopMonitoring } = useOrbitEventMonitor();
 *
 * // Start monitoring after Arbitrum tx confirms
 * useEffect(() => {
 *   if (arbitrumTxConfirmed) {
 *     startMonitoring({
 *       userAddress: walletAddress,
 *       operationType: 'buy',
 *       timeout: 300000, // 5 minutes
 *     });
 *   }
 * }, [arbitrumTxConfirmed]);
 *
 * // Handle completion
 * useEffect(() => {
 *   if (status === 'completed' && eventData) {
 *     console.log('Bridge complete!', eventData);
 *   }
 * }, [status, eventData]);
 * ```
 */
export function useOrbitEventMonitor(): UseOrbitEventMonitorReturn {
  const [status, setStatus] = useState<MonitorStatus>('idle');
  const [eventData, setEventData] = useState<BridgeEventData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configRef = useRef<OrbitEventMonitorConfig | null>(null);
  const isActiveRef = useRef(false);

  /**
   * Clean up polling and timeout
   */
  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isActiveRef.current = false;
  }, []);

  /**
   * Reset the monitor state
   */
  const reset = useCallback(() => {
    cleanup();
    setStatus('idle');
    setEventData(null);
    setError(null);
    configRef.current = null;
  }, [cleanup]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    cleanup();
    if (status === 'watching') {
      setStatus('idle');
    }
  }, [cleanup, status]);

  /**
   * Start monitoring for events
   *
   * STUB IMPLEMENTATION: Currently simulates event detection.
   * TODO: Wire to actual contract events when deployed.
   */
  const startMonitoring = useCallback((config: OrbitEventMonitorConfig) => {
    // Clean up any existing monitoring
    cleanup();

    // Store config for reference
    configRef.current = config;
    isActiveRef.current = true;

    const {
      userAddress,
      operationType,
      timeout = 300000, // 5 minutes default
      pollingInterval = 3000, // 3 seconds default
    } = config;

    setStatus('watching');
    setEventData(null);
    setError(null);

    // Set timeout for operation
    timeoutRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        cleanup();
        setStatus('timeout');
        setError('Bridge operation timed out. The operation may still complete - please check your wallet.');
      }
    }, timeout);

    // STUB: Simulate polling for events
    // TODO: Replace with actual contract event watching when deployed
    //
    // When contracts are deployed, this should use:
    // ```typescript
    // const publicClient = createPublicClient({
    //   transport: http(ORBIT_RPC_URL),
    // });
    //
    // const unwatch = publicClient.watchContractEvent({
    //   address: BRIDGE_CONTRACT_ADDRESS,
    //   abi: BRIDGE_EVENTS_ABI,
    //   eventName: operationType === 'buy' ? 'BuyCompleted' : 'SellCompleted',
    //   args: { user: userAddress },
    //   onLogs: (logs) => handleEventLogs(logs),
    // });
    // ```

    // For now, just log that monitoring started
    console.log('[useOrbitEventMonitor] Started monitoring (STUB)', {
      userAddress,
      operationType,
      timeout,
      pollingInterval,
    });

    // STUB: Simulate no events being detected (stays in 'watching' state)
    // In production, this would be replaced with actual event watching

  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    eventData,
    error,
    startMonitoring,
    stopMonitoring,
    reset,
  };
}

/**
 * Simulates an event for testing purposes.
 * This function can be used to test the UI flow without actual contract events.
 *
 * @internal For testing only - remove when contracts are deployed
 */
export function simulateBridgeEvent(
  type: 'buy' | 'sell' | 'error',
  callback: (data: BridgeEventData) => void,
  delay = 5000
): () => void {
  const timeout = setTimeout(() => {
    if (type === 'error') {
      callback({
        eventType: 'OperationFailed',
        userAddress: '0x0000000000000000000000000000000000000000',
        errorMessage: 'Simulated failure for testing',
      });
    } else {
      callback({
        eventType: type === 'buy' ? 'BuyCompleted' : 'SellCompleted',
        userAddress: '0x0000000000000000000000000000000000000000',
        amount: BigInt(1000000), // 1 USDC or 1 ITP (depends on decimals)
        txHash: '0x' + '0'.repeat(64) as `0x${string}`,
        timestamp: Date.now(),
      });
    }
  }, delay);

  return () => clearTimeout(timeout);
}

export default useOrbitEventMonitor;
