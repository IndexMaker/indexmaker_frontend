'use client';

/**
 * useArbitrumBuy Hook - Arbitrum Buy Flow Integration
 *
 * BLOCKED: The contract functions (depositForBuy) are NOT YET DEPLOYED.
 * This hook provides the interface and infrastructure for when contracts are ready.
 *
 * When contracts are available, this hook will handle:
 * 1. USDC balance validation
 * 2. USDC approval flow (if needed)
 * 3. depositForBuy contract call
 * 4. Transaction status tracking
 *
 * Expected contract interface:
 * ```solidity
 * function depositForBuy(uint256 amount, address targetItp) external;
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
 * IMPORTANT: Contract functions are NOT YET DEPLOYED. This hook currently
 * provides infrastructure and will log/stub operations until contracts are ready.
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

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setApprovalTxHash(null);
  }, []);

  /**
   * Execute the buy flow
   *
   * Steps:
   * 1. Validate wallet connection and chain
   * 2. Check USDC balance
   * 3. Check/request USDC approval
   * 4. Call depositForBuy (BLOCKED - contract not deployed)
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

          // TODO: When contracts are deployed, uncomment this:
          // try {
          //   setStatus('approving');
          //   toast.info('Approving USDC...');
          //
          //   const approveTx = await usdc.write.approve([BRIDGE_PROXY_ADDRESS, amountWei]);
          //   setApprovalTxHash(approveTx);
          //
          //   await publicClient.waitForTransactionReceipt({ hash: approveTx });
          //   toast.success('USDC approved');
          // } catch (approvalError) {
          //   const errorMsg = approvalError instanceof Error ? approvalError.message : 'Approval failed';
          //   setError(errorMsg);
          //   setStatus('approval_failed');
          //   toast.error('Approval failed');
          //   return { status: 'approval_failed', error: errorMsg };
          // }

          // TEMPORARY: Log the approval requirement
          console.log('[useArbitrumBuy] Approval required for', amount, 'USDC to', BRIDGE_PROXY_ADDRESS);
          toast.info('Approval would be required (contract not deployed yet)');
        }

        // Step 3: Execute buy (BLOCKED - contract function not deployed)
        setStatus('awaiting_deposit');

        // TODO: When contracts are deployed, uncomment this:
        // try {
        //   setStatus('depositing');
        //   toast.info('Submitting buy transaction...');
        //
        //   const buyTx = await bridgeProxy.write.depositForBuy([amountWei, targetItpAddress]);
        //   setTxHash(buyTx);
        //
        //   setStatus('processing');
        //   await publicClient.waitForTransactionReceipt({ hash: buyTx });
        //
        //   setStatus('success');
        //   toast.success('Buy transaction confirmed');
        //   return { status: 'success', txHash: buyTx, approvalTxHash: approvalTxHash || undefined };
        // } catch (depositError) {
        //   const errorMsg = depositError instanceof Error ? depositError.message : 'Deposit failed';
        //   setError(errorMsg);
        //   setStatus('deposit_failed');
        //   toast.error('Buy transaction failed');
        //   return { status: 'deposit_failed', error: errorMsg };
        // }

        // TEMPORARY: Log the buy operation and return stub
        console.log('[useArbitrumBuy] Buy operation (BLOCKED - contract not deployed):', {
          amount,
          targetItpAddress,
          userAddress: address,
        });

        toast.warning('Buy function not yet available - contracts pending deployment');
        setStatus('idle');
        return {
          status: 'idle',
          error: 'Contract functions not yet deployed. Buy operation will be available after contract deployment.',
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        setStatus('error');
        toast.error('Buy failed: ' + errorMsg);
        return { status: 'error', error: errorMsg };
      }
    },
    [address, isConnected, isCorrectChain, publicClient, reset]
  );

  return {
    executeBuy,
    status,
    error,
    txHash,
    approvalTxHash,
    reset,
    isConnected,
    isCorrectChain,
  };
}
