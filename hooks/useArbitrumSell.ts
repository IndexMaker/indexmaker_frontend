'use client';

/**
 * useArbitrumSell Hook - Arbitrum Sell Flow Integration
 *
 * BLOCKED: The contract functions (requestSell) are NOT YET DEPLOYED.
 * This hook provides the interface and infrastructure for when contracts are ready.
 *
 * When contracts are available, this hook will handle:
 * 1. ITP balance validation
 * 2. ITP approval flow (if needed)
 * 3. requestSell contract call
 * 4. Transaction status tracking
 *
 * Expected contract interface:
 * ```solidity
 * function requestSell(address itp, uint256 amount) external;
 * ```
 */

import { useState, useCallback } from 'react';
import { parseUnits } from 'viem';
import { toast } from 'sonner';
import { useBridgeWallet } from './useBridgeWallet';
import {
  checkItpBalance,
  hasApproval,
  hasSufficientItpBalance,
  ITP_DECIMALS,
} from '@/lib/contracts/balance-utils';
import { BRIDGE_PROXY_ADDRESS } from '@/lib/contracts/addresses';

/**
 * Sell transaction status
 */
export type SellStatus =
  | 'idle'
  | 'checking_balance'
  | 'insufficient_balance'
  | 'checking_approval'
  | 'awaiting_approval'
  | 'approving'
  | 'approval_failed'
  | 'awaiting_sell'
  | 'selling'
  | 'sell_failed'
  | 'processing'
  | 'success'
  | 'error';

/**
 * Sell transaction result
 */
export interface SellResult {
  status: SellStatus;
  txHash?: `0x${string}`;
  error?: string;
  approvalTxHash?: `0x${string}`;
}

/**
 * Input parameters for sell operation
 */
export interface SellParams {
  /** ITP token address to sell */
  itpAddress: `0x${string}`;
  /** Amount of ITP to sell (human-readable, e.g., "10" for 10 ITP) */
  amount: string;
}

/**
 * Hook for executing Arbitrum sell flow.
 *
 * IMPORTANT: Contract functions are NOT YET DEPLOYED. This hook currently
 * provides infrastructure and will log/stub operations until contracts are ready.
 *
 * @example
 * ```tsx
 * const { executeSell, status, error, reset } = useArbitrumSell();
 *
 * const handleSell = async () => {
 *   const result = await executeSell({
 *     itpAddress: '0x...',
 *     amount: '10', // 10 ITP
 *   });
 *   if (result.status === 'success') {
 *     console.log('Sell tx:', result.txHash);
 *   }
 * };
 * ```
 */
export function useArbitrumSell() {
  const {
    publicClient,
    address,
    bridgeProxy,
    isConnected,
    isCorrectChain,
  } = useBridgeWallet();

  const [status, setStatus] = useState<SellStatus>('idle');
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
   * Execute the sell flow
   *
   * Steps:
   * 1. Validate wallet connection and chain
   * 2. Check ITP balance
   * 3. Check/request ITP approval
   * 4. Call requestSell (BLOCKED - contract not deployed)
   * 5. Return transaction hash
   */
  const executeSell = useCallback(
    async (params: SellParams): Promise<SellResult> => {
      const { itpAddress, amount } = params;

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
        // Step 1: Check ITP balance
        setStatus('checking_balance');
        const amountWei = parseUnits(amount, ITP_DECIMALS);

        const balanceCheck = await hasSufficientItpBalance(
          publicClient,
          address,
          itpAddress,
          amountWei
        );

        if (!balanceCheck.isSufficient) {
          const errorMsg = `Insufficient ITP balance. You have ${balanceCheck.balance.formatted} ITP but need ${amount} ITP.`;
          setError(errorMsg);
          setStatus('insufficient_balance');
          toast.error('Insufficient ITP balance');
          return { status: 'insufficient_balance', error: errorMsg };
        }

        // Step 2: Check ITP approval
        setStatus('checking_approval');
        const approvalCheck = await hasApproval(
          publicClient,
          address,
          itpAddress,
          BRIDGE_PROXY_ADDRESS,
          amountWei
        );

        if (!approvalCheck.hasApproval) {
          setStatus('awaiting_approval');

          // TODO: When contracts are deployed, uncomment this:
          // try {
          //   setStatus('approving');
          //   toast.info('Approving ITP...');
          //
          //   // Create ITP contract instance for approval
          //   const itpContract = getContract({
          //     address: itpAddress,
          //     abi: erc20Abi,
          //     client: { public: publicClient, wallet: walletClient },
          //   });
          //
          //   const approveTx = await itpContract.write.approve([BRIDGE_PROXY_ADDRESS, amountWei]);
          //   setApprovalTxHash(approveTx);
          //
          //   await publicClient.waitForTransactionReceipt({ hash: approveTx });
          //   toast.success('ITP approved');
          // } catch (approvalError) {
          //   const errorMsg = approvalError instanceof Error ? approvalError.message : 'Approval failed';
          //   setError(errorMsg);
          //   setStatus('approval_failed');
          //   toast.error('Approval failed');
          //   return { status: 'approval_failed', error: errorMsg };
          // }

          // TEMPORARY: Log the approval requirement
          console.log('[useArbitrumSell] Approval required for', amount, 'ITP at', itpAddress);
          toast.info('Approval would be required (contract not deployed yet)');
        }

        // Step 3: Execute sell (BLOCKED - contract function not deployed)
        setStatus('awaiting_sell');

        // TODO: When contracts are deployed, uncomment this:
        // try {
        //   setStatus('selling');
        //   toast.info('Submitting sell transaction...');
        //
        //   const sellTx = await bridgeProxy.write.requestSell([itpAddress, amountWei]);
        //   setTxHash(sellTx);
        //
        //   setStatus('processing');
        //   await publicClient.waitForTransactionReceipt({ hash: sellTx });
        //
        //   setStatus('success');
        //   toast.success('Sell transaction confirmed');
        //   return { status: 'success', txHash: sellTx, approvalTxHash: approvalTxHash || undefined };
        // } catch (sellError) {
        //   const errorMsg = sellError instanceof Error ? sellError.message : 'Sell failed';
        //   setError(errorMsg);
        //   setStatus('sell_failed');
        //   toast.error('Sell transaction failed');
        //   return { status: 'sell_failed', error: errorMsg };
        // }

        // TEMPORARY: Log the sell operation and return stub
        console.log('[useArbitrumSell] Sell operation (BLOCKED - contract not deployed):', {
          itpAddress,
          amount,
          userAddress: address,
        });

        toast.warning('Sell function not yet available - contracts pending deployment');
        setStatus('idle');
        return {
          status: 'idle',
          error: 'Contract functions not yet deployed. Sell operation will be available after contract deployment.',
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        setStatus('error');
        toast.error('Sell failed: ' + errorMsg);
        return { status: 'error', error: errorMsg };
      }
    },
    [address, isConnected, isCorrectChain, publicClient, reset]
  );

  return {
    executeSell,
    status,
    error,
    txHash,
    approvalTxHash,
    reset,
    isConnected,
    isCorrectChain,
  };
}
