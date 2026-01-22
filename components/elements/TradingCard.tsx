"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertTriangle, Wallet, ChevronDown, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomButton } from "@/components/ui/custom-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/contexts/wallet-context";
import { useArbitrumBuy, type BuyStatus } from "@/hooks/useArbitrumBuy";
import { useArbitrumSell, type SellStatus } from "@/hooks/useArbitrumSell";
import { TransactionStatusModal } from "./TransactionStatusModal";
import { VirtualOrderbook } from "./VirtualOrderbook";

// Slippage options in percentage
const SLIPPAGE_OPTIONS = [0.5, 1.0, 2.0] as const;
const DEFAULT_SLIPPAGE = 1.0;

// Token decimal precision
const USDC_DECIMALS = 6;
const ITP_DECIMALS = 18;

/**
 * TradingCard Props
 */
interface TradingCardProps {
  /** ITP token address on Arbitrum */
  itpAddress: `0x${string}`;
  /** ITP token symbol (e.g., "DEFI10") */
  itpSymbol: string;
  /** ITP token name (e.g., "Top 10 DeFi Index") */
  itpName: string;
  /** Current price in USD */
  currentPrice: number;
  /** User's USDC balance (formatted string) */
  usdcBalance?: string;
  /** User's ITP balance (formatted string) */
  itpBalance?: string;
  /** Callback when transaction completes successfully */
  onSuccess?: () => void;
  /** Asset symbols in the index composition */
  assets?: string[];
  /** Weights in basis points (should sum to 10000) */
  weights?: number[];
}

type TabType = "buy" | "sell";

/**
 * Calculate price impact for display
 * For MVP, use simple slippage estimation
 */
function calculatePriceImpact(amount: number, isLargeOrder: boolean): number {
  if (amount <= 0) return 0;
  // Simple estimation:
  // Small orders (< $1000): 0.1-0.3% impact
  // Medium orders ($1000-$10000): 0.3-1% impact
  // Large orders (> $10000): 1%+ impact
  if (isLargeOrder) {
    return 0.5 + (amount / 100000); // Increases with size
  }
  if (amount > 10000) return 1.0;
  if (amount > 1000) return 0.5;
  return 0.2;
}

/**
 * Validate and sanitize amount input
 * Returns sanitized value or null if invalid
 */
function validateAmountInput(
  value: string,
  maxDecimals: number,
  maxBalance: number
): { isValid: boolean; sanitized: string; error?: string } {
  // Allow empty input
  if (value === "") {
    return { isValid: true, sanitized: "" };
  }

  // Remove leading zeros except for "0." pattern
  let sanitized = value.replace(/^0+(?=\d)/, "");

  // Handle decimal point at start
  if (sanitized.startsWith(".")) {
    sanitized = "0" + sanitized;
  }

  // Check for valid number format
  const numberRegex = /^[0-9]*\.?[0-9]*$/;
  if (!numberRegex.test(sanitized)) {
    return { isValid: false, sanitized: value, error: "Invalid number format" };
  }

  // Check decimal precision
  const parts = sanitized.split(".");
  if (parts[1] && parts[1].length > maxDecimals) {
    return {
      isValid: false,
      sanitized: `${parts[0]}.${parts[1].slice(0, maxDecimals)}`,
      error: `Maximum ${maxDecimals} decimal places`
    };
  }

  // Check for negative values (shouldn't happen with our regex, but safety check)
  const parsed = parseFloat(sanitized);
  if (parsed < 0) {
    return { isValid: false, sanitized: "0", error: "Amount must be positive" };
  }

  // Check against max balance
  if (parsed > maxBalance) {
    return { isValid: true, sanitized, error: "Exceeds available balance" };
  }

  return { isValid: true, sanitized };
}

/**
 * TradingCard Component
 *
 * Provides buy and sell functionality for ITP tokens.
 * Integrates with useArbitrumBuy and useArbitrumSell hooks.
 */
