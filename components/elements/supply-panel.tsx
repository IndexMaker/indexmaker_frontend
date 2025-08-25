"use client";

import type React from "react";

import { useCallback, useEffect, useState } from "react";
import { X, BarChart2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, shortenAddress } from "@/lib/utils";
import NavigationAlert from "../icons/navigation-alert";
import { Vault } from "@/lib/types/vault";
import Image from "next/image";
import CustomTooltip from "./custom-tooltip";
import InstantAPY from "../icons/instantApy";
import { useLanguage } from "@/contexts/language-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { getViemClient } from "@/lib/blocknative/viem";
import { RootState } from "@/redux/store";
import { useDispatch, useSelector } from "react-redux";
import Info from "../icons/info";
import { formatEther, formatUnits } from "viem";
import { ERC20_ABI, TOKEN_LIST, TOKEN_METADATA } from "@/lib/data";
import { removeSelectedVault, updateVaultAmount } from "@/redux/vaultSlice";
import { IndexListEntry } from "@/types";
import IndexMaker from "../icons/indexmaker";
import { useWallet } from "@/contexts/wallet-context";
import { TransactionConfirmModal } from "./transaction-modal";
import USDC from "../../public/logos/usd-coin.png";
import { useQuoteContext } from "@/contexts/quote-context";
import AnimatedPrice from "./animate-price";
import { useMediaQuery } from "react-responsive";
import Link from "next/link";

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

  // const handleMaxClick = () => {
  //   // In a real app, this would set the max available balance
  //   setAmount("1000.00");
  // };

  // const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   // Only allow numbers and decimals
  //   const value = e.target.value;
  //   if (/^[0-9]*\.?[0-9]*$/.test(value)) {
  //     setAmount(value);
  //   }
  // };

  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet || !currentChainId || !TOKEN_METADATA[currentChainId]) {
        setBalances({});
        return;
      }

      setLoading(true);
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
              console.error(
                `Failed to fetch balance for ${token}:`,
                contractError
              );
              newBalances[token] = 0; // Set to 0 if contract call fails
            }
          }
        }

        console.log("Fetched balances:", newBalances);
        setBalances(newBalances);
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setBalances({});
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [wallet, currentChainId]);

  const handleSupply = () => {
    // In a real app, this would handle the supply transaction
    setConfrimModalOpen(true);
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
          "border-l border-accent bg-foreground overflow-hidden lg:relative fixed lg:border-none top-0 bottom-0 right-0 w-[300px] lg:w-[400px]",
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
                        <div className="flex items-center gap-2 text-sm text-secondary">
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
                            {/* <Popover
                              open={maxpopoverOpen}
                              onOpenChange={setMaxPopoverOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  className="px-[8px] py-[5px] h-[26px] text-[12px] rounded-[4px] bg-accent text-primary hover:bg-muted cursor-pointer"
                                >
                                  {t("common.max")}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[320px] p-0 bg-ring text-card rounded-md flex flex-col gap-4 shadow-[0px_1px_20px_0px_rgba(0,0,0,0.04),0px_12px_16px_0px_rgba(6,9,11,0.05),0px_6px_12px_0px_rgba(0,0,0,0.07)] z-100 backdrop-blur-xl"
                                align="center"
                                sideOffset={10}
                              >
                                <div className="flex flex-col ">
                                  <div className="px-[12px] py-[17px] flex flex-row gap-2 border-b-1 border-accent">
                                    <Info className="w-4 h-4" />
                                    <p className="text-[13px] font-normal text-secondary text-center ">
                                      {t("common.maxSupplyConfirmation")}
                                    </p>
                                  </div>
                                  <div className="flex justify-end flex-col items-end gap-2 px-[12px] py-[16px]">
                                    <Button
                                      variant="ghost"
                                      className="text-[13px] px-[8px] py-[5px] bg-[#2470FF] !hover:bg-[#2470FF90] cursor-pointer h-[32px] rounded-[4px] w-full"
                                      onClick={() => setMaxAmount(vault.name)}
                                    >
                                      {t("common.iUnderstand")}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      className="text-[13px] px-[8px] py-[5px] bg-accent cursor-pointer h-[32px] rounded-[4px] w-full"
                                      onClick={() => {
                                        dispatch(
                                          updateVaultAmount({
                                            name: vault.name,
                                            amount: 0,
                                          })
                                        );
                                        setMaxPopoverOpen(false);
                                      }}
                                    >
                                      {t("common.undoMaxSupply")}
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover> */}
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
                        <div className="flex items-center gap-1">
                          <span className="text-[12px] text-muted">
                            {t("table.oneYearPerformance")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-normal text-primary text-[12px]">
                            {vault.performance?.oneYearReturn.toFixed(2) || "0"}{" "}
                            %
                          </span>
                          {/* {Number(vault.performance?.oneYearReturn) > 5 && (
                            <CustomTooltip
                              key={"instantApy"}
                              content={
                                <div className="flex flex-col gap-1 min-w-[220px] bg-accent rounded-[8px]">
                                  <div className="flex justify-between border-b py-1 px-3 border-accent">
                                    <span className="text-sm">
                                      Rate & Rewards
                                    </span>
                                  </div>
                                  <div className="flex justify-between border-b py-1 px-3 border-accent">
                                    <div className="flex items-center gap-1">
                                      <BarChart2 className="h-4 w-4" />
                                      <span>Rate</span>
                                    </div>
                                    <span>+5.25%</span>
                                  </div>
                                  <div className="flex justify-between border-b py-1 px-3 border-accent">
                                    <div className="flex items-center gap-1">
                                      <Image
                                        src={USDC}
                                        alt={"USDC"}
                                        width={14}
                                        height={14}
                                      />
                                      <span className="text-xs">
                                        IndexMaker
                                      </span>
                                      <Copy className="w-[15px] h-[15px] cursor-pointer" />
                                    </div>
                                    <span className="font-bold">+1.16%</span>
                                  </div>
                                  <div className="flex justify-between border-b py-1 px-3 border-accent">
                                    <div className="flex items-center">
                                      <InstantAPY className="w-[17px] h-[17px]" />
                                      <span className="text-[#2470FFe6]">
                                        IndexMaker
                                      </span>
                                    </div>
                                    <span className="font-bold text-[#2470FFe6]">
                                      = 6.41%
                                    </span>
                                  </div>
                                </div>
                              }
                            >
                              <span className="text-[11px] text-blue-400">
                                <InstantAPY className="w-[15px] h-[15px] hover:transition-all cursor-pointer" />
                              </span>
                            </CustomTooltip>
                          )} */}
                        </div>
                      </div>

                      {/* Collateral Exposure */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-[12px] text-muted">
                            {t("common.collateralExposure")}
                          </span>
                        </div>
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
                                    {/* <span className="hover:px-1 hover:transition-all text-primary text-[12px] cursor-pointer">
                                    {collateral.name}
                                  </span> */}
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
          {/* Footer */}
          {!wallet ? (
            // Not Connected
            <div className="p-4 flex flex-col gap-2 border-t border-accent bottom-[50px] absolute w-full">
              <Button
                onClick={connectWallet}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[14px] cursor-pointer"
              >
                {t("common.connectWallet")}
              </Button>
            </div>
          ) : !isWhitelisted ? (
            // Connected but Not Whitelisted
            <div className="p-4 flex flex-col gap-2 border-t border-accent text-center bottom-[50px] absolute w-full">
              <span className="text-red-500 text-[13px] font-bold">
                Your connected wallet is not whitelisted.
              </span>
              <Link
                href={
                  process.env.NEXT_PUBLIC_CRYPTO_FINANCIAL_ADVISOR ||
                  "https://cal.com"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[14px] cursor-pointer">
                  📅 Book a call with a crypto financial advisor
                </Button>
              </Link>
            </div>
          ) : (
            // Connected & Whitelisted
            <div className="bottom-[50px] absolute w-full p-2 border-t border-accent">
              <div className="p-0 flex flex-col">
                <span className="text-yellow-500 text-[11px] text-right">
                  ⚠️Withdraw and Rebalances are pause until DAO is formed.
                </span>
                <div className="w-full text-[13px] text-secondary text-right">
                  Estimated Fill Time : ~15 Minutes
                </div>
              </div>
              <div className="flex gap-10 lg:gap-30 items-center h-[40px] justify-between relative">
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

                <Button
                  className="flex-1 h-[40px] bg-blue-600 hover:bg-blue-700 text-white text-[14px] cursor-pointer"
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
          )}
        </div>
      </div>
      <TransactionConfirmModal
        isOpen={confirmModalOpen}
        onClose={onConfirmTransactionClose}
        transactions={transactions}
      />
    </>
  );
}
