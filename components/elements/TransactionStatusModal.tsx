"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Check, X, ExternalLink, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";
import { CustomButton } from "@/components/ui/custom-button";
import { useBridgeStatus, type BridgeProcessingStatus } from "@/hooks/useBridgeStatus";
import { useBridgeWallet } from "@/hooks/useBridgeWallet";
import type { BuyStatus } from "@/hooks/useArbitrumBuy";
import type { SellStatus } from "@/hooks/useArbitrumSell";

type TransactionStatus = BuyStatus | SellStatus;

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: TransactionStatus;
  error: string | null;
  txHash: `0x${string}` | null;
  approvalTxHash?: `0x${string}` | null;
  isBuy: boolean;
  amount: string;
  symbol: string;
  /** Nonce for tracking bridge completion (optional) */
  nonce?: number | null;
  /** Enable bridge status tracking after deposit confirms */
  trackBridgeStatus?: boolean;
}

/**
 * Combined status type including bridge processing
 * Note: BridgeProcessingStatus 'completed' is mapped to 'bridge_complete' for display
 */
type CombinedStatus = TransactionStatus | Exclude<BridgeProcessingStatus, 'completed'> | 'bridge_complete';

/**
 * Get status display info
 */
function getStatusInfo(status: CombinedStatus, isBuy: boolean) {
  const action = isBuy ? "Buy" : "Sell";

  const statusMap: Record<CombinedStatus, {
    title: string;
    message: string;
    icon: "loading" | "success" | "error" | "warning" | "clock" | "bridge";
    canClose: boolean;
  }> = {
    idle: {
      title: "Ready",
      message: `Ready to ${action.toLowerCase()}`,
      icon: "clock",
      canClose: true,
    },
    checking_balance: {
      title: "Checking Balance",
      message: "Verifying your balance...",
      icon: "loading",
      canClose: false,
    },
    insufficient_balance: {
      title: "Insufficient Balance",
      message: `You don't have enough balance for this ${action.toLowerCase()}.`,
      icon: "error",
      canClose: true,
    },
    checking_approval: {
      title: "Checking Approval",
      message: "Checking token allowance...",
      icon: "loading",
      canClose: false,
    },
    awaiting_approval: {
      title: "Approval Needed",
      message: "Please approve the transaction in your wallet.",
      icon: "clock",
      canClose: false,
    },
    approving: {
      title: "Approving",
      message: "Waiting for approval transaction to confirm...",
      icon: "loading",
      canClose: false,
    },
    approval_failed: {
      title: "Approval Failed",
      message: "Token approval was rejected or failed.",
      icon: "error",
      canClose: true,
    },
    awaiting_deposit: {
      title: "Ready to Submit",
      message: `Please confirm the ${action.toLowerCase()} transaction in your wallet.`,
      icon: "clock",
      canClose: false,
    },
    awaiting_sell: {
      title: "Ready to Submit",
      message: "Please confirm the sell transaction in your wallet.",
      icon: "clock",
      canClose: false,
    },
    depositing: {
      title: "Submitting",
      message: `Submitting ${action.toLowerCase()} transaction...`,
      icon: "loading",
      canClose: false,
    },
    selling: {
      title: "Submitting",
      message: "Submitting sell transaction...",
      icon: "loading",
      canClose: false,
    },
    deposit_failed: {
      title: `${action} Failed`,
      message: `The ${action.toLowerCase()} transaction was rejected or failed.`,
      icon: "error",
      canClose: true,
    },
    sell_failed: {
      title: "Sell Failed",
      message: "The sell transaction was rejected or failed.",
      icon: "error",
      canClose: true,
    },
    processing: {
      title: "Processing",
      message: "Waiting for blockchain confirmation...",
      icon: "loading",
      canClose: false,
    },
    success: {
      title: `${action} Submitted`,
      message: `Your ${action.toLowerCase()} request was confirmed on Arbitrum!`,
      icon: "success",
      canClose: false, // Changed to false - now wait for bridge
    },
    error: {
      title: "Error",
      message: "An unexpected error occurred.",
      icon: "error",
      canClose: true,
    },
    // Bridge processing statuses
    deposit_confirmed: {
      title: "Deposit Confirmed",
      message: "Bridge is now processing your request...",
      icon: "bridge",
      canClose: false,
    },
    bridge_processing: {
      title: "Bridge Processing",
      message: `Processing your ${action.toLowerCase()} on Orbit chain...`,
      icon: "bridge",
      canClose: false,
    },
    bridge_complete: {
      title: `${action} Complete!`,
      message: isBuy
        ? "Your tokens have been minted to your wallet!"
        : "Your USDC has been sent to your wallet!",
      icon: "success",
      canClose: true,
    },
    timeout: {
      title: "Processing Timeout",
      message: "Bridge processing is taking longer than expected. Check your orders.",
      icon: "warning",
      canClose: true,
    },
  };

  return statusMap[status] || statusMap.error;
}

/**
 * Progress steps for bridge processing
 */
