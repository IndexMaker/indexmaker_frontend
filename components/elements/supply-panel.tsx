"use client";

/**
 * SupplyPanel - Buy/Sell ITP tokens via Bridge
 *
 * Inline execution without popup modals.
 * Uses useArbitrumBuy and useArbitrumSell hooks for direct bridge transactions.
 */

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { useQuoteContext } from "@/contexts/quote-context";
import { useWallet } from "@/contexts/wallet-context";
import { getViemClient } from "@/lib/blocknative/viem";
import { ERC20_ABI, TOKEN_METADATA } from "@/lib/data";
import { cn, shortenAddress } from "@/lib/utils";
import { RootState } from "@/redux/store";
import { removeSelectedVault, updateVaultAmount } from "@/redux/vaultSlice";
import { IndexListEntry } from "@/types/index";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMediaQuery } from "react-responsive";
import { formatEther, formatUnits, parseUnits } from "viem";
import USDC from "../../public/logos/usd-coin.png";
import IndexMaker from "../icons/indexmaker";
import Info from "../icons/info";
import NavigationAlert from "../icons/navigation-alert";
import AddressIdenticon from "./AddressIdenticon";
import AnimatedPrice from "./animate-price";
import CustomTooltip from "./custom-tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useArbitrumBuy } from "@/hooks/useArbitrumBuy";
import { useArbitrumSell } from "@/hooks/useArbitrumSell";
import { useBridgedItps } from "@/hooks/useBridgedItps";
import {
  hasSufficientUsdcBalance,
  USDC_DECIMALS,
} from "@/lib/contracts/balance-utils";
import { ARBITRUM_CHAIN_ID } from "@/lib/contracts/addresses";
import { toast } from "sonner";
import { VirtualOrderbook } from "./VirtualOrderbook";

interface SupplyPanelProps {
  vaultIds: VaultInfo[];
  vaults: IndexListEntry[];
  onClose: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}
interface VaultInfo {
  name: string;
  ticker: string;
  address: string;
  amount: string;
}

