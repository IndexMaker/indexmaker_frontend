"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Circle, Sparkles, Copy } from "lucide-react";
import { useWallet } from "@/contexts/wallet-context";
import { buildNewQuoteRequest } from "@/lib/fix";
import { BrowserProvider, Contract, ethers, parseUnits } from "ethers";
import otcIndexAbi from "@/lib/abi/otcIndex.json";
import erc20Abi from "@/lib/abi/ERC20.json";
import Image from "next/image";
import IndexMaker from "../icons/indexmaker";
import USDC from "../../public/logos/usd-coin.png";
import CustomTooltip from "./custom-tooltip";
import { toast } from "sonner";
import { useQuoteContext } from "@/contexts/quote-context";
import { sendMintInvoiceToBackend } from "@/api/indices";

interface TransactionItem {
  token: string;
  amount: number;
  value: number;
  apy: number;
  collateral: {
    name: string;
    logo: string;
  }[];
}

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const OTC_INDEX_ADDRESS = "0xF3eA34CfAD1ce45Ea39AaEb636a701E892510a10";
const USDC_DECIMALS = 6;

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionItem[] | null;
}

export function TransactionConfirmModal({
  isOpen,
  onClose,
  transactions,
}: TransactionConfirmModalProps) {
  const [step, setStep] = useState<"review" | "confirm">("review");
  const [approvalStatus, setApprovalStatus] = useState<
    "idle" | "done" | "error"
  >("idle");
  const [depositStatus, setDepositStatus] = useState<"idle" | "done" | "error">(
    "idle"
  );
  const [fixStatus, setFixStatus] = useState<"idle" | "done" | "error">("idle");

  const [bundleApproved, setBundleApproved] = useState<
    "idle" | "success" | "failed"
  >("idle");
  const [txConfirmed, setTxConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [txHash, setTxHash] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { wallet, address, connectWallet } = useWallet();
  const { requestQuoteAndWait, sendNewIndexOrder } = useQuoteContext();

  const handleConfirm = async () => {
    if (!wallet) {
      await connectWallet();
      return;
    }
    setStep("confirm");
  };

  const handleRetryBundle = () => {
    setBundleApproved("idle");
  };

  const handleApproval = async () => {
    if (!wallet) {
      await connectWallet();
      return;
    }
    try {
      setIsProcessing(true);
      setApprovalStatus("idle");

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const usdc = new Contract(USDC_ADDRESS, erc20Abi.abi, signer);

      const amount = parseUnits(
        transactions
          ?.reduce((sum, t) => sum + Number(t.amount), 0)
          .toString() || "0",
        USDC_DECIMALS
      );

      const allowance = await usdc.allowance(
        wallet.accounts[0].address,
        OTC_INDEX_ADDRESS
      );

      if (allowance < amount) {
        const tx = await usdc.approve(OTC_INDEX_ADDRESS, amount);
        await tx.wait();
      }

      setApprovalStatus("done");
    } catch (e) {
      console.error("Approval error:", e);
      setApprovalStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeposit = async () => {
    try {
      setIsProcessing(true);
      setDepositStatus("idle");

      const provider = new BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const otcIndex = new Contract(OTC_INDEX_ADDRESS, otcIndexAbi.abi, signer);

      const amount = parseUnits(
        transactions
          ?.reduce((sum, t) => sum + Number(t.amount), 0)
          .toString() || "0",
        USDC_DECIMALS
      );
      const seqNum = Math.floor(Math.random() * 100000);
      const tx = await otcIndex.deposit(
        amount,
        seqNum,
        process.env.NEXT_PUBLIC_ADMIN_ADDRESS,
        ethers.ZeroAddress
      );

      await tx.wait();
      setTxHash(tx.hash);
      setFinalizing(true);

      const quantity = await requestQuoteAndWait({
        address: wallet?.accounts[0]?.address || "",
        symbol: "USDC",
        side: "1",
        amount: amount,
      });

      await sendMintInvoiceToBackend({
        txHash: tx.hash,
        blockNumber: tx.blockNumber,
        logIndex: 0,
        eventType: "mint",
        contractAddress: OTC_INDEX_ADDRESS,
        network: "base",
        userAddress: wallet?.accounts[0]?.address,
        amount: Number(amount),
        quantity: quantity || 0,
      });

      sendNewIndexOrder({
        address: wallet?.accounts[0]?.address || "",
        symbol: "USDC",
        side: "1",
        amount: amount,
        quantity,
      });
      // Show success modal
      setShowSuccessModal(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // await _tx.wait();
      setDepositStatus("done");
      // handleClose();
    } catch (e) {
      console.error("Deposit error:", e);
      setDepositStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("review");
    setBundleApproved("idle");
    setTxConfirmed(false);
    setIsProcessing(false);
    onClose();
  };

  const handleSendFixQuote = async () => {
    try {
      setFixStatus("idle");

      const userAddress = wallet?.accounts[0]?.address;
      const totalAmount =
        transactions
          ?.reduce((sum, t) => sum + Number(t.amount), 0)
          .toString() || "0";

      const quoteReq = buildNewQuoteRequest({
        chainId: 1,
        address: userAddress || "",
        symbol: "USDC",
        side: "1",
        amount: totalAmount,
        seqNum: Math.floor(Math.random() * 100000),
      });

      console.log("🚀 Sending FIX message:", quoteReq);

      // Simulate network
      await new Promise((r) => setTimeout(r, 1000));

      setFixStatus("done");
      handleClose();
    } catch (err) {
      console.error("FIX quote failed", err);
      setFixStatus("error");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-2xl bg-background border-accent text-primary z-50"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="flex justify-between items-center pb-4">
            <DialogTitle className="text-lg font-bold">
              {step === "review" ? "Review transaction" : "Confirm transaction"}
            </DialogTitle>
          </div>

          {step === "review" && transactions ? (
            <div className="space-y-4">
              {/* Multiple Transaction Items */}
              {transactions.map((transaction, index) => (
                <div key={transaction.token} className="space-y-3">
                  {/* Token Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-transparent rounded-full flex items-center justify-center">
                      <span className="text-[12px] font-bold">
                        <IndexMaker className="w-[24px] h-[24px] text-muted" />
                      </span>
                    </div>
                    <span className="font-bold text-[18px]">
                      {transaction.token}
                    </span>
                  </div>

                  {/* Transaction Details */}
                  <div className="space-y-3 bg-foreground rounded-lg p-4 pt-8 pb-4">
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-secondary">Supply</span>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-transparent rounded-full flex items-center justify-center">
                          <Image
                            src={USDC}
                            alt="USDC"
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        </div>
                        <span className="font-medium">
                          {transaction.amount} USDC
                          {/* {transaction.value} */}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-secondary">Net Supply APY</span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{transaction.apy}</span>
                        <Sparkles className="w-4 h-4 text-blue-400" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-secondary">Collateral</span>
                      <div className="flex items-center gap-1">
                        {transaction.collateral.length > 0 ? (
                          transaction.collateral
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
                        {transaction.collateral.length > 5 && (
                          <CustomTooltip
                            content={
                              <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[300px] bg-foreground">
                                {transaction.collateral
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
                              + {transaction.collateral.length - 5}
                            </span>
                          </CustomTooltip>
                        )}
                      </div>
                    </div>
                  </div>

                  {index < transactions.length - 1 && (
                    <div className="border-t border-accent my-4" />
                  )}
                </div>
              ))}

              {/* Terms */}
              <p className="text-[11px] text-secondary">
                By confirming this transaction, you agree to the{" "}
                <a
                  target="_blank"
                  href={
                    "https://psymm.gitbook.io/indexmaker/index-maker-hld/compliance/terms-of-use"
                  }
                  className="underline cursor-pointer"
                >
                  Terms of Use
                </a>{" "}
                and the services provisions relating to the IndexMaker Vault.
              </p>

              {/* Confirm Button */}
              <Button
                onClick={handleConfirm}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Confirm"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* STEP 1: Token Approval */}
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {approvalStatus === "done" ? (
                    <CheckCircle2 className="text-blue-500 w-5 h-5" />
                  ) : approvalStatus === "error" ? (
                    <XCircle className="text-red-500 w-5 h-5" />
                  ) : (
                    <Circle className="text-blue-500 w-5 h-5 animate-pulse" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-primary">
                    Approve bundler to spend your{" "}
                    {transactions
                      ?.reduce((sum, t) => sum + Number(t.amount), 0)
                      .toString() || "0"}{" "}
                    USDC (via permit)
                  </p>
                  {approvalStatus === "idle" && (
                    <Button
                      onClick={handleApproval}
                      size="sm"
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Waiting for Wallet..." : "Approve USDC"}
                    </Button>
                  )}
                  {approvalStatus === "error" && (
                    <Button
                      onClick={handleApproval}
                      size="sm"
                      variant="outline"
                      className="mt-2 text-red-500 border-red-500"
                    >
                      Retry Approval
                    </Button>
                  )}
                </div>
              </div>

              {/* STEP 2: Execute Deposit */}
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {depositStatus === "done" ? (
                    <CheckCircle2 className="text-blue-500 w-5 h-5" />
                  ) : depositStatus === "error" ? (
                    <XCircle className="text-red-500 w-5 h-5" />
                  ) : (
                    <Circle
                      className={`w-5 h-5 ${
                        approvalStatus === "done"
                          ? "text-blue-500"
                          : "text-secondary"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-primary">
                    Execute deposit transaction
                  </p>
                  <div
                    className={`mt-4 space-y-2 ${
                      approvalStatus !== "done" ? "opacity-50" : ""
                    }`}
                  >
                    {transactions?.map((t) => (
                      <div
                        key={t.token + "-deposit"}
                        className="p-3 bg-foreground rounded-lg text-[12px] text-secondary"
                      >
                        Supply {t.amount} USDC to {t.token}
                      </div>
                    ))}
                  </div>

                  {approvalStatus === "done" && depositStatus !== "done" && (
                    <Button
                      onClick={handleDeposit}
                      size="sm"
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isProcessing}
                    >
                      {isProcessing ? "Processing..." : "Execute Transaction"}
                    </Button>
                  )}
                  {depositStatus === "error" && (
                    <p className="text-sm text-red-500 mt-2">
                      Deposit failed. Please try again.
                    </p>
                  )}
                </div>
              </div>

              {/* STEP 3: Send FIX Message */}
              {/* <div className="flex items-start gap-3">
              <div className="mt-1">
                {fixStatus === "done" ? (
                  <CheckCircle2 className="text-blue-500 w-5 h-5" />
                ) : fixStatus === "error" ? (
                  <XCircle className="text-red-500 w-5 h-5" />
                ) : (
                  <Circle
                    className={`w-5 h-5 ${
                      depositStatus === "done"
                        ? "text-blue-500"
                        : "text-secondary"
                    }`}
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-primary">
                  Send quote request to IndexMaker
                </p>

                {depositStatus === "done" && fixStatus !== "done" && (
                  <Button
                    onClick={handleSendFixQuote}
                    size="sm"
                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Send FIX Quote
                  </Button>
                )}

                {fixStatus === "error" && (
                  <p className="text-sm text-red-500 mt-2">
                    Sending FIX message failed. Please retry.
                  </p>
                )}
              </div>
            </div> */}

              {/* Final Step: Transaction Finalizing */}
              {finalizing && txHash && (
                <div className="flex items-start gap-3 mt-4">
                  <div className="mt-1">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-primary">
                      Transaction{" "}
                      <a
                        href={`https://basescan.org/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-500"
                      >
                        {txHash.slice(0, 6)}...{txHash.slice(-4)}
                      </a>{" "}
                      is finalizing
                    </p>
                    <p className="text-sm text-secondary">
                      Feel free to browse as the transaction finalizes
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          {showSuccessModal && (
            <div className="fixed inset-0 bg-transaprent bg-opacity-60 flex items-center justify-center z-200">
              <div className="bg-background p-6 rounded-lg max-w-md w-full border border-accent z-100">
                <div className="flex flex-col items-center text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <h3 className="text-lg font-bold text-primary">
                    Transaction Successful!
                  </h3>
                  <p className="text-sm text-secondary">
                    Your deposit has been confirmed on the blockchain.
                  </p>
                  {txHash && (
                    <a
                      href={`https://basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 text-sm underline"
                    >
                      View on Explorer
                    </a>
                  )}
                  <Button
                    onClick={() => {
                      setShowSuccessModal(false);
                      toast.success("Deposit success...");
                    }}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
