"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Circle,
  Sparkles,
  Copy,
  Loader2,
  Link as LinkIcon,
  X,
} from "lucide-react";
import Image from "next/image";
import { BrowserProvider, Contract, ethers, parseUnits } from "ethers";
import erc20Abi from "@/lib/abi/ERC20.json";
import otcIndexAbi from "@/lib/abi/otcIndex.json";
import USDC from "../../public/logos/usd-coin.png";
import IndexMaker from "../icons/indexmaker";
import CustomTooltip from "./custom-tooltip";
import { toast } from "sonner";
import { useWallet } from "@/contexts/wallet-context";
import { useQuoteContext } from "@/contexts/quote-context";
import onboard from "@/lib/blocknative/web3-onboard";
import { sendMintInvoiceToBackend } from "@/server/indices";
import { setLatestInvoice } from "@/redux/mintInvoicesSlice";
import { useDispatch } from "react-redux";
import { MintInvoice } from "@/types";

// ---------- Config ----------
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDC_DECIMALS = 6;
const EXPLORER_TX = "https://basescan.org/tx/";

type OnboardWallet = {
  label: string;
  accounts: { address: string }[];
  provider: any; // EIP-1193
  chains?: { id: string }[];
};
export const getActiveWalletProvider = () => {
  const connected = onboard.state.get().wallets as OnboardWallet[];
  if (!connected || connected.length === 0) return null;
  // If you allow multiple wallets at once, pick the one you want (first here)
  return connected[0].provider;
};

export const getActiveWalletAccount = () => {
  const connected = onboard.state.get().wallets as OnboardWallet[];
  if (!connected || connected.length === 0) return null;
  const acc = connected[0].accounts?.[0]?.address;
  return acc ?? null;
};

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

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: TransactionItem[] | null;
  index_address: string;
  symbol: string;
}

