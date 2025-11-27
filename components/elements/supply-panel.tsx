"use client";

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
import { Copy, X } from "lucide-react";
import Image from "next/image";
import { selectLatestMintInvoice } from "@/redux/mintInvoicesSlice";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMediaQuery } from "react-responsive";
import { formatEther, formatUnits } from "viem";
import USDC from "../../public/logos/usd-coin.png";
import IndexMaker from "../icons/indexmaker";
import Info from "../icons/info";
import NavigationAlert from "../icons/navigation-alert";
import AnimatedPrice from "./animate-price";
import CustomTooltip from "./custom-tooltip";
import { TransactionConfirmModal } from "./transaction-modal";
import { format } from "date-fns";

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
  amount: string;
}

interface TransactionData {
  token: string;
  amount: number;
  value: number;
  apy: number;
  collateral: {
    name: string;
    logo: string;
  }[];
}

export function SupplyPanel({
  vaultIds,
  vaults,
  onClose,
  open,
  setOpen,
}: SupplyPanelProps) {
  const pollInterval = 30_000;
  const { wallet, isWhitelisted, connectWallet } = useWallet();
  const { indexPrices } = useQuoteContext();
  const [quantity, setQuantity] = useState<{ [key: string]: number }>({});
  const { t } = useLanguage();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmModalOpen, setConfrimModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<TransactionData[] | null>(
    null
  );
  const isSmallWindow = useMediaQuery({ maxWidth: 1024 });
  const [maxpopoverOpen, setMaxPopoverOpen] = useState(false);
  const [insufficientValue, setInsufficientValue] = useState(false);
  // const storedWallet = useSelector((state: RootState) => state.wallet.wallet);
  const { currentChainId } = useSelector((state: RootState) => state.network);
  const selectedVault = useSelector(
    (state: RootState) => state.vault.selectedVault
  );
  const [balances, setBalances] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    const _transactions: TransactionData[] = vaults.map((vault) => {
      return {
        token: vault.name,
        amount:
          Number(
            vaultIds.find((vaultId) => vaultId.name === vault.name)?.amount
          ) || 0,
        value:
          Number(
            vaultIds.find((vaultId) => vaultId.name === vault.name)?.amount
          ) || 0,
        apy: vault.performance?.oneYearReturn || 0,
        collateral: vault.collateral,
      };
    });
    setTransactions(_transactions);
  }, [vaultIds, vaults]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setOpen(false);
      } else {
        // setOpen(false)
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setOpen]);

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
            } catch (contractError) {
              newBalances[token] = 0;
            }
          }
        }

        setBalances(newBalances);
      } catch (error) {
        setBalances({});
      } finally {
      }
    };

    // run immediately
    fetchBalances();

    if (!wallet || !currentChainId) return;

    const id = setInterval(fetchBalances, pollInterval); // <- same pattern as your top code
    return () => clearInterval(id);
  }, [wallet, currentChainId, pollInterval]);

  const handleSupply = () => {
    // In a real app, this would handle the supply transaction
    setConfrimModalOpen(true);
  };

  const viewFullInvoice = (
    chain_id: string,
    address: string,
    client_order_id: string
  ) => {
    const invoiceUrl = `/invoices/${chain_id}/${address}/${client_order_id}`;
    window.open(invoiceUrl, "_blank", "noopener,noreferrer");
  };

  const setMaxAmount = (vaultId: string) => {
    // Assuming vaultId is unique and corresponds to a vault with a token
    const vault = selectedVault.find((v) => v.name === vaultId);
    const maxBalance = vault ? balances["USDC"] || 0 : 0;

    if (maxBalance === 0) {
      setInsufficientValue(true);
      setMaxPopoverOpen(false);
      return;
    }
    dispatch(
      updateVaultAmount({ name: vaultId, amount: maxBalance.toString() })
    );
    setInsufficientValue(false);
    setMaxPopoverOpen(false);
  };

  const removeVault = (vaultId: string) => {
    dispatch(removeSelectedVault(vaultId));
  };

  const handleAmountChange = useCallback(
    async (vaultId: string, value: string) => {
      // Store value as-is
      dispatch(updateVaultAmount({ name: vaultId, amount: value }));

      // Optional: parse number for validation purposes
      const amount = parseFloat(value);
      if (!isNaN(amount) && amount >= 0) {
        setQuantity((prev) => ({ ...prev, [vaultId]: 0 }));
        setInsufficientValue(false);
      }
      const calculatedQuantity =
        Number(indexPrices[vaultId]) !== 0 && indexPrices[vaultId]
          ? amount / Number(indexPrices[vaultId])
          : 0;
      setQuantity((prev) => ({ ...prev, [vaultId]: calculatedQuantity }));
    },
    [indexPrices, dispatch]
  );

  const onConfirmTransactionClose = () => {
    // console.log(`Supplying ${amount} to vault ${vaultIds}`);
    setConfrimModalOpen(false);
  };

  useEffect(() => {
    const newQuantities: { [ticker: string]: number } = {};

    selectedVault.forEach((vault) => {
      const amount = parseFloat(vault.amount);
      const price = Number(indexPrices[vault.ticker]);

      const qty = !isNaN(amount) && price > 0 ? amount / price : 0;
      newQuantities[vault.ticker] = qty;
    });

    setQuantity(newQuantities);
  }, [selectedVault, indexPrices]);

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
          "border-l border-accent bg-foreground overflow-hidden lg:relative fixed lg:border-none top-0 bottom-0 right-0 w-[350px] lg:w-[400px]",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full lg:h-[calc(100%-50px)]">
          <div className="flex flex-row items-center justify-between pt-[32px] pb-[16px] px-[18px] border-b border-accent">
            <span className="text-[20px] text-primary">
              {t("common.bundler")}
            </span>
            <div onClick={() => setOpen(!open)}>
              <NavigationAlert className="h-4 w-4 text-primary flex lg:hidden cursor-pointer" />
            </div>
          </div>
          <div className="flex flex-col">
            {vaults.map((vault, index) => {
              return (
                <div key={vault.name + index}>
                  {/* Header */}
                  <div className="flex items-start justify-between py-8 px-4">
                    <div className="flex items-start gap-2">
                      <div className="w-[40px] h-[40px] rounded-full p-1 flex items-start justify-center text-ellipsis overflow-hidden">
                        <IndexMaker className="w-[36px] h-[36px] text-muted" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h2 className="font-normal text-[15px] text-secondary">
                          {vault.name}
                        </h2>
                        <div className="flex lg:flex-row flex-col lg:items-center items-start gap-2 text-sm text-secondary">
                          <span className="text-[11px] bg-accent px-2 py-0.5 rounded">
                            {shortenAddress(vault.curator)}
                          </span>
                          <span className="text-[11px] bg-accent px-2 py-0.5 rounded">
                            <AnimatedPrice
                              currency="USDC"
                              value={Number(indexPrices[vault.ticker] ?? 0)}
                            />
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVault(vault.name)}
                      className="text-secondary cursor-pointer hover:text-primary bg-accent p-[6px] w-[24px] h-[24px]  rounded-[4px]"
                    >
                      <X className="h-2 w-2" style={{ width: "12px" }} />
                    </Button>
                  </div>

                  {/* Supply form */}
                  <div className="p-4 pt-0 border-b border-accent">
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[12px] text-secondary">
                          {t("table.supply")} {"USDC"}
                        </label>
                      </div>
                      <div className="flex flex-col">
                        <div
                          className={cn(
                            "flex flex-row items-center justify-between gap-1 space-x-2 px-[8px] py-[10px] bg-accent rounded-[8px] border-[0.5px]",
                            insufficientValue
                              ? "border-[#c73e59f2]"
                              : "border-accent"
                          )}
                        >
                          {/* Input and Value Display */}
                          <div className="flex flex-col">
                            <input
                              type="text"
                              placeholder="0"
                              id="amount"
                              inputMode="decimal"
                              autoComplete="off"
                              autoCorrect="off"
                              step="any"
                              value={
                                selectedVault.find(
                                  (_vault) => _vault.name === vault.name
                                )?.amount || ""
                              }
                              className="w-full font-mono text-[13px] outline-none bg-transparent text-primary placeholder-secondary mb-1"
                              onChange={(e) => {
                                let value = e.target.value;

                                // Allow empty input
                                if (value === "") {
                                  handleAmountChange(vault.name, "");
                                  return;
                                }

                                // Only allow numbers and a single dot
                                const isValid = /^(\d+)?(\.\d*)?$/.test(value);
                                if (!isValid) return;

                                handleAmountChange(vault.name, value);
                              }}
                            />

                            <div className="font-mono text-[10px] text-muted">
                              {quantity[vault.ticker]
                                ? quantity[vault.ticker]
                                : "0"}{" "}
                              {vault.ticker}
                            </div>
                          </div>

                          <div className="flex flex-row gap-1 items-center">
                            {/* Asset Logo */}
                            <span className="flex items-center w-[20px] h-[20px]">
                              <Image
                                src={USDC}
                                alt="USDC"
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            </span>

                            {/* Asset Name */}
                            <span className="text-secondary text-[12px]">
                              USDC
                            </span>

                            {/* Max Button */}
                            <Button
                              type="button"
                              className="px-[8px] py-[5px] h-[26px] text-[12px] rounded-[4px] bg-accent text-primary hover:bg-muted cursor-pointer"
                              onClick={() => setMaxAmount(vault.name)}
                            >
                              {t("common.max")}
                            </Button>
                          </div>
                        </div>
                      </div>
                      {insufficientValue && (
                        <div className="flex justify-end mt-1 gap-1">
                          <Info color="#c73e59f2" className="w-4 h-4" />
                          <span className="text-xs text-secondary">
                            {t("common.insufficientValue")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-end mt-1">
                        <span className="text-xs text-secondary">
                          {t("common.balance")}:{" "}
                          {balances["USDC"]?.toFixed(4) || 0} {"USDC"}
                        </span>
                      </div>
                    </div>

                    {/* APY info */}
                    <div className="space-y-4 mb-6 pt-6">
                      <div className="flex items-center justify-between gap-4">
                        {/*<div className="flex items-center gap-1">
                          <span className="text-[12px] text-muted">
                            {t("table.oneYearPerformance")}
                          </span>
                        </div>
                         <div className="flex items-center gap-1">
                          <span className="font-normal text-primary text-[12px]">
                            {vault.performance?.oneYearReturn.toFixed(2) || "0"}{" "}
                            %
                          </span>
                        </div> */}
                      </div>

                      {/* Collateral Exposure */}
                      <div className="flex items-center justify-between gap-4">
                        {/* <div className="flex items-center gap-1">
                          <span className="text-[12px] text-muted">
                            {t("common.collateralExposure")}
                          </span>
                        </div>*/}
                        <div className="flex items-center gap-1">
                          {vault.collateral.length > 0 ? (
                            vault.collateral
                              .slice(0, 5)
                              .map((collateral, index) => (
                                <CustomTooltip
                                  key={"collateral-" + index.toString()}
                                  content={
                                    <div className="flex flex-col gap-1 min-w-[220px] bg-foreground rounded-[8px]">
                                      <div className="flex justify-between border-b py-1 px-3 border-accent">
                                        <span>Collateral</span>
                                        <div className="flex items-center">
                                          <Image
                                            src={collateral.logo || USDC}
                                            alt={"USDC"}
                                            width={17}
                                            height={17}
                                          />
                                          <span>PT-U...025</span>
                                        </div>
                                      </div>
                                      <div className="flex justify-between border-b py-1 px-3 border-accent">
                                        <span className="">Oracle</span>
                                        <a
                                          target="_blank"
                                          href="https://etherscan.io/address/0xDddd770BADd886dF3864029e4B377B5F6a2B6b83"
                                          className="hover:bg-[afafaf20]"
                                        >
                                          Exchange rate
                                        </a>
                                        <Copy className="w-[15px] h-[15px]" />
                                      </div>
                                    </div>
                                  }
                                >
                                  <div className="flex items-center gap-1 hover:px-1 hover:transition-all">
                                    <Image
                                      src={collateral.logo ?? USDC}
                                      alt={collateral.name}
                                      width={17}
                                      height={17}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                </CustomTooltip>
                              ))
                          ) : (
                            <></>
                          )}
                          {vault.collateral.length > 5 && (
                            <CustomTooltip
                              content={
                                <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[300px] bg-foreground">
                                  {vault.collateral
                                    .slice(5)
                                    .map((collateral, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2"
                                      >
                                        <span>{collateral.name}</span>
                                      </div>
                                    ))}
                                </div>
                              }
                            >
                              <span className="text-[12px] pl-2 text-secondary">
                                + {vault.collateral?.length - 5}
                              </span>
                            </CustomTooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Previous Mint Invoices Section - Commented Out */}
          {/* <div className="flex flex-col p-4 border-t border-accent">
            <h3 className="text-[14px] text-primary font-semibold mb-2">
              Previous Mint Invoices
            </h3>

            {(() => {
              const latest = useSelector(selectLatestMintInvoice);
              if (!latest) {
                return (
                  <p className="text-[13px] pt-4 text-secondary">
                    There is no previous Mint Invoice for your connected wallet!
                  </p>
                );
              }

              return (
                <div className="p-2 rounded-lg bg-accent border border-accent flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-secondary">
                      {format(new Date(latest.timestamp), "MMM d, HH:mm:ss")}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500">
                      {latest.status.charAt(0).toUpperCase() + latest.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[13px] text-primary">
                    <Image
                      src={USDC}
                      alt="USDC"
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                    <span className="font-medium">
                      {Number(latest.amount_paid).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      USDC →
                    </span>
                    <IndexMaker className="text-muted w-[18px] h-[18px]" />
                    <span className="font-medium">
                      {Number(latest.filled_quantity).toExponential(2)}{" "}
                      {latest.symbol}
                    </span>
                  </div>

                  <div className="text-[11px] text-blue-400">
                    Invoice #
                    <span
                      className="pl-1 underline cursor-pointer"
                      onClick={() =>
                        viewFullInvoice(
                          latest.chain_id,
                          latest.address,
                          latest.client_order_id
                        )
                      }
                    >
                      {latest.payment_id}
                    </span>
                  </div>

                  <div className="relative h-4 bg-background rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: "100%" }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">
                      100%
                    </span>
                  </div>
                </div> 
              );
            })()}
          </div> */}

          {/* Footer */}
          {!wallet ? (
            <div className="p-4 flex flex-col gap-2 border-t border-accent bottom-[50px] absolute w-full">
              <Button
                onClick={connectWallet}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[14px] cursor-pointer"
              >
                {t("common.connectWallet")}
              </Button>
            </div>
          ) : (
            // Connected & Whitelisted
            <div className="bottom-[50px] absolute w-full p-2 border-t border-accent">
              <div className="p-0 flex flex-col">
                <span className="text-yellow-500 text-[11px] text-right">
                  ⚠️Withdraw and Invest are pause until DAO is formed.
                </span>
                <div className="w-full text-[13px] text-secondary text-right">
                  Estimated Fill Time : ~5 seconds
                </div>
              </div>
              <div className="flex gap-10 lg:gap-10 items-center h-[40px] justify-between relative">
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-[26px] px-[8px] py-[5px] border-accent w-[50px] bg-accent text-[11px] hover:bg-foreground text-primary cursor-pointer"
                    >
                      {t("common.cancel")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[300px] p-4 bg-ring text-card rounded-md flex flex-col gap-4 shadow-[0px_1px_20px_0px_rgba(0,0,0,0.04),0px_12px_16px_0px_rgba(6,9,11,0.05),0px_6px_12px_0px_rgba(0,0,0,0.07)] z-100"
                    align="start"
                    sideOffset={10}
                  >
                    <p className="text-[11px] font-normal text-card text-center">
                      {t("common.transactionConfrimTitle")}
                    </p>
                    <div className="flex justify-end items-end gap-2">
                      <Button
                        variant="secondary"
                        className="text-[11px] px-[8px] py-[5px] bg-accent cursor-pointer h-[26px] rounded-[4px]"
                        onClick={() => setPopoverOpen(false)}
                      >
                        {t("common.noKeep")}
                      </Button>
                      <Button
                        variant="destructive"
                        className="text-[11px] px-[8px] py-[5px] cursor-pointer !bg-[#c73e59e6] h-[26px] rounded-[4px]"
                        onClick={onClose}
                      >
                        {t("common.yesCancel")}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <Button
                      className="h-[40px] bg-gray-500 text-white text-[13px] cursor-not-allowed opacity-70"
                      disabled
                    >
                      {t("common.sell")}
                    </Button>
                    <div className="absolute hidden group-hover:block bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-white rounded whitespace-nowrap">
                      Sell not available during alpha
                    </div>
                  </div>

                  <Button
                    className="flex-1 h-[40px] bg-blue-600 hover:bg-blue-700 text-white text-[13px] cursor-pointer"
                    disabled={
                      selectedVault.filter(
                        (_vault) =>
                          isNaN(Number(_vault.amount)) ||
                          Number(_vault.amount) === 0
                      ).length > 0 || !wallet
                    }
                    onClick={handleSupply}
                  >
                    {t("common.finalizeTransactions")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <TransactionConfirmModal
        isOpen={confirmModalOpen}
        onClose={onConfirmTransactionClose}
        transactions={transactions}
        index_address={
          vaults && vaults[0] && vaults[0].address ? vaults[0].address : ""
        }
        symbol={
          vaults && vaults[0] && vaults[0].ticker ? vaults[0].ticker : "SY100"
        }
      />
    </>
  );
}