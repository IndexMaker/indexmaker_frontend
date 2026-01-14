"use client";

/**
 * BridgeProgress Component
 *
 * Multi-step progress indicator for bridge operations (buy/sell).
 * Displays the state of each step in the cross-chain transaction flow:
 * 1. Arbitrum transaction submitted
 * 2. Arbitrum confirmation
 * 3. Bridge processing (Orbit)
 * 4. Operation complete
 *
 * @see Story 3-3 Task 1
 */

import { CheckCircle2, Circle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Step status for each phase of the bridge operation
 */
export type BridgeStepStatus = "pending" | "in-progress" | "completed" | "error";

/**
 * Operation type for visual differentiation
 */
export type BridgeOperationType = "buy" | "sell";

/**
 * Individual step data
 */
export interface BridgeStep {
  /** Step identifier */
  id: string;
  /** Display label for this step */
  label: string;
  /** Current status of this step */
  status: BridgeStepStatus;
  /** Timestamp when step was completed (ISO string) */
  completedAt?: string;
  /** Error message if status is 'error' */
  errorMessage?: string;
}

/**
 * Props for the BridgeProgress component
 */
export interface BridgeProgressProps {
  /** Type of operation (buy or sell) - affects visual styling */
  operationType: BridgeOperationType;
  /** Current steps and their statuses */
  steps: BridgeStep[];
  /** Optional CSS class */
  className?: string;
}

/**
 * Returns the appropriate icon for a step status
 */
function StepIcon({ status }: { status: BridgeStepStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="text-blue-500 w-5 h-5" />;
    case "error":
      return <XCircle className="text-red-500 w-5 h-5" />;
    case "in-progress":
      return <Loader2 className="text-blue-500 w-5 h-5 animate-spin" />;
    case "pending":
    default:
      return <Circle className="text-secondary w-5 h-5" />;
  }
}

/**
 * Formats a timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Multi-step progress indicator for bridge operations.
 *
 * Usage:
 * ```tsx
 * const steps: BridgeStep[] = [
 *   { id: 'submit', label: 'Transaction submitted', status: 'completed', completedAt: '2024-01-14T10:00:00Z' },
 *   { id: 'confirm', label: 'Arbitrum confirmation', status: 'in-progress' },
 *   { id: 'bridge', label: 'Bridging to Orbit...', status: 'pending' },
 *   { id: 'complete', label: 'Buy complete!', status: 'pending' },
 * ];
 *
 * <BridgeProgress operationType="buy" steps={steps} />
 * ```
 */
export function BridgeProgress({
  operationType,
  steps,
  className,
}: BridgeProgressProps) {
  // Determine accent color based on operation type
  const accentColor = operationType === "buy" ? "text-blue-500" : "text-green-500";
  const bgAccent = operationType === "buy" ? "bg-blue-500" : "bg-green-500";

  return (
    <div className={cn("space-y-3", className)}>
      {/* Operation type badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full uppercase",
            operationType === "buy"
              ? "bg-blue-500/10 text-blue-500"
              : "bg-green-500/10 text-green-500"
          )}
        >
          {operationType}
        </span>
        <span className="text-sm text-secondary">Bridge Operation</span>
      </div>

      {/* Steps list */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-accent" />

        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3 relative pb-4 last:pb-0">
            {/* Step icon with background to cover the line */}
            <div className="relative z-10 bg-background">
              <StepIcon status={step.status} />
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.status === "completed" && "text-primary",
                  step.status === "in-progress" && accentColor,
                  step.status === "pending" && "text-secondary",
                  step.status === "error" && "text-red-500"
                )}
              >
                {step.label}
              </p>

              {/* Timestamp for completed steps */}
              {step.status === "completed" && step.completedAt && (
                <p className="text-xs text-secondary mt-0.5">
                  {formatTimestamp(step.completedAt)}
                </p>
              )}

              {/* Animated pulse indicator for in-progress */}
              {step.status === "in-progress" && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        bgAccent
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex rounded-full h-2 w-2",
                        bgAccent
                      )}
                    />
                  </span>
                  <span className="text-xs text-secondary">Processing...</span>
                </div>
              )}

              {/* Error message */}
              {step.status === "error" && step.errorMessage && (
                <p className="text-xs text-red-400 mt-0.5">{step.errorMessage}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Labels for buy steps - can be overridden with translations
 */
export interface BuyStepLabels {
  submitted: string;
  confirmed: string;
  bridging: string;
  complete: string;
}

/**
 * Default English labels for buy steps
 */
export const DEFAULT_BUY_LABELS: BuyStepLabels = {
  submitted: "Transaction submitted",
  confirmed: "Deposit confirmed on Arbitrum",
  bridging: "Bridging to Orbit...",
  complete: "Buy complete!",
};

/**
 * Creates the default steps for a buy operation
 * @param currentStatus - Current status of the bridge operation
 * @param timestamps - Optional timestamps for each step
 * @param errorMessage - Error message if status is error
 * @param labels - Optional translated labels (defaults to English)
 */
export function createBuySteps(
  currentStatus: "pending" | "arbitrum-confirmed" | "orbit-processing" | "completed" | "error",
  timestamps?: {
    submitted?: string;
    arbitrumConfirmed?: string;
    orbitProcessing?: string;
    completed?: string;
  },
  errorMessage?: string,
  labels: BuyStepLabels = DEFAULT_BUY_LABELS
): BridgeStep[] {
  const getStatus = (
    stepIndex: number,
    currentStatusIndex: number
  ): BridgeStepStatus => {
    if (currentStatus === "error" && stepIndex === currentStatusIndex) {
      return "error";
    }
    if (stepIndex < currentStatusIndex) return "completed";
    if (stepIndex === currentStatusIndex) return "in-progress";
    return "pending";
  };

  const statusIndex =
    currentStatus === "pending"
      ? 0
      : currentStatus === "arbitrum-confirmed"
        ? 1
        : currentStatus === "orbit-processing"
          ? 2
          : currentStatus === "completed"
            ? 4 // All complete
            : 0;

  return [
    {
      id: "submit",
      label: labels.submitted,
      status: getStatus(0, statusIndex),
      completedAt: timestamps?.submitted,
    },
    {
      id: "confirm",
      label: labels.confirmed,
      status: getStatus(1, statusIndex),
      completedAt: timestamps?.arbitrumConfirmed,
    },
    {
      id: "bridge",
      label: labels.bridging,
      status: getStatus(2, statusIndex),
      completedAt: timestamps?.orbitProcessing,
    },
    {
      id: "complete",
      label: labels.complete,
      status: getStatus(3, statusIndex),
      completedAt: timestamps?.completed,
      errorMessage: currentStatus === "error" ? errorMessage : undefined,
    },
  ];
}

/**
 * Labels for sell steps - can be overridden with translations
 */
export interface SellStepLabels {
  submitted: string;
  confirmed: string;
  processing: string;
  complete: string;
}

/**
 * Default English labels for sell steps
 */
export const DEFAULT_SELL_LABELS: SellStepLabels = {
  submitted: "Transaction submitted",
  confirmed: "Sell requested on Arbitrum",
  processing: "Processing on Orbit...",
  complete: "Sell complete!",
};

/**
 * Creates the default steps for a sell operation
 * @param currentStatus - Current status of the bridge operation
 * @param timestamps - Optional timestamps for each step
 * @param errorMessage - Error message if status is error
 * @param labels - Optional translated labels (defaults to English)
 */
export function createSellSteps(
  currentStatus: "pending" | "arbitrum-confirmed" | "orbit-processing" | "completed" | "error",
  timestamps?: {
    submitted?: string;
    arbitrumConfirmed?: string;
    orbitProcessing?: string;
    completed?: string;
  },
  errorMessage?: string,
  labels: SellStepLabels = DEFAULT_SELL_LABELS
): BridgeStep[] {
  const getStatus = (
    stepIndex: number,
    currentStatusIndex: number
  ): BridgeStepStatus => {
    if (currentStatus === "error" && stepIndex === currentStatusIndex) {
      return "error";
    }
    if (stepIndex < currentStatusIndex) return "completed";
    if (stepIndex === currentStatusIndex) return "in-progress";
    return "pending";
  };

  const statusIndex =
    currentStatus === "pending"
      ? 0
      : currentStatus === "arbitrum-confirmed"
        ? 1
        : currentStatus === "orbit-processing"
          ? 2
          : currentStatus === "completed"
            ? 4 // All complete
            : 0;

  return [
    {
      id: "submit",
      label: labels.submitted,
      status: getStatus(0, statusIndex),
      completedAt: timestamps?.submitted,
    },
    {
      id: "confirm",
      label: labels.confirmed,
      status: getStatus(1, statusIndex),
      completedAt: timestamps?.arbitrumConfirmed,
    },
    {
      id: "bridge",
      label: labels.processing,
      status: getStatus(2, statusIndex),
      completedAt: timestamps?.orbitProcessing,
    },
    {
      id: "complete",
      label: labels.complete,
      status: getStatus(3, statusIndex),
      completedAt: timestamps?.completed,
      errorMessage: currentStatus === "error" ? errorMessage : undefined,
    },
  ];
}

export default BridgeProgress;