// ---------- Helpers (mint invoice UI, adapted from your sample) ----------
function formatDateTime(isoString: string) {
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  const padMs = (n: number) => String(n).padStart(3, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.${padMs(date.getMilliseconds())}`;
}

function openMintInvoiceWindow(invoice: any) {
  const client_order_id = invoice.client_order_id;
  const chain_id = invoice.chain_id;
  const address = invoice.address;
  if (client_order_id) {
    const invoiceUrl = `/invoices/${chain_id}/${address}/${client_order_id}`;
    window.open(invoiceUrl, "_blank", "noopener,noreferrer");
  } else {
    const w = window.open("about:blank", "_blank");
    if (!w) {
      toast.error("Please allow popups to view the invoice.");
      return;
    }

    // Simple, styled page with summary + table. (Compact version of your sample.)
    const rows =
      (invoice?.lots || [])
        .map(
          (lot: any) => `
        <tr>
          <td>${lot.symbol}</td>
          <td style="text-align:right">${(
            +lot.price * +lot.assigned_quantity
          ).toFixed(7)}</td>
          <td style="text-align:right">${(+lot.price).toFixed(7)}</td>
          <td style="text-align:right">${(+lot.assigned_quantity).toFixed(
            7
          )}</td>
          <td style="text-align:right">${(+lot.assigned_fee).toFixed(7)}</td>
          <td>${formatDateTime(lot.assigned_timestamp)}</td>
          <td>${lot.lot_id}</td>
        </tr>`
        )
        .join("") || "";

    const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Mint Invoice</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; padding: 24px; color: #0a0a0a; }
      h1 { font-size: 22px; margin: 0 0 16px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
      .label { color: #666; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #eee; }
      th, td { padding: 8px 10px; border-bottom: 1px solid #f2f2f2; font-size: 13px; }
      th { text-align: left; background: #fafafa; color: #444; }
      .box { border: 1px solid #eee; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
      .muted { color: #666; }
    </style>
  </head>
  <body>
    <h1>Mint Invoice</h1>

    <div class="box grid">
      <div><div class="label">Chain ID</div><div>${
        invoice?.chain_id ?? "-"
      }</div></div>
      <div><div class="label">Address</div><div>${
        invoice?.address ?? "-"
      }</div></div>
      <div><div class="label">Client Order ID</div><div>${
        invoice?.client_order_id ?? "-"
      }</div></div>
      <div><div class="label">Payment ID</div><div>${
        invoice?.payment_id ?? "-"
      }</div></div>
      <div><div class="label">Symbol</div><div>${
        invoice?.symbol ?? "-"
      }</div></div>
      <div><div class="label">Filled Quantity</div><div>${(
        +invoice?.filled_quantity || 0
      ).toFixed(7)}</div></div>
    </div>

    <div class="box">
      <div class="label">Accounting Summary</div>
      <div class="grid" style="margin-top:8px">
        <div><div class="label">Paid In</div><div>${(
          +invoice?.amount_paid || 0
        ).toFixed(7)} CR</div></div>
        <div><div class="label">Exchange Fee</div><div>${(
          +invoice?.exchange_fee || 0
        ).toFixed(7)} DR</div></div>
        <div><div class="label">Management Fee</div><div>${(
          +invoice?.management_fee || 0
        ).toFixed(7)} DR</div></div>
        <div><div class="label">Assets Value</div><div>${(
          +invoice?.assets_value || 0
        ).toFixed(7)} USDC</div></div>
        <div><div class="label">Fill Rate</div><div>${Math.min(
          (+invoice?.fill_rate || 0) * 100,
          100
        ).toFixed(2)}%</div></div>
        <div><div class="label">Amount Remaining</div><div>${(
          +invoice?.amount_remaining || 0
        ).toFixed(7)} USDC</div></div>
      </div>
    </div>

    <div class="box">
      <div class="label" style="margin-bottom:8px">Asset Lots</div>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th style="text-align:right">Value (USDC)</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Assigned Qty</th>
            <th style="text-align:right">Assigned Fee</th>
            <th>Assigned At</th>
            <th>Lot ID</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="muted" style="margin-top:8px">Rendered ${new Date().toLocaleString()}</div>
    </div>
  </body>
  </html>`;

    w.document.write(html);
    w.document.close();
  }
}

