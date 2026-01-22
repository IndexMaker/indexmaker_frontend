'use client';

/**
 * usePendingOrders Hook - Query and track pending bridge orders
 *
 * Fetches all pending deposits (buy orders) and sells for the connected user
 * from the BridgeProxy contract on Arbitrum.
 *
 * Provides real-time status tracking for:
 * - Pending deposits awaiting bridge processing
 * - Pending sells awaiting completion
 * - Order history with completion status
 */

import { useState, useEffect, useCallback } from 'react';
import { formatUnits } from 'viem';
import { useBridgeWallet } from './useBridgeWallet';
import { USDC_DECIMALS } from '@/lib/contracts/balance-utils';

/**
 * Pending deposit (buy order) data
 */
export interface PendingDeposit {
  nonce: number;
  user: `0x${string}`;
  targetItp: `0x${string}`;
  amount: bigint;
  amountFormatted: string;
  completed: boolean;
}

/**
 * Pending sell data
 */
export interface PendingSell {
  nonce: number;
  user: `0x${string}`;
  itpAddress: `0x${string}`;
  amount: bigint;
  amountFormatted: string;
  completed: boolean;
}

/**
 * Combined order data with type
 */
export interface PendingOrder {
  type: 'buy' | 'sell';
  nonce: number;
  user: `0x${string}`;
  tokenAddress: `0x${string}`;
  amount: bigint;
  amountFormatted: string;
  completed: boolean;
}

/**
 * Hook return type
 */
export interface UsePendingOrdersReturn {
  deposits: PendingDeposit[];
  sells: PendingSell[];
  allOrders: PendingOrder[];
  pendingOrders: PendingOrder[];
  completedOrders: PendingOrder[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  depositNonce: number;
  sellNonce: number;
}

const ITP_DECIMALS = 18;

/**
 * Hook for fetching and tracking pending bridge orders.
 *
 * @param autoRefresh - Enable automatic refresh interval (default: true)
 * @param refreshInterval - Refresh interval in milliseconds (default: 10000)
 *
 * @example
 * ```tsx
 * const { pendingOrders, completedOrders, refresh, isLoading } = usePendingOrders();
 *
 * return (
 *   <div>
 *     <h2>Pending Orders ({pendingOrders.length})</h2>
 *     {pendingOrders.map(order => (
 *       <OrderCard key={`${order.type}-${order.nonce}`} order={order} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function usePendingOrders(
  autoRefresh = true,
  refreshInterval = 10000
): UsePendingOrdersReturn {
  const { publicClient, address, bridgeProxy, isConnected } = useBridgeWallet();

  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [sells, setSells] = useState<PendingSell[]>([]);
  const [depositNonce, setDepositNonce] = useState(0);
  const [sellNonce, setSellNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all pending deposits for the connected user
   */
  const fetchDeposits = useCallback(async (): Promise<PendingDeposit[]> => {
    if (!address || !bridgeProxy.read) return [];

    try {
      // Get user's deposit nonce (total number of deposits)
      const nonce = await bridgeProxy.read.getUserDepositNonce([address]);
      const nonceNum = Number(nonce);
      setDepositNonce(nonceNum);

      if (nonceNum === 0) return [];

      // Fetch all deposits (most recent first)
      const depositPromises: Promise<PendingDeposit | null>[] = [];
      for (let i = nonceNum - 1; i >= Math.max(0, nonceNum - 20); i--) {
        depositPromises.push(
          (async () => {
            try {
              const deposit = await bridgeProxy.read.getPendingDeposit([address, BigInt(i)]);
              return {
                nonce: i,
                user: deposit.user as `0x${string}`,
                targetItp: deposit.targetItp as `0x${string}`,
                amount: deposit.amount,
                amountFormatted: formatUnits(deposit.amount, USDC_DECIMALS),
                completed: deposit.completed,
              };
            } catch {
              return null;
            }
          })()
        );
      }

      const results = await Promise.all(depositPromises);
      return results.filter((d): d is PendingDeposit => d !== null);
    } catch (err) {
      console.error('Error fetching deposits:', err);
      return [];
    }
  }, [address, bridgeProxy.read]);

  /**
   * Fetch all pending sells for the connected user
   */
  const fetchSells = useCallback(async (): Promise<PendingSell[]> => {
    if (!address || !bridgeProxy.read) return [];

    try {
      // Get user's sell nonce (total number of sells)
      const nonce = await bridgeProxy.read.getUserSellNonce([address]);
      const nonceNum = Number(nonce);
      setSellNonce(nonceNum);

      if (nonceNum === 0) return [];

      // Fetch all sells (most recent first)
      const sellPromises: Promise<PendingSell | null>[] = [];
      for (let i = nonceNum - 1; i >= Math.max(0, nonceNum - 20); i--) {
        sellPromises.push(
          (async () => {
            try {
              const sell = await bridgeProxy.read.getPendingSell([address, BigInt(i)]);
              return {
                nonce: i,
                user: sell.user as `0x${string}`,
                itpAddress: sell.itpAddress as `0x${string}`,
                amount: sell.amount,
                amountFormatted: formatUnits(sell.amount, ITP_DECIMALS),
                completed: sell.completed,
              };
            } catch {
              return null;
            }
          })()
        );
      }

      const results = await Promise.all(sellPromises);
      return results.filter((s): s is PendingSell => s !== null);
    } catch (err) {
      console.error('Error fetching sells:', err);
      return [];
    }
  }, [address, bridgeProxy.read]);

  /**
   * Refresh all orders
   */
  const refresh = useCallback(async () => {
    if (!isConnected || !address) {
      setDeposits([]);
      setSells([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [newDeposits, newSells] = await Promise.all([
        fetchDeposits(),
        fetchSells(),
      ]);

      setDeposits(newDeposits);
      setSells(newSells);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(errorMsg);
      console.error('Error refreshing orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, fetchDeposits, fetchSells]);

  // Initial fetch when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]);

  // Auto-refresh interval (separate effect to avoid re-render loops)
  useEffect(() => {
    if (!autoRefresh || !isConnected || !address) {
      return;
    }

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshInterval, isConnected, address]);

  // Combine deposits and sells into unified order list
  const allOrders: PendingOrder[] = [
    ...deposits.map((d) => ({
      type: 'buy' as const,
      nonce: d.nonce,
      user: d.user,
      tokenAddress: d.targetItp,
      amount: d.amount,
      amountFormatted: d.amountFormatted,
      completed: d.completed,
    })),
    ...sells.map((s) => ({
      type: 'sell' as const,
      nonce: s.nonce,
      user: s.user,
      tokenAddress: s.itpAddress,
      amount: s.amount,
      amountFormatted: s.amountFormatted,
      completed: s.completed,
    })),
  ].sort((a, b) => b.nonce - a.nonce); // Most recent first

  const pendingOrders = allOrders.filter((o) => !o.completed);
  const completedOrders = allOrders.filter((o) => o.completed);

  return {
    deposits,
    sells,
    allOrders,
    pendingOrders,
    completedOrders,
    isLoading,
    error,
    refresh,
    depositNonce,
    sellNonce,
  };
}

export default usePendingOrders;
