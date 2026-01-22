'use client';

/**
 * useArbitrumSell Hook - Arbitrum Sell Flow Integration
 *
 * Handles the complete sell flow:
 * 1. ITP balance validation
 * 2. ITP approval flow (if needed)
 * 3. requestSell contract call
 * 4. Transaction status tracking
 *
 * Contract interface:
 * ```solidity
 * function requestSell(address itp, uint256 amount) external;
 * ```
 */

import { useState, useCallback } from 'react';
import { parseUnits, getContract } from 'viem';
import { toast } from 'sonner';
import { useBridgeWallet } from './useBridgeWallet';
import { erc20Abi } from '@/lib/contracts/abis/erc20';
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
  /** Sell nonce for tracking bridge completion */
  nonce?: number;
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
    walletClient,
    address,
    bridgeProxy,
    isConnected,
    isCorrectChain,
  } = useBridgeWallet();

  const [status, setStatus] = useState<SellStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [approvalTxHash, setApprovalTxHash] = useState<`0x${string}` | null>(null);
  const [sellNonce, setSellNonce] = useState<number | null>(null);

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setTxHash(null);
    setApprovalTxHash(null);
    setSellNonce(null);
  }, []);

  /**
   * Execute the sell flow
   *
   * Steps:
   * 1. Validate wallet connection and chain
   * 2. Check ITP balance
   * 3. Check/request ITP approval
   * 4. Call requestSell
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

          if (!walletClient) {
            const errorMsg = 'Wallet client not available for approval';
            setError(errorMsg);
            setStatus('approval_failed');
            toast.error(errorMsg);
            return { status: 'approval_failed', error: errorMsg };
          }

          try {
            setStatus('approving');
            toast.info('Approving ITP...');

            // Create ITP contract instance for approval
            const itpContract = getContract({
              address: itpAddress,
              abi: erc20Abi,
              client: { public: publicClient, wallet: walletClient },
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const approveTx = await (itpContract.write as any).approve([BRIDGE_PROXY_ADDRESS, amountWei]);
            setApprovalTxHash(approveTx);

            await publicClient.waitForTransactionReceipt({ hash: approveTx });
            toast.success('ITP approved');
          } catch (approvalError) {
            const errorMsg = approvalError instanceof Error ? approvalError.message : 'Approval failed';
            setError(errorMsg);
            setStatus('approval_failed');
            toast.error('Approval failed');
            return { status: 'approval_failed', error: errorMsg };
          }
        }

        // Step 3: Get current nonce (will be the nonce for this sell)
        let currentNonce: number | undefined;
        try {
          const nonce = await bridgeProxy.read.getUserSellNonce([address]);
          currentNonce = Number(nonce);
          setSellNonce(currentNonce);
        } catch {
          // Nonce fetch failed, continue without it
          console.warn('Failed to fetch sell nonce');
        }

        // Step 4: Execute sell
        setStatus('awaiting_sell');

        try {
          setStatus('selling');
          toast.info('Submitting sell transaction...');

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sellTx = await (bridgeProxy.write as any).requestSell([itpAddress, amountWei]);
          setTxHash(sellTx);

          setStatus('processing');
          await publicClient.waitForTransactionReceipt({ hash: sellTx });

          setStatus('success');
          toast.success('Sell transaction confirmed');
          return { status: 'success', txHash: sellTx, approvalTxHash: approvalTxHash || undefined, nonce: currentNonce };
        } catch (sellError) {
          const errorMsg = sellError instanceof Error ? sellError.message : 'Sell failed';
          setError(errorMsg);
          setStatus('sell_failed');
          toast.error('Sell transaction failed');
          return { status: 'sell_failed', error: errorMsg };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        setStatus('error');
        toast.error('Sell failed: ' + errorMsg);
        return { status: 'error', error: errorMsg };
      }
    },
    [address, isConnected, isCorrectChain, publicClient, walletClient, bridgeProxy, reset]
  );

  return {
    executeSell,
    status,
    error,
    txHash,
    approvalTxHash,
    sellNonce,
    reset,
    isConnected,
    isCorrectChain,
  };
}