// ---------- Main Component ----------
export function TransactionConfirmModal({
  isOpen,
  onClose,
  transactions,
  index_address,
  symbol,
}: TransactionConfirmModalProps) {
  // UI flow: review → confirm → processing
  const [step, setStep] = useState<"review" | "confirm">("review");

  // Step statuses
  const [orderStatus, setOrderStatus] = useState<"idle" | "done" | "error">(
    "idle"
  );
  const [approvalStatus, setApprovalStatus] = useState<
    "idle" | "done" | "error"
  >("idle");
  const [depositStatus, setDepositStatus] = useState<"idle" | "done" | "error">(
    "idle"
  );
  const dispatch = useDispatch();
  // Progress + receipts
  const [clientOrderId, setClientOrderId] = useState<string | null>(null);
  const [orderProgressPct, setOrderProgressPct] = useState<number>(0);
  const [mintInvoice, setMintInvoice] = useState<any | null>(null);

  const [approvalBlock, setApprovalBlock] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const [txBlockNumber, setTxBlockNumber] = useState<number | null>(null);
  const [mintedQuantity, setMintedQuantity] = useState<number | null>(null);
  const sentInvoiceRef = useRef(false);
  const activeOrderIdRef = useRef<string | null>(null);
  const fillUnsubRef = useRef<null | (() => void)>(null);
  const invoiceUnsubRef = useRef<null | (() => void)>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { wallet, connectWallet } = useWallet();
  const {
    requestQuoteAndWait,
    sendNewIndexOrder,
    subscribeOrderFill,
    subscribeMintInvoice,
    sendCancelIndexOrder,
    setNakHandler,
    setAckHandler,
  } = useQuoteContext();

  const subscribeNakRef = useRef<null | ((nak: any) => void)>(null);
  const subscribeOrderFillRef = useRef(subscribeOrderFill);
  const subscribeMintInvoiceRef = useRef(subscribeMintInvoice);

  useEffect(() => {
    const handleNak = (nak: any) => {
      console.error("[MODAL] NAK:", nak.reason);
      setOrderStatus("error");
      toast.error(`Order rejected: ${nak.reason || "Unknown reason"}`);
    };
    subscribeNakRef.current = handleNak;
    setNakHandler(handleNak);

    return () => {
      setNakHandler(() => {});
    };
  }, []);

  useEffect(() => {
    const handleAck = (ack: any) => {
      const id = String(ack?.client_order_id ?? "");
      const current = activeOrderIdRef.current;
      if (!current || id !== current) return;

      // Try to detect which message got ACKed
      const s = JSON.stringify(ack).toLowerCase();
      const ackedNew =
        ack?.original_msg_type === "NewIndexOrder" ||
        ack?.acknowledged_msg_type === "NewIndexOrder" ||
        s.includes("newindexorder");

      const ackedCancel =
        ack?.original_msg_type === "CancelIndexOrder" ||
        ack?.acknowledged_msg_type === "CancelIndexOrder" ||
        s.includes("cancelindexorder");

      if (ackedNew) {
        // ✅ show that order is created & cancellable immediately after ACK
        setOrderStatus("done");
      } else if (ackedCancel) {
        // ✅ reflect cancellation; disable next steps and clear progress
        setOrderStatus("idle");
        setOrderProgressPct(0);
        // optionally also clear subscriptions to avoid stray updates
        try {
          fillUnsubRef.current?.();
        } catch {}
        try {
          invoiceUnsubRef.current?.();
        } catch {}
        fillUnsubRef.current = null;
        invoiceUnsubRef.current = null;
        activeOrderIdRef.current = null;
      }
    };

    setAckHandler(handleAck);
    return () => setAckHandler(() => {});
  }, [setAckHandler]);

  // keep refs updated when context functions change
  useEffect(() => {
    subscribeOrderFillRef.current = subscribeOrderFill;
    subscribeMintInvoiceRef.current = subscribeMintInvoice;
  }, [subscribeOrderFill, subscribeMintInvoice]);

  // subscribe effect — deps ALWAYS length 1
  useEffect(() => {
    if (!clientOrderId) return;

    const unsubFill = subscribeOrderFillRef.current(
      String(clientOrderId),
      (pct: number) => {
        setOrderProgressPct(Math.min(Number(pct) || 0, 100));
      }
    );

    const unsubInvoice = subscribeMintInvoiceRef.current(
      String(clientOrderId),
      (invoice: any) => {
        console.log("[SUB] invoice", invoice);
        setMintInvoice(invoice);
        const q = Number(invoice?.filled_quantity);
        if (!Number.isNaN(q)) setMintedQuantity(q);
        setOrderProgressPct(100);
      }
    );

    return () => {
      try {
        unsubFill && unsubFill();
      } catch {}
      try {
        unsubInvoice && unsubInvoice();
      } catch {}
    };
  }, [clientOrderId]);

  // Derived totals
  const totalUSDC = useMemo(() => {
    const n = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;
    return Number.isFinite(n) ? n : 0;
  }, [transactions]);

  // Lightweight WS listener for order fills + mint invoice for THIS order only.
  // (We keep QuoteContext intact; this is scoped to the modal lifecycle.)
  // const wsRef = useRef<WebSocket | null>(null);
  // useEffect(() => {
  //   if (!clientOrderId || !isOpen) return;

  //   const url = process.env.NEXT_PUBLIC_QUOTE_SERVER;
  //   if (!url) return;

  //   wsRef.current = new WebSocket(url);
  //   wsRef.current.onopen = () => {
  //     // No need to send anything; server broadcasts updates
  //   };
  //   wsRef.current.onmessage = (e) => {
  //     try {
  //       const msg = JSON.parse(e.data);
  //       const type = msg?.standard_header?.msg_type;

  //       if (
  //         type === "IndexOrderFill" &&
  //         msg?.client_order_id === clientOrderId
  //       ) {
  //         const pct = Math.min(parseFloat(msg.fill_rate || "0") * 100, 100);
  //         if (!Number.isNaN(pct)) setOrderProgressPct(pct);
  //       }

  //       if (type === "MintInvoice" && msg?.client_order_id === clientOrderId) {
  //         setMintInvoice(msg);
  //         const q = Number(msg?.filled_quantity);
  //         if (!Number.isNaN(q)) setMintedQuantity(q);
  //       }
  //     } catch {
  //       // ignore bad frames
  //     }
  //   };
  //   wsRef.current.onclose = () => {};
  //   wsRef.current.onerror = () => {};

  //   return () => {
  //     wsRef.current?.close();
  //     wsRef.current = null;
  //   };
  // }, [clientOrderId, isOpen]);

  // Flow actions
  const handleConfirm = async () => {
    if (!wallet) {
      await connectWallet();
    }
    setStep("confirm");
  };

  // STEP 1 — Send Index Order (first)
  const handleSendOrder = useCallback(async () => {
    try {
      if (!wallet?.accounts?.[0]?.address) {
        await connectWallet();
        if (!wallet?.accounts?.[0]?.address) {
          toast.error("Wallet connection required.");
          return;
        }
      }

      setIsProcessing(true);
      setOrderStatus("idle");
      const address = wallet.accounts[0].address;
      const side: "1" | "2" = "1";
      const id = await sendNewIndexOrder({
        address,
        symbol,
        side,
        amount: totalUSDC.toString(),
      });

      const orderId = String(id);
      activeOrderIdRef.current = orderId;
      setClientOrderId(orderId);

      // (re)subscribe immediately (avoid race with fast server events)
      fillUnsubRef.current?.();
      invoiceUnsubRef.current?.();

      fillUnsubRef.current = subscribeOrderFill(orderId, (pct: number) => {
        // ignore stale fills from previous orders
        if (activeOrderIdRef.current !== orderId) return;
        setOrderProgressPct(Math.min(Number(pct) || 0, 100));

        setOrderStatus("done");
      });

      invoiceUnsubRef.current = subscribeMintInvoice(
        orderId,
        (invoice: any) => {
          console.log(activeOrderIdRef.current !== orderId);
          if (activeOrderIdRef.current !== orderId) return;
          console.log("[MODAL] invoice", invoice);
          setMintInvoice(invoice);
          dispatch(setLatestInvoice(invoice as MintInvoice )); 
          const q = Number(invoice?.filled_quantity);
          if (!Number.isNaN(q)) setMintedQuantity(q);
          setOrderProgressPct(100);
          setOrderStatus("done");
        }
      );

      setOrderStatus("idle");
    } catch (e) {
      console.error("Order error:", e);
      setOrderStatus("error");
      toast.error("Failed to send index order.");
    } finally {
      setIsProcessing(false);
    }
  }, [wallet, totalUSDC, dispatch]);

  const handleCancelOrder = async () => {
    try {
      if (!clientOrderId) return;
      // Only allow cancel before on-chain deposit has succeeded
      if (depositStatus === "done") return;

      const addr = wallet?.accounts?.[0]?.address as `0x${string}` | undefined;
      if (!addr) {
        await connectWallet();
      }
      const address = (wallet?.accounts?.[0]?.address ||
        getActiveWalletAccount()) as `0x${string}`;
      if (!address) {
        toast.error("Wallet connection required to cancel.");
        return;
      }

      await sendCancelIndexOrder({
        address,
        symbol,
        side: "1", // must match NewIndexOrder
        amount: totalUSDC.toString(), // must match NewIndexOrder
        client_order_id: clientOrderId,
      });

      toast.success("Order cancellation sent.");
    } catch (e) {
      console.error("Cancel error:", e);
      toast.error("Failed to send cancellation.");
    }
  };

  const handleCancelAndClose = async () => {
    // Only auto-cancel if the user is in the confirm flow and hasn’t deposited yet,
    // and we actually created an order.
    if (
      step === "confirm" &&
      orderStatus === "done" &&
      depositStatus !== "done" &&
      clientOrderId
    ) {
      await handleCancelOrder();
    }
    handleClose();
  };

  // STEP 2 — Approve & Deposit (second)
  const handleApproval = async () => {
    try {
      setIsProcessing(true);
      setApprovalStatus("idle");

      const eip1193 = getActiveWalletProvider();
      const userAddr = getActiveWalletAccount();

      if (!eip1193 || !userAddr) {
        // no connected wallet — trigger your connect flow
        await connectWallet?.();
        return;
      }

      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const usdc = new Contract(USDC_ADDRESS, erc20Abi.abi, signer);

      const amount = parseUnits(totalUSDC.toString(), USDC_DECIMALS);
      const owner = (await signer.getAddress()) as `0x${string}`;
      const allowance: bigint = await usdc.allowance(owner, index_address);

      if (allowance < amount) {
        const tx = await usdc.approve(index_address, amount);
        const receipt = await tx.wait();
        setApprovalBlock(BigInt(receipt.blockNumber));
      } else {
        const latest = await provider.getBlockNumber();
        setApprovalBlock(BigInt(latest));
      }

      setApprovalStatus("done");
      toast.success("USDC approved.");
    } catch (e) {
      console.error("Approval error:", e);
      setApprovalStatus("error");
      toast.error("Approval failed.");
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
      const otcIndex = new Contract(index_address, otcIndexAbi.abi, signer);

      const network = await provider.getNetwork();
      const chainId = network.chainId; // bigint
      const userAddr = ethers.getAddress(await signer.getAddress());

      const amount = parseUnits(totalUSDC.toString(), USDC_DECIMALS);

      if (approvalBlock == null) {
        toast.error("Missing approval block — please approve again.");
        setDepositStatus("error");
        return;
      }

      // 4B chain | 8B block | 20B address
      const addrBN = BigInt(userAddr);
      const seqNumNewOrderSingle =
        ((chainId & ((1n << 32n) - 1n)) << (64n + 160n)) |
        ((approvalBlock & ((1n << 64n) - 1n)) << 160n) |
        (addrBN & ((1n << 160n) - 1n));

      const admin = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || ethers.ZeroAddress;

      const tx = await otcIndex.deposit(
        amount,
        seqNumNewOrderSingle,
        admin,
        ethers.ZeroAddress
      );

      const receipt = await tx.wait();
      setTxHash(tx.hash);

      setDepositStatus("done");
      toast.success("Deposit confirmed on-chain.");

      setTxHash(tx.hash);
      setTxBlockNumber(receipt.blockNumber);
    } catch (e) {
      console.error("Deposit error:", e);
      setDepositStatus("error");
      toast.error("Deposit failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset modal internal state on close
  const handleClose = () => {
    fillUnsubRef.current?.();
    invoiceUnsubRef.current?.();
    fillUnsubRef.current = null;
    invoiceUnsubRef.current = null;
    activeOrderIdRef.current = null;

    setStep("review");
    setOrderStatus("idle");
    setApprovalStatus("idle");
    setDepositStatus("idle");
    setApprovalBlock(null);
    setClientOrderId(null);
    setOrderProgressPct(0);
    setMintInvoice(null);
    setTxHash(null);
    setTxBlockNumber(null);
    setMintedQuantity(null);
    sentInvoiceRef.current = false;
    setIsProcessing(false);
    onClose();
  };

  useEffect(() => {
    const haveTx = txHash && typeof txBlockNumber === "number";
    const haveQty = typeof mintedQuantity === "number";
    if (!sentInvoiceRef.current && haveTx && haveQty) {
      sentInvoiceRef.current = true; // guard against duplicates
      sendMintInvoiceToBackend({
        txHash: txHash!,
        blockNumber: txBlockNumber!,
        logIndex: 0,
        eventType: "mint",
        contractAddress: index_address,
        network: "base",
        userAddress: wallet?.accounts[0]?.address,
        amount: totalUSDC.toString(),
        quantity: mintedQuantity!,
      }).catch((err) => {
        console.error("sendMintInvoiceToBackend failed:", err);
        sentInvoiceRef.current = false; // allow retry
      });
    }
  }, [
    txHash,
    txBlockNumber,
    mintedQuantity,
    index_address,
    wallet?.accounts,
    totalUSDC,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancelAndClose}>
      <DialogContent
        className="max-w-2xl bg-background border-accent text-primary z-50"
        onInteractOutside={(e: any) => e.preventDefault()}
      >
        <div className="flex justify-between items-center pb-2">
          <DialogTitle className="text-lg font-bold">
            {step === "review" ? "Review transaction" : "Confirm transaction"}
          </DialogTitle>
        </div>

        {/* REVIEW */}
        {step === "review" && transactions ? (
          <div className="space-y-4">
            {transactions.map((t, idx) => (
              <div key={t.token} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-transparent rounded-full flex items-center justify-center">
                    <IndexMaker className="w-[24px] h-[24px] text-muted" />
                  </div>
                  <span className="font-bold text-[18px]">{t.token}</span>
                </div>

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
                      <span className="font-medium">{t.amount} USDC</span>
                    </div>
                  </div>

                  {/* <div className="flex justify-between items-center text-[12px]">
                    <span className="text-secondary">Year to Date</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{t.apy}</span>
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                  </div> */}

                  {/* <div className="flex justify-between items-center text-[12px]">
                    <span className="text-secondary">Collateral</span>
                    <div className="flex items-center gap-1">
                      {t.collateral.slice(0, 5).map((c, i) => (
                        <CustomTooltip
                          key={`col-${i}`}
                          content={
                            <div className="flex flex-col gap-1 min-w-[220px] bg-foreground rounded-[8px]">
                              <div className="flex justify-between border-b py-1 px-3 border-accent">
                                <span>Collateral</span>
                                <div className="flex items-center">
                                  <Image
                                    src={c.logo || USDC}
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
                              src={c.logo ?? USDC}
                              alt={c.name}
                              width={17}
                              height={17}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </CustomTooltip>
                      ))}
                      {t.collateral.length > 5 && (
                        <CustomTooltip
                          content={
                            <div className="flex flex-col gap-2 p-2 overflow-y-auto max-h-[300px] bg-foreground">
                              {t.collateral.slice(5).map((c, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2"
                                >
                                  <span>{c.name}</span>
                                </div>
                              ))}
                            </div>
                          }
                        >
                          <span className="text-[12px] pl-2 text-secondary">
                            + {t.collateral.length - 5}
                          </span>
                        </CustomTooltip>
                      )}
                    </div>
                  </div> */}
                </div>

                {idx < transactions.length - 1 && (
                  <div className="border-t border-accent my-4" />
                )}
              </div>
            ))}

            <p className="text-[11px] text-secondary">
              By confirming this transaction, you agree to the{" "}
              <a
                target="_blank"
                href="https://psymm.gitbook.io/indexmaker/index-maker-hld/compliance/terms-of-use"
                className="underline cursor-pointer"
              >
                Terms of Use
              </a>{" "}
              and the service provisions relating to the IndexMaker Vault.
            </p>

            <Button
              onClick={handleConfirm}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Confirm"}
            </Button>
          </div>
        ) : (
          // CONFIRM / PROCESSING
          <div className="space-y-5">
            {/* STEP 1: Send Index Order (FIRST) */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {orderStatus === "done" ? (
                  <>
                    <CheckCircle2 className="text-blue-500 w-5 h-5" />
                  </>
                ) : orderStatus === "error" ? (
                  <XCircle className="text-red-500 w-5 h-5" />
                ) : (
                  <Circle className="text-blue-500 w-5 h-5 animate-pulse" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-primary">
                  Send Index Order (create order with {totalUSDC} USDC)
                </p>
                {orderStatus === "idle" && (
                  <Button
                    onClick={handleSendOrder}
                    size="sm"
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </span>
                    ) : (
                      "Send Order"
                    )}
                  </Button>
                )}
                {orderStatus === "error" && (
                  <Button
                    onClick={handleSendOrder}
                    size="sm"
                    variant="outline"
                    className="mt-3 text-red-500 border-red-500"
                  >
                    Retry Send Order
                  </Button>
                )}
              </div>
            </div>

            {/* STEP 2: Approve & Deposit (SECOND) */}
            <div className="flex items-start gap-3">
              <div className="mt-1">
                {approvalStatus === "done" && depositStatus === "done" ? (
                  <CheckCircle2 className="text-blue-500 w-5 h-5" />
                ) : approvalStatus === "error" || depositStatus === "error" ? (
                  <XCircle className="text-red-500 w-5 h-5" />
                ) : (
                  <Circle
                    className={`w-5 h-5 ${
                      orderStatus === "done"
                        ? "text-blue-500"
                        : "text-secondary"
                    }`}
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-primary">
                  Approve & deposit USDC to Index contract
                </p>

                {/* Progress bar (fills when server emits IndexOrderFill) */}
                <div className="mt-3">
                  <div className="h-2 rounded bg-accent overflow-hidden">
                    <div
                      className="h-2 bg-blue-600 transition-all"
                      style={{ width: `${orderProgressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-secondary mt-1">
                    <span>Order progress</span>
                    <span>{orderProgressPct.toFixed(1)}%</span>
                  </div>
                </div>

                <div
                  className={`mt-3 space-y-2 ${
                    orderStatus !== "done"
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                >
                  <div className="p-3 bg-foreground rounded-lg text-[12px] text-secondary">
                    Approve bundler to spend {totalUSDC} USDC
                  </div>
                  {approvalStatus !== "done" ? (
                    <Button
                      onClick={handleApproval}
                      size="sm"
                      className="mt-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Waiting
                          for wallet...
                        </span>
                      ) : (
                        "Approve USDC"
                      )}
                    </Button>
                  ) : (
                    <>
                      <div className="p-3 bg-foreground rounded-lg text-[12px] text-secondary">
                        Execute on-chain deposit
                      </div>
                      {depositStatus !== "done" && (
                        <Button
                          onClick={handleDeposit}
                          size="sm"
                          className="mt-1 bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />{" "}
                              Processing...
                            </span>
                          ) : (
                            "Execute Deposit"
                          )}
                        </Button>
                      )}
                    </>
                  )}

                  {(approvalStatus === "error" ||
                    depositStatus === "error") && (
                    <p className="text-sm text-red-500">
                      {approvalStatus === "error"
                        ? "Approval failed. Please retry."
                        : "Deposit failed. Please retry."}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3: Finalizing + links */}
            {(txHash || mintInvoice) && (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-medium text-primary">
                    Finalized
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {txHash && (
                      <a
                        href={`${EXPLORER_TX}${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-500 text-sm underline"
                      >
                        <LinkIcon className="w-4 h-4" />
                        View on Explorer ({txHash.slice(0, 6)}...
                        {txHash.slice(-4)})
                      </a>
                    )}
                    <Button
                      variant={mintInvoice ? "default" : "secondary"}
                      disabled={!mintInvoice}
                      className={`text-sm ${
                        mintInvoice
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : ""
                      }`}
                      onClick={() =>
                        mintInvoice && openMintInvoiceWindow(mintInvoice)
                      }
                    >
                      {mintInvoice
                        ? "Open Mint Invoice"
                        : "Waiting for Mint Invoice..."}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer actions */}
            {mintInvoice && (
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