export function TradingCard({
  itpAddress,
  itpSymbol,
  itpName,
  currentPrice,
  usdcBalance = "0",
  itpBalance = "0",
  onSuccess,
  assets = [],
  weights = [],
}: TradingCardProps) {
  const { isConnected, connectWallet, switchNetwork } = useWallet();

  const [activeTab, setActiveTab] = useState<TabType>("buy");
  const [amount, setAmount] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showOrderbook, setShowOrderbook] = useState(false);
  const [slippage, setSlippage] = useState<number>(DEFAULT_SLIPPAGE);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [customSlippage, setCustomSlippage] = useState("");
  const [inputError, setInputError] = useState<string | undefined>();

  // Hooks
  const {
    executeBuy,
    status: buyStatus,
    error: buyError,
    txHash: buyTxHash,
    approvalTxHash: buyApprovalTxHash,
    depositNonce: buyNonce,
    reset: resetBuy,
    isCorrectChain: buyCorrectChain,
  } = useArbitrumBuy();

  const {
    executeSell,
    status: sellStatus,
    error: sellError,
    txHash: sellTxHash,
    approvalTxHash: sellApprovalTxHash,
    sellNonce,
    reset: resetSell,
    isCorrectChain: sellCorrectChain,
  } = useArbitrumSell();

  // Derived values
  const parsedAmount = parseFloat(amount) || 0;
  const isBuy = activeTab === "buy";
  const status = isBuy ? buyStatus : sellStatus;
  const error = isBuy ? buyError : sellError;
  const txHash = isBuy ? buyTxHash : sellTxHash;
  const approvalTxHash = isBuy ? buyApprovalTxHash : sellApprovalTxHash;
  const isCorrectChain = isBuy ? buyCorrectChain : sellCorrectChain;

  // Calculations
  const estimatedOutput = isBuy
    ? parsedAmount / currentPrice // USDC -> ITP
    : parsedAmount * currentPrice; // ITP -> USDC

  const priceImpact = calculatePriceImpact(
    isBuy ? parsedAmount : estimatedOutput,
    (isBuy ? parsedAmount : estimatedOutput) > 10000
  );
  const showPriceWarning = priceImpact > 1.0;

  // Balance checks
  const availableBalance = parseFloat(isBuy ? usdcBalance : itpBalance) || 0;
  const hasInsufficientBalance = parsedAmount > availableBalance;
  const isIdle = status === "idle";
  const isProcessing = ![
    "idle",
    "success",
    "error",
    "insufficient_balance",
    "approval_failed",
    "deposit_failed",
    "sell_failed",
  ].includes(status);

  // Handle form submit
  const handleSubmit = useCallback(async () => {
    if (!amount || parsedAmount <= 0) return;
    if (hasInsufficientBalance) return;

    setShowModal(true);

    if (isBuy) {
      await executeBuy({
        amount: amount,
        targetItpAddress: itpAddress,
      });
    } else {
      await executeSell({
        itpAddress: itpAddress,
        amount: amount,
      });
    }
  }, [amount, parsedAmount, hasInsufficientBalance, isBuy, executeBuy, executeSell, itpAddress]);

  // Handle max button
  const handleMax = useCallback(() => {
    setAmount(availableBalance.toString());
    setInputError(undefined);
  }, [availableBalance]);

  // Handle amount change with validation
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const maxDecimals = isBuy ? USDC_DECIMALS : ITP_DECIMALS;
      const validation = validateAmountInput(value, maxDecimals, availableBalance);

      if (validation.isValid) {
        setAmount(validation.sanitized);
        setInputError(validation.error);
      } else {
        // Still update with sanitized value but show error
        setAmount(validation.sanitized);
        setInputError(validation.error);
      }
    },
    [isBuy, availableBalance]
  );

  // Handle network switch
  const handleSwitchNetwork = useCallback(async () => {
    try {
      await switchNetwork("0xa4b1"); // Arbitrum One chain ID in hex
    } catch (err) {
      console.error("Failed to switch network:", err);
    }
  }, [switchNetwork]);

  // Handle slippage change
  const handleSlippageSelect = useCallback((value: number) => {
    setSlippage(value);
    setCustomSlippage("");
  }, []);

  const handleCustomSlippageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomSlippage(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
      setSlippage(parsed);
    }
  }, []);

  // Reset on tab change
  useEffect(() => {
    setAmount("");
    setInputError(undefined);
    resetBuy();
    resetSell();
  }, [activeTab, resetBuy, resetSell]);

  // Close modal and call onSuccess
  const handleModalClose = useCallback(() => {
    setShowModal(false);
    if (status === "success" && onSuccess) {
      onSuccess();
    }
    setAmount("");
    resetBuy();
    resetSell();
  }, [status, onSuccess, resetBuy, resetSell]);

  // Render wallet connect prompt if not connected
  if (!isConnected) {
    return (
      <div className="bg-foreground border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-primary mb-2">Connect Wallet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your wallet to trade {itpSymbol}
          </p>
          <CustomButton
            onClick={connectWallet}
            className="bg-[#2470ff] text-white hover:bg-[#1a5acc] focus:outline-none focus:ring-2 focus:ring-[#2470ff] focus:ring-offset-2 focus:ring-offset-background"
            aria-label={`Connect wallet to trade ${itpSymbol}`}
          >
            Connect Wallet
          </CustomButton>
        </div>
      </div>
    );
  }

  // Render network warning if wrong chain
  if (!isCorrectChain) {
    return (
      <div className="bg-foreground border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-primary mb-2">Wrong Network</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please switch to Arbitrum network to trade
          </p>
          <CustomButton
            onClick={handleSwitchNetwork}
            className="bg-[#2470ff] text-white hover:bg-[#1a5acc] focus:outline-none focus:ring-2 focus:ring-[#2470ff] focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Switch to Arbitrum network"
          >
            Switch to Arbitrum
          </CustomButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-foreground border border-border rounded-lg p-6">
        {/* Tabs with ARIA support */}
        <div className="flex gap-2 mb-6" role="tablist" aria-label="Trade type">
          <button
            role="tab"
            aria-selected={activeTab === "buy"}
            aria-controls="trade-panel"
            id="buy-tab"
            onClick={() => setActiveTab("buy")}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-background",
              activeTab === "buy"
                ? "bg-green-500/10 text-green-500 border border-green-500/30"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            Buy
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "sell"}
            aria-controls="trade-panel"
            id="sell-tab"
            onClick={() => setActiveTab("sell")}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-background",
              activeTab === "sell"
                ? "bg-red-500/10 text-red-500 border border-red-500/30"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            Sell
          </button>
        </div>

        {/* Slippage Settings */}
        <div className="mb-4">
          <button
            onClick={() => setShowSlippageSettings(!showSlippageSettings)}
            className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[#2470ff] focus:ring-offset-2 focus:ring-offset-background rounded"
            )}
            aria-expanded={showSlippageSettings}
            aria-label={`Slippage tolerance: ${slippage}%`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Slippage: {slippage}%</span>
          </button>

          {showSlippageSettings && (
            <div className="mt-2 p-3 bg-muted/30 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">Slippage tolerance:</span>
              </div>
              <div className="flex items-center gap-2">
                {SLIPPAGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSlippageSelect(option)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-[#2470ff] focus:ring-offset-1",
                      slippage === option && !customSlippage
                        ? "bg-[#2470ff] text-white"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                    aria-pressed={slippage === option && !customSlippage}
                  >
                    {option}%
                  </button>
                ))}
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Custom"
                    value={customSlippage}
                    onChange={handleCustomSlippageChange}
                    min="0.1"
                    max="50"
                    step="0.1"
                    className={cn(
                      "w-20 px-2 py-1.5 text-xs bg-background border border-border rounded-md",
                      "focus:outline-none focus:ring-2 focus:ring-[#2470ff]",
                      customSlippage ? "border-[#2470ff]" : ""
                    )}
                    aria-label="Custom slippage percentage"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
              {slippage > 5 && (
                <p className="mt-2 text-xs text-yellow-500">
                  High slippage may result in unfavorable trades
                </p>
              )}
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div
          className="space-y-2 mb-4"
          role="tabpanel"
          id="trade-panel"
          aria-labelledby={activeTab === "buy" ? "buy-tab" : "sell-tab"}
        >
          <div className="flex justify-between items-center">
            <Label htmlFor="amount-input">
              {isBuy ? "Amount (USDC)" : `Amount (${itpSymbol})`}
            </Label>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              Balance: {availableBalance.toFixed(4)} {isBuy ? "USDC" : itpSymbol}
            </span>
          </div>
          <div className="relative">
            <Input
              id="amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              className={cn(
                "bg-background border-border h-12 font-mono pr-16",
                "focus:ring-2 focus:ring-[#2470ff] focus:ring-offset-0",
                (hasInsufficientBalance || inputError) && amount && "border-red-500 focus:ring-red-500"
              )}
              disabled={isProcessing}
              aria-invalid={!!(hasInsufficientBalance || inputError) && !!amount}
              aria-describedby={inputError || hasInsufficientBalance ? "amount-error" : undefined}
            />
            <button
              onClick={handleMax}
              disabled={isProcessing}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-[#2470ff]/10 text-[#2470ff] rounded",
                "hover:bg-[#2470ff]/20 disabled:opacity-50",
                "focus:outline-none focus:ring-2 focus:ring-[#2470ff] focus:ring-offset-1"
              )}
              aria-label={`Set maximum amount: ${availableBalance.toFixed(4)} ${isBuy ? "USDC" : itpSymbol}`}
            >
              MAX
            </button>
          </div>
          {(hasInsufficientBalance || inputError) && amount && (
            <p id="amount-error" className="text-xs text-red-500" role="alert">
              {inputError || "Insufficient balance"}
            </p>
          )}
        </div>

        {/* Estimated Output */}
        {parsedAmount > 0 && (
          <div
            className="bg-muted/30 border border-border rounded-lg p-3 mb-4 space-y-2"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isBuy ? "You receive (est.)" : "You get back (est.)"}
              </span>
              <span className="text-primary font-mono">
                {estimatedOutput.toFixed(4)} {isBuy ? itpSymbol : "USDC"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price</span>
              <span className="text-primary font-mono">${currentPrice.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Slippage tolerance</span>
              <span className="text-muted-foreground font-mono">{slippage}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Min. received</span>
              <span className="text-primary font-mono">
                {(estimatedOutput * (1 - slippage / 100)).toFixed(4)} {isBuy ? itpSymbol : "USDC"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Price impact</span>
              <span
                className={cn(
                  "font-mono",
                  showPriceWarning ? "text-red-500" : "text-muted-foreground"
                )}
              >
                ~{priceImpact.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Price Impact Warning */}
        {showPriceWarning && parsedAmount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-xs text-red-500">
              High price impact! Consider splitting into smaller orders.
            </span>
          </div>
        )}

        {/* Submit Button */}
        <CustomButton
          onClick={handleSubmit}
          disabled={
            isProcessing ||
            !amount ||
            parsedAmount <= 0 ||
            hasInsufficientBalance ||
            !!inputError
          }
          className={cn(
            "w-full h-12 text-white font-medium",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
            isBuy
              ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
              : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
          )}
          aria-label={`${isBuy ? "Buy" : "Sell"} ${parsedAmount > 0 ? parsedAmount : ""} ${itpSymbol}`}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Processing...</span>
            </span>
          ) : (
            `${isBuy ? "Buy" : "Sell"} ${itpSymbol}`
          )}
        </CustomButton>

        {/* Orderbook Toggle */}
        {assets.length > 0 && weights.length > 0 && (
          <button
            type="button"
            onClick={() => setShowOrderbook(!showOrderbook)}
            className={cn(
              "w-full flex items-center justify-center gap-2 mt-4 py-2 text-sm text-muted-foreground",
              "hover:text-primary transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-[#2470ff] focus:ring-offset-2 focus:ring-offset-background rounded"
            )}
            aria-expanded={showOrderbook}
            aria-controls="liquidity-panel"
            aria-label={showOrderbook ? "Hide liquidity details" : "Show liquidity details"}
          >
            <span>View Liquidity</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                showOrderbook && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {/* Virtual Orderbook */}
      {showOrderbook && assets.length > 0 && weights.length > 0 && (
        <div className="mt-4" id="liquidity-panel" role="region" aria-label="Liquidity details">
          <VirtualOrderbook
            symbols={assets}
            weights={(() => {
              // Convert weights from decimal (0.0076) to basis points (76)
              // and ensure they sum to exactly 10000
              const rawBps = weights.map((w) => Math.round(w * 10000));
              const sum = rawBps.reduce((a, b) => a + b, 0);
              if (sum !== 10000 && rawBps.length > 0) {
                // Adjust the first weight to make sum equal to 10000
                rawBps[0] += 10000 - sum;
              }
              return rawBps;
            })()}
            displayLevels={5}
            compact={true}
            baseMidPrice={currentPrice}
          />
        </div>
      )}

      {/* Transaction Status Modal */}
      <TransactionStatusModal
        isOpen={showModal}
        onClose={handleModalClose}
        status={status}
        error={error}
        txHash={txHash}
        approvalTxHash={approvalTxHash}
        isBuy={isBuy}
        amount={amount}
        symbol={itpSymbol}
        nonce={isBuy ? buyNonce : sellNonce}
        trackBridgeStatus={true}
      />
    </>
  );
}

export default TradingCard;