export function SupplyPanel({
  vaultIds,
  vaults,
  onClose,
  open,
  setOpen,
}: SupplyPanelProps) {
  const pollInterval = 30_000;
  const { wallet, connectWallet } = useWallet();
  const { indexPrices } = useQuoteContext();
  const [quantity, setQuantity] = useState<{ [key: string]: number }>({});
  const { t } = useLanguage();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [insufficientValue, setInsufficientValue] = useState(false);
  const { currentChainId } = useSelector((state: RootState) => state.network);
  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );
  const [balances, setBalances] = useState<{ [key: string]: number }>({});
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [arbitrumBalanceError, setArbitrumBalanceError] = useState<string | null>(null);
  const [itpBalance, setItpBalance] = useState<string>("0");

  const dispatch = useDispatch();

  // Bridge hooks
  const {
    executeBuy,
    status: buyStatus,
    error: buyError,
    txHash: buyTxHash,
    reset: resetBuy,
    isCorrectChain: buyCorrectChain,
  } = useArbitrumBuy();

  const {
    executeSell,
    status: sellStatus,
    error: sellError,
    txHash: sellTxHash,
    reset: resetSell,
    isCorrectChain: sellCorrectChain,
  } = useArbitrumSell();

  // Get bridged ITPs for address lookup
  const { itps, findBySymbol, getItpAddress, isLoading: itpsLoading } = useBridgedItps();

  // Current status based on active tab
  const currentStatus = activeTab === "buy" ? buyStatus : sellStatus;
  const currentError = activeTab === "buy" ? buyError : sellError;
  const currentTxHash = activeTab === "buy" ? buyTxHash : sellTxHash;
  const isCorrectChain = activeTab === "buy" ? buyCorrectChain : sellCorrectChain;

  // Status helpers
  const isProcessing = !["idle", "success", "error", "insufficient_balance", "approval_failed", "deposit_failed", "sell_failed"].includes(currentStatus);
  const isSuccess = currentStatus === "success";
  const isError = currentStatus === "error" || currentStatus === "approval_failed" || currentStatus === "deposit_failed" || currentStatus === "sell_failed" || currentStatus === "insufficient_balance";

  // Get current vault and amount
  const currentVault = vaults[0];
  const currentAmount = selectedVault[0]?.amount || "0";
  const parsedAmount = parseFloat(currentAmount) || 0;

  // Find ITP address for current vault.
  // Prefer arbitrumAddress from the vault data (set by earn-content from backend ITP list).
  // Fall back to useBridgedItps symbol lookup.
  const currentItpAddress = currentVault?.arbitrumAddress
    || (currentVault?.ticker ? getItpAddress(currentVault.ticker) : undefined);

  /**
   * Validate USDC balance on Arbitrum
   */
  const validateArbitrumBalance = useCallback(
    async (requiredAmount: string): Promise<boolean> => {
      const chainIdNum = currentChainId ? parseInt(currentChainId, 16) : null;
      if (chainIdNum !== ARBITRUM_CHAIN_ID) {
        setArbitrumBalanceError(null);
        return true;
      }

      if (!wallet?.accounts?.[0]?.address) {
        setArbitrumBalanceError("Wallet not connected");
        return false;
      }

      try {
        if (!currentChainId) {
          setArbitrumBalanceError("Chain not detected");
          return false;
        }
        const client = getViemClient(currentChainId);
        const amountWei = parseUnits(requiredAmount || "0", USDC_DECIMALS);
        const userAddress = wallet.accounts[0].address as `0x${string}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await hasSufficientUsdcBalance(client as any, userAddress, amountWei);

        if (!result.isSufficient) {
          const shortfallFormatted = formatUnits(result.shortfall, USDC_DECIMALS);
          setArbitrumBalanceError(
            `Insufficient USDC. You need ${shortfallFormatted} more USDC.`
          );
          setInsufficientValue(true);
          return false;
        }

        setArbitrumBalanceError(null);
        return true;
      } catch (error) {
        console.error("[SupplyPanel] Arbitrum balance validation error:", error);
        setArbitrumBalanceError(null);
        return true;
      }
    },
    [currentChainId, wallet]
  );

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet || !currentChainId || !TOKEN_METADATA[currentChainId]) {
        setBalances({});
        return;
      }

      try {
        const client = getViemClient(currentChainId);
        const address = wallet.accounts[0].address as `0x${string}`;
        const newBalances: { [key: string]: number } = {};
        const tokens = TOKEN_METADATA[currentChainId];

        for (const [token, meta] of Object.entries(tokens)) {
          if (meta.type === "native") {
            const balanceWei = await client.getBalance({ address });
            newBalances[token] = Number.parseFloat(formatEther(balanceWei));
          } else if (meta.type === "erc20" && meta.address) {
            try {
              const balanceRaw = await client.readContract({
                address: meta.address as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [address],
              });
              newBalances[token] = Number.parseFloat(
                formatUnits(balanceRaw as bigint, meta.decimals)
              );
            } catch {
              newBalances[token] = 0;
            }
          }
        }

        setBalances(newBalances);
      } catch {
        setBalances({});
      }
    };

    fetchBalances();

    if (!wallet || !currentChainId) return;

    const id = setInterval(fetchBalances, pollInterval);
    return () => clearInterval(id);
  }, [wallet, currentChainId, pollInterval]);

  // Calculate quantities when amounts change (keyed by address)
  useEffect(() => {
    const newQuantities: { [key: string]: number } = {};

    selectedVault.forEach((vault) => {
      const amount = parseFloat(vault.amount);
      const price = Number(indexPrices[vault.address] ?? indexPrices[vault.ticker]);

      const qty = !isNaN(amount) && price > 0 ? amount / price : 0;
      newQuantities[vault.address] = qty;
    });

    setQuantity(newQuantities);
  }, [selectedVault, indexPrices]);

  /**
   * Execute Buy Transaction
   */
  const handleBuy = async () => {
    console.log("[handleBuy] currentVault:", currentVault);
    console.log("[handleBuy] ticker:", currentVault?.ticker);
    console.log("[handleBuy] currentItpAddress:", currentItpAddress);
    console.log("[handleBuy] itps count:", itps.length);
    console.log("[handleBuy] itps:", itps.map(i => ({ symbol: i.symbol, address: i.address })));

    if (!currentVault || parsedAmount <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    // Validate balance
    const isValid = await validateArbitrumBalance(currentAmount);
    if (!isValid) {
      return;
    }

    // Find ITP address
    let itpAddress = currentItpAddress;

    // If no exact match, try to find by name or symbol
    if (!itpAddress && itps.length > 0) {
      const foundItp = itps.find(itp =>
        itp.symbol.toLowerCase() === currentVault.ticker.toLowerCase() ||
        itp.symbol.toLowerCase() === `b${currentVault.ticker.toLowerCase()}` ||
        itp.name.toLowerCase().includes(currentVault.name.toLowerCase()) ||
        currentVault.name.toLowerCase().includes(itp.name.toLowerCase())
      );

      if (foundItp) {
        itpAddress = foundItp.address;
      }
    }

    if (!itpAddress) {
      toast.error("No ITP available. Please create an ITP first via bridge.");
      return;
    }

    // Execute buy
    await executeBuy({
      amount: currentAmount,
      targetItpAddress: itpAddress as `0x${string}`,
    });
  };

  /**
   * Execute Sell Transaction
   */
  const handleSell = async () => {
    if (!currentVault || parsedAmount <= 0) {
      toast.error("Please enter an amount");
      return;
    }

    let itpAddress = currentItpAddress;

    if (!itpAddress && itps.length > 0) {
      const foundItp = itps.find(itp =>
        itp.symbol.toLowerCase() === currentVault.ticker.toLowerCase() ||
        itp.symbol.toLowerCase() === `b${currentVault.ticker.toLowerCase()}` ||
        itp.name.toLowerCase().includes(currentVault.name.toLowerCase()) ||
        currentVault.name.toLowerCase().includes(itp.name.toLowerCase())
      );

      if (foundItp) {
        itpAddress = foundItp.address;
      }
    }

    if (!itpAddress) {
      toast.error("No ITP available for selling.");
      return;
    }

    await executeSell({
      itpAddress: itpAddress as `0x${string}`,
      amount: currentAmount,
    });
  };

  /**
   * Reset transaction state
   */
  const handleReset = () => {
    if (activeTab === "buy") {
      resetBuy();
    } else {
      resetSell();
    }
  };

  const setMaxAmount = (vaultAddress: string) => {
    const maxBalance = balances["USDC"] || 0;

    if (maxBalance === 0) {
      setInsufficientValue(true);
      return;
    }
    dispatch(
      updateVaultAmount({ address: vaultAddress, amount: maxBalance.toString() })
    );
    setInsufficientValue(false);
  };

  const removeVault = (vaultAddress: string) => {
    dispatch(removeSelectedVault(vaultAddress));
  };

  const handleAmountChange = useCallback(
    async (vaultAddress: string, value: string) => {
      dispatch(updateVaultAmount({ address: vaultAddress, amount: value }));

      const amount = parseFloat(value);
      if (!isNaN(amount) && amount >= 0) {
        setQuantity((prev) => ({ ...prev, [vaultAddress]: 0 }));
        setInsufficientValue(false);
      }
    },
    [dispatch]
  );

  // Get status message
  const getStatusMessage = () => {
    switch (currentStatus) {
      case "checking_balance":
        return "Checking balance...";
      case "checking_approval":
        return "Checking approval...";
      case "awaiting_approval":
      case "approving":
        return "Approving USDC...";
      case "awaiting_deposit":
      case "depositing":
        return "Submitting buy order...";
      case "processing":
        return "Processing transaction...";
      case "success":
        return "Transaction successful!";
      case "insufficient_balance":
        return "Insufficient balance";
      case "approval_failed":
        return "Approval failed";
      case "deposit_failed":
      case "sell_failed":
        return "Transaction failed";
      case "error":
        return currentError || "An error occurred";
      default:
        return "";
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={cn(
          "border-l border-accent bg-foreground lg:relative fixed lg:border-none top-0 bottom-0 right-0 w-[350px] lg:w-[400px] flex flex-col",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 flex flex-row items-center justify-between pt-[32px] pb-[16px] px-[18px] border-b border-accent">
          <span className="text-[20px] text-primary">
            Trade
          </span>
          <div onClick={() => setOpen(!open)}>
            <NavigationAlert className="h-4 w-4 text-primary flex lg:hidden cursor-pointer" />
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "buy" | "sell"); handleReset(); }} className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="flex-shrink-0 w-full rounded-none border-b border-accent bg-transparent p-0">
              <TabsTrigger
                value="buy"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent data-[state=active]:text-green-500 py-3 font-semibold"
              >
                Buy
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent data-[state=active]:text-red-500 py-3 font-semibold"
              >
                Sell
              </TabsTrigger>
            </TabsList>

            <TabsContent value="buy" className="flex-1 overflow-y-auto m-0 overscroll-contain">
              {renderTradeContent()}
            </TabsContent>

            <TabsContent value="sell" className="flex-1 overflow-y-auto m-0 overscroll-contain">
              {renderTradeContent()}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky footer with action buttons */}
        {wallet && (
          <div className="flex-shrink-0 p-4 pb-6 border-t border-accent bg-foreground">
              {/* Status indicator */}
              {currentStatus !== "idle" && (
                <div className={cn(
                  "flex items-center gap-2 mb-3 p-2 rounded text-sm",
                  isSuccess && "bg-green-500/10 text-green-500",
                  isError && "bg-red-500/10 text-red-500",
                  isProcessing && "bg-blue-500/10 text-blue-500"
                )}>
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                  {isError && <AlertCircle className="w-4 h-4" />}
                  <span>{getStatusMessage()}</span>
                </div>
              )}

              {/* Transaction hash link */}
              {currentTxHash && (
                <a
                  href={`https://arbiscan.io/tx/${currentTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline block mb-3"
                >
                  View on Arbiscan →
                </a>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-[44px] px-4 border-accent bg-accent text-sm hover:bg-foreground text-primary cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[280px] p-4 bg-ring text-card rounded-md flex flex-col gap-4 shadow-lg z-50"
                    align="start"
                    sideOffset={10}
                  >
                    <p className="text-sm text-center">
                      Cancel and close this panel?
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        className="text-sm px-3 py-1 bg-accent cursor-pointer h-[32px] rounded"
                        onClick={() => setPopoverOpen(false)}
                      >
                        No, keep
                      </Button>
                      <Button
                        variant="destructive"
                        className="text-sm px-3 py-1 cursor-pointer !bg-red-600 h-[32px] rounded"
                        onClick={onClose}
                      >
                        Yes, cancel
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  className={cn(
                    "flex-1 h-[44px] text-white text-sm cursor-pointer font-semibold",
                    activeTab === "buy"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  )}
                  disabled={
                    isProcessing ||
                    parsedAmount <= 0 ||
                    !wallet ||
                    itpsLoading
                  }
                  onClick={activeTab === "buy" ? handleBuy : handleSell}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {activeTab === "buy" ? "Buy" : "Sell"}
                </Button>
              </div>

              {/* Chain warning */}
              {!isCorrectChain && wallet && (
                <p className="text-xs text-yellow-500 mt-2 text-center">
                  Please switch to Arbitrum network
                </p>
              )}

            {/* ITP count info */}
            {!itpsLoading && itps.length > 0 && (
              <p className="text-xs text-muted mt-2 text-center">
                {itps.length} ITPs available on Arbitrum
              </p>
            )}
          </div>
        )}

        {/* Connect wallet prompt */}
        {!wallet && (
          <div className="flex-shrink-0 p-4 pb-6 border-t border-accent bg-foreground">
            <Button
              onClick={connectWallet}
              className="w-full h-[44px] bg-blue-600 hover:bg-blue-700 text-white text-sm cursor-pointer"
            >
              Connect Wallet
            </Button>
          </div>
        )}
      </div>
    </>
  );

  function renderTradeContent() {
    return (
      <div className="flex flex-col">
        {vaults.map((vault) => (
          <div key={vault.address}>
            {/* Header */}
            <div className="flex items-start justify-between py-6 px-4">
              <div className="flex items-start gap-2">
                <div className="w-[40px] h-[40px] rounded-full p-1 flex items-start justify-center">
                  <AddressIdenticon address={vault.address} size={36} />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="font-medium text-[15px] text-primary">
                    {vault.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-secondary">
                    <span className="text-[11px] bg-accent px-2 py-0.5 rounded">
                      {vault.ticker}
                    </span>
                    <span className="text-[11px] bg-accent px-2 py-0.5 rounded">
                      <AnimatedPrice
                        currency="USDC"
                        value={Number(indexPrices[vault.address] ?? indexPrices[vault.ticker] ?? 0)}
                      />
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeVault(vault.address)}
                className="text-secondary cursor-pointer hover:text-primary bg-accent p-[6px] w-[24px] h-[24px] rounded-[4px]"
              >
                <X className="h-2 w-2" style={{ width: "12px" }} />
              </Button>
            </div>

            {/* Amount input */}
            <div className="p-4 pt-0 border-b border-accent">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] text-secondary">
                    {activeTab === "buy" ? "You pay" : "You sell"}
                  </label>
                </div>
                <div
                  className={cn(
                    "flex flex-row items-center justify-between gap-1 space-x-2 px-[10px] py-[12px] bg-accent rounded-[8px] border",
                    insufficientValue ? "border-red-500" : "border-transparent"
                  )}
                >
                  <div className="flex flex-col flex-1">
                    <input
                      type="text"
                      placeholder="0.00"
                      inputMode="decimal"
                      autoComplete="off"
                      autoCorrect="off"
                      value={
                        selectedVault.find((_vault) => _vault.address === vault.address)?.amount || ""
                      }
                      className="w-full font-mono text-[18px] font-semibold outline-none bg-transparent text-primary placeholder-secondary"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          handleAmountChange(vault.address, "");
                          return;
                        }
                        const isValid = /^(\d+)?(\.\d*)?$/.test(value);
                        if (!isValid) return;
                        handleAmountChange(vault.address, value);
                      }}
                    />
                    <div className="font-mono text-[11px] text-muted mt-1">
                      ≈ {quantity[vault.address]?.toFixed(4) || quantity[vault.ticker]?.toFixed(4) || "0"} {vault.ticker}
                    </div>
                  </div>

                  <div className="flex flex-row gap-2 items-center">
                    <span className="flex items-center">
                      <Image
                        src={USDC}
                        alt="USDC"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </span>
                    <span className="text-primary text-[14px] font-medium">
                      USDC
                    </span>
                    <Button
                      type="button"
                      className="px-[10px] py-[6px] h-[28px] text-[11px] rounded bg-foreground text-primary hover:bg-muted cursor-pointer font-medium"
                      onClick={() => setMaxAmount(vault.address)}
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                {insufficientValue && (
                  <div className="flex justify-end mt-2 gap-1 items-center">
                    <Info color="#ef4444" className="w-3 h-3" />
                    <span className="text-xs text-red-500">
                      {arbitrumBalanceError || "Insufficient balance"}
                    </span>
                  </div>
                )}

                <div className="flex justify-end mt-2">
                  <span className="text-xs text-muted">
                    Balance: {balances["USDC"]?.toFixed(4) || "0.00"} USDC
                  </span>
                </div>
              </div>

              {/* You receive section */}
              <div className="mb-4">
                <label className="text-[12px] text-secondary mb-2 block">
                  {activeTab === "buy" ? "You receive" : "You receive"}
                </label>
                <div className="flex items-center justify-between px-[10px] py-[12px] bg-accent/50 rounded-[8px]">
                  <div className="flex flex-col">
                    <span className="font-mono text-[18px] font-semibold text-primary">
                      {activeTab === "buy"
                        ? (quantity[vault.address]?.toFixed(4) || quantity[vault.ticker]?.toFixed(4) || "0.00")
                        : (parsedAmount * (Number(indexPrices[vault.address] ?? indexPrices[vault.ticker]) || 0)).toFixed(2)
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AddressIdenticon address={vault.address} size={24} />
                    <span className="text-primary text-[14px] font-medium">
                      {activeTab === "buy" ? vault.ticker : "USDC"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Price info - compact */}
              <div className="text-xs text-muted py-1">
                <div className="flex justify-between">
                  <span>Price</span>
                  <span>1 {vault.ticker} = {(() => {
                    const price = Number(indexPrices[vault.address] ?? indexPrices[vault.ticker]);
                    return !isNaN(price) ? price.toFixed(2) : "0.00";
                  })()} USDC</span>
                </div>
              </div>

              {/* Virtual Orderbook */}
              {vault.collateral && vault.collateral.length > 0 && (
                <div className="mt-4">
                  <VirtualOrderbook
                    symbols={vault.collateral.map(c => c.name.toUpperCase())}
                    weights={(() => {
                      // Use actual weights from ITP if available, otherwise equal weights
                      const hasWeights = vault.collateral.some(c => c.weight !== undefined);
                      if (hasWeights) {
                        return vault.collateral.map(c => c.weight || 0);
                      }
                      // Fallback to equal weights
                      const len = vault.collateral.length;
                      const baseWeight = Math.floor(10000 / len);
                      const remainder = 10000 - (baseWeight * len);
                      return vault.collateral.map((_, i) => baseWeight + (i < remainder ? 1 : 0));
                    })()}
                    displayLevels={5}
                    compact={true}
                    defaultCollapsed={true}
                    baseMidPrice={vault.indexPrice || (indexPrices[vault.address] ? Number(indexPrices[vault.address]) : indexPrices[vault.ticker] ? Number(indexPrices[vault.ticker]) : undefined)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
}