function BridgeProgressSteps({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Deposit", description: "Confirmed on Arbitrum" },
    { label: "Bridge", description: "Processing on Orbit" },
    { label: "Complete", description: "Tokens minted" },
  ];

  return (
    <div className="flex items-center justify-between mb-4">
      {steps.map((step, idx) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                idx < currentStep
                  ? "bg-green-500 text-white"
                  : idx === currentStep
                  ? "bg-[#2470ff] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {idx < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                idx + 1
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-1">{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-2",
                idx < currentStep ? "bg-green-500" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * TransactionStatusModal Component
 *
 * Shows the progress of a buy/sell transaction with bridge status tracking.
 */
export function TransactionStatusModal({
  isOpen,
  onClose,
  status,
  error,
  txHash,
  approvalTxHash,
  isBuy,
  amount,
  symbol,
  nonce,
  trackBridgeStatus = true,
}: TransactionStatusModalProps) {
  const { address } = useBridgeWallet();
  const [bridgeStarted, setBridgeStarted] = useState(false);

  // Bridge status tracking
  const {
    status: bridgeStatus,
    completionTxHash,
    itpAmount,
    usdcAmount,
    startWatching,
    reset: resetBridge,
  } = useBridgeStatus({
    userAddress: address,
    nonce: nonce ?? null,
    operationType: isBuy ? 'buy' : 'sell',
    enabled: false, // Manual control
  });

  // Start bridge tracking when deposit succeeds
  useEffect(() => {
    if (status === 'success' && trackBridgeStatus && nonce !== undefined && nonce !== null && !bridgeStarted) {
      setBridgeStarted(true);
      startWatching();
    }
  }, [status, trackBridgeStatus, nonce, bridgeStarted, startWatching]);

  // Reset bridge state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setBridgeStarted(false);
      resetBridge();
    }
  }, [isOpen, resetBridge]);

  if (!isOpen) return null;

  // Determine current display status
  let displayStatus: CombinedStatus = status;
  if (bridgeStarted && bridgeStatus !== 'idle') {
    displayStatus = bridgeStatus === 'completed' ? 'bridge_complete' : bridgeStatus;
  }

  // Calculate progress step
  let progressStep = 0;
  if (status === 'success' || bridgeStatus === 'deposit_confirmed') progressStep = 1;
  if (bridgeStatus === 'bridge_processing') progressStep = 1;
  if (bridgeStatus === 'completed') progressStep = 3;

  const statusInfo = getStatusInfo(displayStatus, isBuy);
  const showBridgeProgress = bridgeStarted && status === 'success';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={statusInfo.canClose ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-foreground border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Close button (only when allowed) */}
        {statusInfo.canClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Bridge Progress Steps */}
        {showBridgeProgress && (
          <BridgeProgressSteps currentStep={progressStep} />
        )}

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              statusInfo.icon === "loading" && "bg-[#2470ff]/10",
              statusInfo.icon === "success" && "bg-green-500/10",
              statusInfo.icon === "error" && "bg-red-500/10",
              statusInfo.icon === "warning" && "bg-yellow-500/10",
              statusInfo.icon === "clock" && "bg-muted",
              statusInfo.icon === "bridge" && "bg-purple-500/10"
            )}
          >
            {statusInfo.icon === "loading" && (
              <Loader2 className="w-8 h-8 text-[#2470ff] animate-spin" />
            )}
            {statusInfo.icon === "success" && (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            )}
            {statusInfo.icon === "error" && (
              <AlertCircle className="w-8 h-8 text-red-500" />
            )}
            {statusInfo.icon === "warning" && (
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            )}
            {statusInfo.icon === "clock" && (
              <Clock className="w-8 h-8 text-muted-foreground" />
            )}
            {statusInfo.icon === "bridge" && (
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            )}
          </div>
        </div>

        {/* Title and Message */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-primary mb-2">
            {statusInfo.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {error || statusInfo.message}
          </p>
        </div>

        {/* Transaction Details */}
        {(amount || txHash || approvalTxHash) && (
          <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6 space-y-3">
            {amount && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-primary font-mono">
                  {amount} {isBuy ? "USDC" : symbol}
                </span>
              </div>
            )}

            {approvalTxHash && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Approval TX</span>
                <a
                  href={`https://arbiscan.io/tx/${approvalTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2470ff] hover:underline flex items-center gap-1 font-mono text-xs"
                >
                  {approvalTxHash.slice(0, 8)}...{approvalTxHash.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {txHash && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Deposit TX</span>
                <a
                  href={`https://arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2470ff] hover:underline flex items-center gap-1 font-mono text-xs"
                >
                  {txHash.slice(0, 8)}...{txHash.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {completionTxHash && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Completion TX</span>
                <a
                  href={`https://arbiscan.io/tx/${completionTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-500 hover:underline flex items-center gap-1 font-mono text-xs"
                >
                  {completionTxHash.slice(0, 8)}...{completionTxHash.slice(-6)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {itpAmount && displayStatus === 'bridge_complete' && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Received</span>
                <span className="text-green-500 font-mono">
                  {parseFloat(formatUnits(itpAmount, 18)).toFixed(6)} {symbol}
                </span>
              </div>
            )}

            {usdcAmount && displayStatus === 'bridge_complete' && (
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Received</span>
                <span className="text-green-500 font-mono">
                  {parseFloat(formatUnits(usdcAmount, 6)).toFixed(2)} USDC
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bridge Processing Notice */}
        {showBridgeProgress && displayStatus !== 'bridge_complete' && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 mb-6">
            <p className="text-xs text-purple-500 text-center">
              {displayStatus === 'bridge_processing'
                ? "Bridge is executing your order on Orbit chain..."
                : "Waiting for bridge to pick up your order..."}
            </p>
          </div>
        )}

        {/* Skip Bridge Tracking Option */}
        {showBridgeProgress && displayStatus !== 'bridge_complete' && (
          <button
            onClick={onClose}
            className="w-full text-xs text-muted-foreground hover:text-primary mb-4 underline"
          >
            Close and track in Orders
          </button>
        )}

        {/* Action Button */}
        {statusInfo.canClose && (
          <CustomButton
            onClick={onClose}
            className={cn(
              "w-full",
              displayStatus === "bridge_complete"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-[#2470ff] hover:bg-[#1a5acc] text-white"
            )}
          >
            {displayStatus === "bridge_complete" ? "Done" : "Close"}
          </CustomButton>
        )}
      </div>
    </div>
  );
}

export default TransactionStatusModal;
