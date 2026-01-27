'use client';

/**
 * useArbitrumBuy Hook - Arbitrum Buy Flow Integration
 *
 * Handles the complete buy flow:
 * 1. USDC balance validation
 * 2. USDC approval flow (if needed)
 * 3. depositForBuy contract call
 * 4. Transaction status tracking
 *
 * Contract interface:
 * ```solidity
 * function depositForBuy(address targetItp, uint256 amount) external;
 * ```
 */

import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { useBridgeWallet } from './useBridgeWallet';
import {
  checkUsdcBalance,
  hasApproval,
  hasSufficientUsdcBalance,
  USDC_DECIMALS,
} from '@/lib/contracts/balance-utils';
import { BRIDGE_PROXY_ADDRESS, USDC_ADDRESS } from '@/lib/contracts/addresses';

/**
 * Buy transaction status
 */
export type BuyStatus =
  | 'idle'
  | 'checking_balance'
  | 'insufficient_balance'
  | 'checking_approval'
  | 'awaiting_approval'
  | 'approving'
  | 'approval_failed'
  | 'awaiting_deposit'
  | 'depositing'
  | 'deposit_failed'
  | 'processing'
  | 'success'
  | 'error';

/**
 * Buy transaction result
 */
export interface BuyResult {
  status: BuyStatus;
  txHash?: `0x${string}`;
  error?: string;
  approvalTxHash?: `0x${string}`;
  /** Deposit nonce for tracking bridge completion */
  nonce?: number;
}

/**
 * Input parameters for buy operation
 */
export interface BuyParams {
  /** Amount of USDC to spend (human-readable, e.g., "100" for 100 USDC) */
  amount: string;
  /** Target ITP token address to buy */
  targetItpAddress: `0x${string}`;
}

/**
 * Hook for executing Arbitrum buy flow.
 *
 * @example
 * ```tsx
 * const { executeBuy, status, error, reset } = useArbitrumBuy();
 *
 * const handleBuy = async () => {
 *   const result = await executeBuy({
 *     amount: '100', // 100 USDC
 *     targetItpAddress: '0x...'
 *   });
 *   if (result.status === 'success') {
 *     console.log('Buy tx:', result.txHash);
 *   }
 * };
 * ```
 */
export function useArbitrumBuy() {
  const {
    publicClient,
    address,
    bridgeProxy,
    usdc,
    isConnected,
    isCorrectChain,
  } = useBridgeWallet();

  const [status, setStatus] = useState<BuyStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  const [depositNonce, setDepositNonce] = useState<number | null>(null);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setApprovalTxHash(null);
    setDepositNonce(null);
  }, []);

  /**
   * Execute the buy flow
   *
   * Steps:
   * 1. Validate wallet connection and chain
   * 2. Check USDC balance
   * 3. Check/request USDC approval
   * 4. Call depositForBuy
   * 5. Return transaction hash
   */
  const executeBuy = useCallback(
    async (params: BuyParams): Promise<BuyResult> => {
      const { amount, targetItpAddress } = params;

      // Reset state
      reset();

      // Validate connection
      if (!isConnected || !address) {
        const errorMsg = 'Wallet not connected';
        setError(errorMsg);
        setStatus('error');
        return { status: 'error', error: errorMsg };
      }

      if (!isCorrectChain) {
        const errorMsg = 'Please switch to Arbitrum network';
        setError(errorMsg);
        setStatus('error');
        toast.error(errorMsg);
        return { status: 'error', error: errorMsg };
      }

      try {
        // Step 1: Check USDC balance
        setStatus('checking_balance');
        const amountWei = parseUnits(amount, USDC_DECIMALS);

        const balanceCheck = await hasSufficientUsdcBalance(
          publicClient,
          address,
          amountWei
        );

        if (!balanceCheck.isSufficient) {
          const errorMsg = `Insufficient USDC balance. You have ${balanceCheck.balance.formatted} USDC but need ${amount} USDC.`;
          setError(errorMsg);
          setStatus('insufficient_balance');
          toast.error('Insufficient USDC balance');
          return { status: 'insufficient_balance', error: errorMsg };
        }

        // Step 2: Check USDC approval
        setStatus('checking_approval');
        const approvalCheck = await hasApproval(
          publicClient,
          address,
          USDC_ADDRESS,
          BRIDGE_PROXY_ADDRESS,
          amountWei
        );

        if (!approvalCheck.hasApproval) {
          setStatus('awaiting_approval');

          try {
            setStatus('approving');
            toast.info('Approving USDC...');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const approveTx = await (usdc.write as any).approve([BRIDGE_PROXY_ADDRESS, amountWei]);
            setApprovalTxHash(approveTx);

            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            toast.success('USDC approved');
          } catch (approvalError) {
            const errorMsg = approvalError instanceof Error ? approvalError.message : 'Approval failed';
            setError(errorMsg);
            setStatus('approval_failed');
            toast.error('Approval failed');
            return { status: 'approval_failed', error: errorMsg };
          }
        }

        // Step 3: Get current nonce (will be the nonce for this deposit)
        let currentNonce: number | undefined;
        try {
          const nonce = await bridgeProxy.read.getUserDepositNonce([address]);
          currentNonce = Number(nonce);
          setDepositNonce(currentNonce);
        } catch {
          // Nonce fetch failed, continue without it
          console.warn('Failed to fetch deposit nonce');
        }

        // Step 4: Execute buy
        setStatus('awaiting_deposit');

        try {
          setStatus('depositing');
          toast.info('Submitting buy transaction...');

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const buyTx = await (bridgeProxy.write as any).depositForBuy([targetItpAddress, amountWei]);
          setTxHash(buyTx);

          setStatus('processing');
          await publicClient.waitForTransactionReceipt({ hash: buyTx });

          setStatus('success');
          toast.success('Buy transaction confirmed');
          return { status: 'success', txHash: buyTx, approvalTxHash: approvalTxHash || undefined, nonce: currentNonce };
        } catch (depositError) {
          const errorMsg = depositError instanceof Error ? depositError.message : 'Deposit failed';
          setError(errorMsg);
          setStatus('deposit_failed');
          toast.error('Buy transaction failed');
          return { status: 'deposit_failed', error: errorMsg };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        setStatus('error');
        toast.error('Buy failed: ' + errorMsg);
        return { status: 'error', error: errorMsg };
      }
    },
    [address, isConnected, isCorrectChain, publicClient, usdc, bridgeProxy, reset]
  );

  return {
    executeBuy,
    status,
    error,
    txHash,
    approvalTxHash,
    depositNonce,
    reset,
    isConnected,
    isCorrectChain,
  };
}
