'use client';

/**
 * useBridgeStatus Hook - Track bridge processing status
 *
 * Watches for completion events (BuyCompleted, SellCompleted) after
 * a deposit or sell request has been submitted on Arbitrum.
 *
 * Flow tracked:
 * 1. deposit_confirmed - DepositForBuy tx confirmed on Arbitrum
 * 2. bridge_processing - Bridge node is processing on Orbit
 * 3. completed - BuyCompleted event emitted, tokens minted
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseAbiItem, type Log } from 'viem';
import { useBridgeWallet, BRIDGE_PROXY_ADDRESS } from './useBridgeWallet';

/**
 * Bridge processing status
 */
export type BridgeProcessingStatus =
  | 'idle'
  | 'deposit_confirmed'
  | 'bridge_processing'
  | 'completed'
  | 'timeout'
  | 'error';

/**
 * Bridge status result
 */
export interface BridgeStatusResult {
  status: BridgeProcessingStatus;
  completionTxHash?: `0x${string}`;
  itpAmount?: bigint;
  usdcAmount?: bigint;
  error?: string;
}

/**
 * Hook configuration
 */
export interface UseBridgeStatusConfig {
  /** User address to watch */
  userAddress: `0x${string}` | null;
  /** Operation nonce to track */
  nonce: number | null;
  /** Type of operation */
  operationType: 'buy' | 'sell';
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Polling interval in milliseconds (default: 5 seconds) */
  pollingInterval?: number;
  /** Whether to start watching immediately */
  enabled?: boolean;
}

// Event signatures for completion events
const BUY_COMPLETED_EVENT = parseAbiItem(
  'event BuyCompleted(address indexed user, uint256 itpAmount, uint256 indexed nonce)'
);
const SELL_COMPLETED_EVENT = parseAbiItem(
  'event SellCompleted(address indexed user, uint256 usdcAmount, uint256 indexed nonce)'
);

/**
 * Hook for tracking bridge processing status after deposit/sell confirmation.
 *
 * @param config - Configuration object
 *
 * @example
 * ```tsx
 * const { status, completionTxHash, startWatching, stopWatching } = useBridgeStatus({
 *   userAddress: address,
 *   nonce: depositNonce,
 *   operationType: 'buy',
 *   enabled: depositConfirmed,
 * });
 *
 * useEffect(() => {
 *   if (status === 'completed') {
 *     toast.success('Tokens received!');
 *   }
 * }, [status]);
 * ```
 */
export function useBridgeStatus(config: UseBridgeStatusConfig) {
  const {
    userAddress,
    nonce,
    operationType,
    timeout = 5 * 60 * 1000, // 5 minutes
    pollingInterval = 5000, // 5 seconds
    enabled = false,
  } = config;

  const { publicClient } = useBridgeWallet();

  const [status, setStatus] = useState<BridgeProcessingStatus>('idle');
  const [result, setResult] = useState<BridgeStatusResult>({ status: 'idle' });
  const [isWatching, setIsWatching] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  /**
   * Check for completion event
   */
  const checkForCompletion = useCallback(async (): Promise<BridgeStatusResult | null> => {
    if (!userAddress || nonce === null) return null;

    try {
      const event = operationType === 'buy' ? BUY_COMPLETED_EVENT : SELL_COMPLETED_EVENT;

      // Get logs for the completion event
      const logs = await publicClient.getLogs({
        address: BRIDGE_PROXY_ADDRESS,
        event,
        args: {
          user: userAddress,
          nonce: BigInt(nonce),
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      if (logs.length > 0) {
        const log = logs[0] as Log<bigint, number, false, typeof event>;
        const txHash = log.transactionHash as `0x${string}`;

        if (operationType === 'buy') {
          return {
            status: 'completed',
            completionTxHash: txHash,
            itpAmount: (log.args as { itpAmount?: bigint }).itpAmount,
          };
        } else {
          return {
            status: 'completed',
            completionTxHash: txHash,
            usdcAmount: (log.args as { usdcAmount?: bigint }).usdcAmount,
          };
        }
      }

      return null;
    } catch (err) {
      console.error('Error checking for completion:', err);
      return null;
    }
  }, [publicClient, userAddress, nonce, operationType]);

  /**
   * Start watching for completion
   */
  const startWatching = useCallback(() => {
    if (!userAddress || nonce === null) return;

    setIsWatching(true);
    setStatus('deposit_confirmed');
    setResult({ status: 'deposit_confirmed' });
    startTimeRef.current = Date.now();

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      setStatus('timeout');
      setResult({ status: 'timeout', error: 'Bridge processing timeout' });
      stopWatching();
    }, timeout);

    // Start polling
    const poll = async () => {
      const completionResult = await checkForCompletion();

      if (completionResult) {
        setStatus('completed');
        setResult(completionResult);
        stopWatching();
        return;
      }

      // Update to processing status after first poll
      if (status === 'deposit_confirmed') {
        setStatus('bridge_processing');
        setResult({ status: 'bridge_processing' });
      }
    };

    // Initial check
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, pollingInterval);
  }, [userAddress, nonce, timeout, pollingInterval, checkForCompletion, status]);

  /**
   * Stop watching
   */
  const stopWatching = useCallback(() => {
    setIsWatching(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    startTimeRef.current = null;
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    stopWatching();
    setStatus('idle');
    setResult({ status: 'idle' });
  }, [stopWatching]);

  // Auto-start watching when enabled
  useEffect(() => {
    if (enabled && !isWatching && userAddress && nonce !== null) {
      startWatching();
    }
  }, [enabled, isWatching, userAddress, nonce, startWatching]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  // Calculate elapsed time
  const elapsedTime = startTimeRef.current ? Date.now() - startTimeRef.current : 0;

  return {
    status,
    result,
    isWatching,
    elapsedTime,
    startWatching,
    stopWatching,
    reset,
    completionTxHash: result.completionTxHash,
    itpAmount: result.itpAmount,
    usdcAmount: result.usdcAmount,
  };
}

export default useBridgeStatus;
