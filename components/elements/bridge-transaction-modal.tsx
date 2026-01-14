"use client";

/**
 * BridgeTransactionModal Component
 *
 * Modal for bridge buy/sell operations via BridgeProxy on Arbitrum.
 * Displays multi-step progress, dual-chain transaction links, and error handling.
 *
 * This component extends the transaction flow for bridge operations while
 * keeping the existing TransactionConfirmModal for OTC flows.
 *
 * @see Story 3-3 Task 4
 */

import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/contexts/wallet-context";
import { BridgeProgress, createBuySteps, createSellSteps, type BridgeStep } from "./bridge-progress";
import { DualTxLinks } from "./tx-links";
import { useOrbitEventMonitor } from "@/hooks/useOrbitEventMonitor";

/**
 * Bridge operation status
 */
export type BridgeStatus =
  | "pending"
  | "arbitrum-confirmed"
  | "orbit-processing"
  | "completed"
  | "error";

/**
 * Props for the BridgeTransactionModal
 */
export interface BridgeTransactionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Type of bridge operation */
  operationType: "buy" | "sell";
  /** Amount in USDC (for buy) or ITP (for sell) */
  amount: string;
  /** Target ITP address (for buy) or source ITP address (for sell) */
  itpAddress?: `0x${string}`;
  /** ITP symbol for display */
  itpSymbol?: string;
  /** Callback when operation completes successfully */
  onSuccess?: (data: { arbitrumTxHash: string; orbitTxHash?: string; amount: string }) => void;
  /** Callback when operation fails */
  onError?: (error: string) => void;
}

/**
 * Bridge Transaction Modal for Arbitrum <-> Orbit bridge operations.
 *
 * Usage:
 * ```tsx
 * <BridgeTransactionModal
 *   isOpen={showBridgeModal}
 *   onClose={() => setShowBridgeModal(false)}
 *   operationType="buy"
 *   amount="100"
 *   itpAddress="0x..."
 *   itpSymbol="ITP-USD"
 *   onSuccess={({ arbitrumTxHash }) => console.log('Success!', arbitrumTxHash)}
 * />
 * ```
 */
