"use client";

/**
 * BridgeErrorState Component
 *
 * Error display component for bridge operations.
 * Shows contextual error messages with retry and support options.
 *
 * @see Story 3-3 Task 5
 */

import { AlertTriangle, RefreshCw, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Known bridge error types for specific handling
 */
export type BridgeErrorType =
  | "arbitrum_reverted"
  | "bridge_timeout"
  | "orbit_gas_error"
  | "contract_execution_failed"
  | "user_rejected"
  | "insufficient_balance"
  | "approval_failed"
  | "network_error"
  | "unknown";

/**
 * Error info with context
 */
export interface BridgeErrorInfo {
  /** Type of error for specific messaging */
  type: BridgeErrorType;
  /** Human-readable error message */
  message: string;
  /** Technical details (optional, for debugging) */
  details?: string;
  /** Which step failed */
  failedStep?: "submit" | "arbitrum" | "bridge" | "orbit";
  /** Transaction hash if available */
  txHash?: string;
}

/**
 * Props for BridgeErrorState
 */
export interface BridgeErrorStateProps {
  /** Error information */
  error: BridgeErrorInfo;
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for contact support */
  onContactSupport?: () => void;
  /** Whether retry is allowed for this error */
  canRetry?: boolean;
  /** Optional CSS class */
  className?: string;
}

/**
 * Get user-friendly message for error type
 */
function getErrorMessage(type: BridgeErrorType, defaultMessage: string): string {
  switch (type) {
    case "arbitrum_reverted":
      return "Transaction reverted on Arbitrum. This may be due to insufficient balance or contract state.";
    case "bridge_timeout":
      return "Bridge operation timed out. The transaction may still complete - please check your wallet in a few minutes.";
    case "orbit_gas_error":
      return "Unexpected error on Orbit chain. Gas should be free - this indicates a system issue.";
    case "contract_execution_failed":
      return "Contract execution failed. The operation could not be completed.";
    case "user_rejected":
      return "Transaction was rejected in your wallet.";
    case "insufficient_balance":
      return "Insufficient balance for this operation.";
    case "approval_failed":
      return "Token approval failed. Please try again.";
    case "network_error":
      return "Network connection error. Please check your connection and try again.";
    default:
      return defaultMessage || "An unexpected error occurred.";
  }
}

/**
 * Determine if error type is retryable
 */
function isRetryable(type: BridgeErrorType): boolean {
  switch (type) {
    case "user_rejected":
    case "network_error":
    case "approval_failed":
      return true;
    case "insufficient_balance":
    case "arbitrum_reverted":
    case "contract_execution_failed":
      return false; // Needs user action first
    case "bridge_timeout":
    case "orbit_gas_error":
    case "unknown":
      return true; // Worth retrying
    default:
      return true;
  }
}

/**
 * Error state display for bridge operations.
 *
 * Provides:
 * - Contextual error messages based on error type
 * - Retry button for recoverable errors
 * - Contact support option
 * - Technical details for debugging
 *
 * Usage:
 * ```tsx
 * <BridgeErrorState
 *   error={{
 *     type: 'arbitrum_reverted',
 *     message: 'Transaction reverted',
 *     failedStep: 'arbitrum',
 *   }}
 *   onRetry={() => handleRetry()}
 *   onContactSupport={() => openSupport()}
 * />
 * ```
 */
export function BridgeErrorState({
  error,
  onRetry,
  onContactSupport,
  canRetry,
  className,
}: BridgeErrorStateProps) {
  const retryAllowed = canRetry ?? isRetryable(error.type);
  const userMessage = getErrorMessage(error.type, error.message);

  return (
    <div
      className={cn(
        "p-4 bg-red-500/10 border border-red-500/20 rounded-lg",
        className
      )}
    >
      {/* Error header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-500">Operation Failed</p>
          <p className="text-sm text-red-400 mt-1">{userMessage}</p>

          {/* Failed step indicator */}
          {error.failedStep && (
            <p className="text-xs text-red-400/70 mt-2">
              Failed at:{" "}
              <span className="font-mono">
                {error.failedStep === "submit" && "Transaction submission"}
                {error.failedStep === "arbitrum" && "Arbitrum confirmation"}
                {error.failedStep === "bridge" && "Bridge processing"}
                {error.failedStep === "orbit" && "Orbit completion"}
              </span>
            </p>
          )}

          {/* Technical details (collapsed by default) */}
          {error.details && (
            <details className="mt-3">
              <summary className="text-xs text-red-400/60 cursor-pointer hover:text-red-400">
                Technical details
              </summary>
              <pre className="mt-2 p-2 bg-red-500/5 rounded text-xs text-red-400/70 overflow-x-auto whitespace-pre-wrap break-all">
                {error.details}
              </pre>
            </details>
          )}

          {/* Transaction hash if available */}
          {error.txHash && (
            <p className="text-xs text-red-400/60 mt-2 font-mono truncate">
              Tx: {error.txHash}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {retryAllowed && onRetry && (
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Retry
          </Button>
        )}

        {onContactSupport && (
          <Button
            onClick={onContactSupport}
            size="sm"
            variant="ghost"
            className="flex-1 text-secondary hover:text-primary"
          >
            <MessageCircle className="w-4 h-4 mr-1.5" />
            Contact Support
          </Button>
        )}
      </div>

      {/* Help text for specific errors */}
      {error.type === "insufficient_balance" && (
        <p className="text-xs text-secondary mt-3">
          Please ensure you have enough USDC in your wallet and try again.
        </p>
      )}

      {error.type === "bridge_timeout" && (
        <p className="text-xs text-secondary mt-3">
          Your transaction may still complete. Check your wallet balances before retrying.
        </p>
      )}
    </div>
  );
}

/**
 * Parses an error into BridgeErrorInfo
 */
export function parseBridgeError(
  error: unknown,
  failedStep?: BridgeErrorInfo["failedStep"]
): BridgeErrorInfo {
  // Handle known error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("user rejected") || message.includes("user denied")) {
      return {
        type: "user_rejected",
        message: "Transaction was rejected in your wallet",
        failedStep,
      };
    }

    if (message.includes("insufficient") || message.includes("balance")) {
      return {
        type: "insufficient_balance",
        message: "Insufficient balance for this operation",
        failedStep,
        details: error.message,
      };
    }

    if (message.includes("reverted") || message.includes("revert")) {
      return {
        type: "arbitrum_reverted",
        message: "Transaction reverted",
        failedStep,
        details: error.message,
      };
    }

    if (message.includes("timeout") || message.includes("timed out")) {
      return {
        type: "bridge_timeout",
        message: "Operation timed out",
        failedStep,
        details: error.message,
      };
    }

    if (message.includes("network") || message.includes("connection")) {
      return {
        type: "network_error",
        message: "Network connection error",
        failedStep,
        details: error.message,
      };
    }

    return {
      type: "unknown",
      message: error.message,
      failedStep,
      details: error.stack,
    };
  }

  // Handle string errors
  if (typeof error === "string") {
    return {
      type: "unknown",
      message: error,
      failedStep,
    };
  }

  // Handle unknown errors
  return {
    type: "unknown",
    message: "An unexpected error occurred",
    failedStep,
    details: String(error),
  };
}

export default BridgeErrorState;