export function BridgeTransactionModal({
  isOpen,
  onClose,
  operationType,
  amount,
  itpAddress,
  itpSymbol = "ITP",
  onSuccess,
  onError,
}: BridgeTransactionModalProps) {
  const { wallet, connectWallet } = useWallet();

  // Bridge operation state
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>("pending");
  const [arbitrumTxHash, setArbitrumTxHash] = useState<string | null>(null);
  const [orbitTxHash, setOrbitTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Timestamps for progress display
  const [timestamps, setTimestamps] = useState<{
    submitted?: string;
    arbitrumConfirmed?: string;
    orbitProcessing?: string;
    completed?: string;
  }>({});

  // Orbit event monitor
  const {
    status: monitorStatus,
    eventData,
    error: monitorError,
    startMonitoring,
    stopMonitoring,
    reset: resetMonitor,
  } = useOrbitEventMonitor();

  // Generate progress steps based on current status
  const steps: BridgeStep[] =
    operationType === "buy"
      ? createBuySteps(bridgeStatus, timestamps, errorMessage || undefined)
      : createSellSteps(bridgeStatus, timestamps, errorMessage || undefined);

  /**
   * Handle Arbitrum transaction submission
   *
   * STUB: Currently logs the operation since contracts aren't deployed.
   * When contracts are available, this will call the actual BridgeProxy functions.
   */
  const handleSubmitTransaction = useCallback(async () => {
    if (!wallet?.accounts?.[0]?.address) {
      await connectWallet();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setBridgeStatus("pending");
    setTimestamps({ submitted: new Date().toISOString() });

    try {
      // STUB: Log the operation (contracts not deployed)
      console.log("[BridgeTransactionModal] Submit transaction (STUB)", {
        operationType,
        amount,
        itpAddress,
        userAddress: wallet.accounts[0].address,
      });

      // Simulate Arbitrum tx submission
      // TODO: Replace with actual BridgeProxy contract call when deployed
      //
      // if (operationType === 'buy') {
      //   const { executeBuy } = useArbitrumBuy();
      //   const result = await executeBuy({ amount, targetItpAddress: itpAddress! });
      //   if (result.txHash) setArbitrumTxHash(result.txHash);
      // } else {
      //   const { executeSell } = useArbitrumSell();
      //   const result = await executeSell({ itpAddress: itpAddress!, amount });
      //   if (result.txHash) setArbitrumTxHash(result.txHash);
      // }

      toast.warning(
        "Bridge contracts not yet deployed - this is a preview of the transaction flow"
      );

      // For now, simulate successful Arbitrum confirmation
      setTimeout(() => {
        setBridgeStatus("arbitrum-confirmed");
        setTimestamps((prev) => ({
          ...prev,
          arbitrumConfirmed: new Date().toISOString(),
        }));
        // Simulate a mock tx hash for UI testing
        setArbitrumTxHash("0x" + "0".repeat(64));
      }, 2000);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed";
      setErrorMessage(message);
      setBridgeStatus("error");
      toast.error(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  }, [wallet, connectWallet, operationType, amount, itpAddress, onError]);

  /**
   * Start Orbit monitoring when Arbitrum tx confirms
   */
  useEffect(() => {
    if (bridgeStatus === "arbitrum-confirmed" && wallet?.accounts?.[0]?.address) {
      setBridgeStatus("orbit-processing");
      setTimestamps((prev) => ({
        ...prev,
        orbitProcessing: new Date().toISOString(),
      }));

      // Start monitoring Orbit chain for completion event
      startMonitoring({
        userAddress: wallet.accounts[0].address as `0x${string}`,
        operationType,
        timeout: 300000, // 5 minutes
      });
    }
  }, [bridgeStatus, wallet, operationType, startMonitoring]);

  /**
   * Handle Orbit event detection
   */
  useEffect(() => {
    if (monitorStatus === "completed" && eventData) {
      setBridgeStatus("completed");
      setTimestamps((prev) => ({
        ...prev,
        completed: new Date().toISOString(),
      }));
      if (eventData.txHash) {
        setOrbitTxHash(eventData.txHash);
      }
      toast.success(
        operationType === "buy" ? "Buy complete!" : "Sell complete!"
      );
      onSuccess?.({
        arbitrumTxHash: arbitrumTxHash || "",
        orbitTxHash: eventData.txHash,
        amount,
      });
    }

    if (monitorStatus === "timeout") {
      // Don't mark as error - operation may still complete
      toast.warning("Bridge operation is taking longer than expected");
    }

    if (monitorStatus === "failed" && monitorError) {
      setErrorMessage(monitorError);
      setBridgeStatus("error");
      onError?.(monitorError);
    }
  }, [monitorStatus, eventData, monitorError, operationType, amount, arbitrumTxHash, onSuccess, onError]);

  /**
   * Handle retry for failed operations
   */
  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setBridgeStatus("pending");
    setArbitrumTxHash(null);
    setOrbitTxHash(null);
    setTimestamps({});
    resetMonitor();
  }, [resetMonitor]);

  /**
   * Reset state when modal closes
   */
  const handleClose = useCallback(() => {
    stopMonitoring();
    setBridgeStatus("pending");
    setArbitrumTxHash(null);
    setOrbitTxHash(null);
    setErrorMessage(null);
    setTimestamps({});
    setIsProcessing(false);
    resetMonitor();
    onClose();
  }, [onClose, stopMonitoring, resetMonitor]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md bg-background border-accent text-primary z-50"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="text-lg font-bold">
          {operationType === "buy" ? "Buy via Bridge" : "Sell via Bridge"}
        </DialogTitle>

        <div className="space-y-6 py-4">
          {/* Operation summary */}
          <div className="p-3 bg-foreground rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span className="text-secondary">Amount</span>
              <span className="font-medium">
                {amount} {operationType === "buy" ? "USDC" : itpSymbol}
              </span>
            </div>
            {itpSymbol && (
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-secondary">
                  {operationType === "buy" ? "Buying" : "Selling"}
                </span>
                <span className="font-medium">{itpSymbol}</span>
              </div>
            )}
          </div>

          {/* Progress indicator */}
          <BridgeProgress operationType={operationType} steps={steps} />

          {/* Transaction links */}
          {arbitrumTxHash && (
            <div className="pt-2 border-t border-accent">
              <p className="text-xs text-secondary mb-2">Transaction Details</p>
              <DualTxLinks
                arbitrumTxHash={arbitrumTxHash}
                orbitTxHash={orbitTxHash}
              />
            </div>
          )}

          {/* Error state with retry */}
          {bridgeStatus === "error" && errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-500 font-medium">
                    Operation Failed
                  </p>
                  <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={handleRetry}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Retry
                </Button>
                <Button
                  onClick={handleClose}
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {bridgeStatus === "pending" && !isProcessing && (
            <Button
              onClick={handleSubmitTransaction}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isProcessing}
            >
              {operationType === "buy" ? "Confirm Buy" : "Confirm Sell"}
            </Button>
          )}

          {isProcessing && (
            <Button disabled className="w-full">
              <span className="inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            </Button>
          )}

          {bridgeStatus === "completed" && (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}

          {/* Support link */}
          {bridgeStatus === "error" && (
            <p className="text-xs text-center text-secondary">
              Need help?{" "}
              <a href="#" className="text-blue-500 hover:underline">
                Contact Support
              </a>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BridgeTransactionModal;
