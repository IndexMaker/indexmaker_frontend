"use client";

import { useEffect, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  ShieldQuestion,
  FileQuestionIcon,
  MessageCircleQuestion,
} from "lucide-react";
import { InvoiceChart } from "./invoice-chart";
import { LotsTable } from "./lots-table";
import { MintInvoice } from "@/types";
import { fetchMintInvoiceById } from "@/server/invoice";
import { Separator } from "@radix-ui/react-select";
import { BASES, fetchTxBundle, short } from "@/lib/txrpc";
import { CollateralPositionSection } from "./invoice-collateral";

interface InvoiceDetailsViewProps {
  client_order_id: string;
  chain_id: string;
  address: string;
}

export function InvoiceDetailsView({
  client_order_id,
  chain_id,
  address,
}: InvoiceDetailsViewProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<MintInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const txHash =
    "0x8bd07920d566e8f705bd3abe149c1c6aa6f5d9fb5f9e747d5f160ea05d1e58fa";
  const [copied, setCopied] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(txHash ?? null);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof fetchTxBundle>
  > | null>(null);
  const net = BASES[chain_id];

  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    "idle"
  );
  useEffect(() => {
    if (!txHash) return;
    let stop = false;

    const load = async () => {
      setStatus("loading");
      try {
        const b = await fetchTxBundle(chain_id, txHash); // <- Promise created/awaited in effect, not render
        if (!stop) {
          setData(b);
          setStatus("loaded");
          if (b.status === "pending") setTimeout(load, 5000); // repoll
        }
      } catch {
        if (!stop) setStatus("error");
      }
    };

    load();
    return () => {
      stop = true;
    };
  }, [chain_id, txHash]);
  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const data = await fetchMintInvoiceById(
          client_order_id,
          chain_id,
          address
        );
        setInvoice(data);
      } catch (error) {
        console.error("Failed to load invoice:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [client_order_id, chain_id, address]);
  if (!net) return null;

  const explorer = net.explorer;
  const formatCurrency = (amount: number) => {
    // return new Intl.NumberFormat("en-US", {
    //   style: "currency",
    //   currency: "USD",
    //   minimumFractionDigits: 2,
    //   maximumFractionDigits: 7,
    // }).format(amount);
    return amount + " USDC";
  };

  const onCopy = (v: string, key: string) => {
    navigator.clipboard.writeText(v);
    setCopied(key);
    setTimeout(() => setCopied(null), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-600/50 text-white border-green-500/20";
      case "partial":
        return "bg-yellow-500/50 text-white border-yellow-500/20";
      case "pending":
        return "bg-blue-500/50 text-white border-blue-500/20";
      case "cancelled":
        return "bg-red-500/50 text-white border-red-500/20";
      default:
        return "bg-accent text-white";
    }
  };

  function Row({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="grid grid-cols-[180px_1fr] items-center gap-1 px-2 py-1 md:grid-cols-[220px_1fr]">
        <dt className="flex items-center gap-2">
          <MessageCircleQuestion className="w-3 h-3 text-muted" />
          <dt className="text-[12px] text-muted-foreground">{label}</dt>
        </dt>
        <dd className="flex items-center gap-2 text-[12px]">{children}</dd>
      </div>
    );
  }
  function StatusPill({
    status,
  }: {
    status: "success" | "failed" | "pending";
  }) {
    const cls =
      status === "success"
        ? "bg-emerald-500/10 text-emerald-600"
        : status === "failed"
        ? "bg-red-500/10 text-red-600"
        : "bg-yellow-500/10 text-yellow-600"; // pending

    const dot =
      status === "success"
        ? "bg-emerald-500"
        : status === "failed"
        ? "bg-red-500"
        : "bg-yellow-500";

    return (
      <span
        className={`inline-flex items-center gap-2 rounded px-2.5 py-1 text-xs font-medium ${cls}`}
      >
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {status.toUpperCase()}
      </span>
    );
  }

  function AddressLink({
    explorer,
    value,
    onCopy,
    copied,
  }: {
    explorer: string;
    value: string;
    onCopy: () => void;
    copied: boolean;
  }) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={`${explorer}/address/${value}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
        >
          0x{value.slice(0, 6)}…{value.slice(-4)}
        </a>
        <button
          type="button"
          className="inline-flex h-6 w-8 items-center justify-center rounded hover:bg-accent"
          onClick={onCopy}
          aria-label="Copy address"
          title="Copy address"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }

  function timeAgo(input: number | Date): string {
    const ms = input instanceof Date ? input.getTime() : input;
    const seconds = Math.max(1, Math.floor((Date.now() - ms) / 1000));

    const steps: [number, Intl.RelativeTimeFormatUnit][] = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [7, "day"],
      [4.34524, "week"],
      [12, "month"],
    ];

    let value = seconds;
    let unit: Intl.RelativeTimeFormatUnit = "second";

    for (const [step, name] of steps) {
      if (value < step) break;
      value = Math.floor(value / step);
      unit = name;
    }

    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    return rtf.format(-value, unit);
  }
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-accent rounded w-1/3"></div>
          <div className="grid gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-accent rounded"></div>
              <div className="h-96 bg-accent rounded"></div>
            </div>
            {/* <div className="space-y-4">
              <div className="h-48 bg-accent rounded"></div>
              <div className="h-48 bg-accent rounded"></div>
            </div> */}
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center space-y-4">
          <h1 className="text-[38px] text-primary">Invoice Not Found</h1>
          <p className="text-muted-foreground">
            The requested invoice could not be found.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[38px] text-primary">Invoice Details</h1>
            <Badge className={getStatusColor("completed")}>
              {"completed".charAt(0).toUpperCase() +
                "completed".slice(1).toLowerCase()}
            </Badge>
          </div>
          <p className="text-muted-foreground">Invoice ID: {invoice.id}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-secondary bg-foreground cursor-pointer"
          onClick={() => redirect("/invoices")}
        >
          <ArrowLeft className="h-4 w-4 mr-2 text-secondary" />
          Back
        </Button>
        {/* <Button variant="outline" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Explorer
        </Button> */}
      </div>

      <div className="grid gap-4">
        {/* Main Content */}
        <CollateralPositionSection
          position={
            Array.isArray(invoice.position)
              ? invoice.position[0]
              : invoice.position
          }
        />

        {/* Body rows */}
        <Card className="divide-y bg-foreground p-2 gap-2">
          <Row label="Transaction Hash">
            <code className="flex-1 rounded bg-accent px-3 py-2 font-mono text-[13px]">
              {hash ?? "—"}
            </code>
            {hash && (
              <>
                <button
                  type="button"
                  className="inline-flex h-6 w-8 items-center justify-center rounded hover:bg-accent"
                  onClick={() => onCopy(hash, "hash")}
                  aria-label="Copy hash"
                >
                  {copied === "hash" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <a
                  href={`${explorer}/tx/${hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-6 w-8 items-center justify-center rounded hover:bg-accent"
                  aria-label="View on Basescan"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </>
            )}
          </Row>

          <Row label="Status">
            {data ? (
              <StatusPill status={data.status} />
            ) : (
              <span className="rounded bg-accent px-2 py-1 text-xs text-muted-foreground">
                {"Completed"}
              </span>
            )}
          </Row>

          <Row label="Block">
            {data?.blockNumber != null ? (
              <a
                href={`${explorer}/block/${data.blockNumber}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                {data.blockNumber}
              </a>
            ) : (
              <span className="text-sm">12345678</span>
            )}
          </Row>

          <Row label="Timestamp">
            {data?.timestamp ? (
              <span className="text-sm">
                {new Date(data.timestamp * 1000).toLocaleString()}{" "}
                <span className="text-muted-foreground">
                  ({timeAgo(data.timestamp * 1000)})
                </span>
              </span>
            ) : (
              <span className="text-sm">Sep 8, 2025, 10:30:15 AM</span>
            )}
          </Row>

          <Row label="From">
            {data?.from ? (
              <AddressLink
                explorer={explorer}
                value={data.from}
                onCopy={() => onCopy(data.from!, "from")}
                copied={copied === "from"}
              />
            ) : (
              <span className="text-sm">
                0x742d35Cc6634C0532925a3b844Bc454e4438f44e
              </span>
            )}
          </Row>

          <Row label="To">
            {data?.to ? (
              <AddressLink
                explorer={explorer}
                value={data.to}
                onCopy={() => onCopy(data.to!, "to")}
                copied={copied === "to"}
              />
            ) : (
              <span className="text-sm">
                0x4e9ce36e442e55ecd9025b9a6e0d88485d628a67
              </span>
            )}
          </Row>

          <Row label="Value">
            <span className="text-sm font-semibold">
              {data
                ? `${data.valueEth.toFixed(6)} ${BASES[chain_id].symbol}`
                : "0.025000 ETH"}
            </span>
          </Row>

          <Row label="Transaction Fee">
            <span className="text-sm font-semibold">
              {data?.feeEth != null
                ? `${data.feeEth.toFixed(6)} ${BASES[chain_id].symbol}`
                : "0.001234 ETH"}
            </span>
          </Row>

          <Row label="Gas Price">
            <span className="text-sm font-semibold">
              {data?.effectiveGasPriceGwei != null
                ? `${data.effectiveGasPriceGwei.toFixed(6)} Gwei`
                : data?.gasPriceGwei != null
                ? `${data.gasPriceGwei.toFixed(6)} Gwei`
                : "0.0001 Gwei"}
            </span>
          </Row>
        </Card>

        <LotsTable lots={invoice.lots} />

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Accounting Summary */}
          {/* <Card className="bg-foreground">
            <CardHeader>
              <CardTitle>Accounting Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Paid In</span>
                  <span className="font-semibold text-chart-1">
                    {formatCurrency(invoice.amount_paid)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Exchange Fee
                  </span>
                  <span className="font-semibold text-destructive">
                    -{formatCurrency(invoice.exchange_fee)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Management Fee
                  </span>
                  <span className="font-semibold text-destructive">
                    -{formatCurrency(invoice.management_fee)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Management Delta
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.amount_remaining)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Assets Value
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(invoice.assets_value)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Filled Quantity
                  </span>
                  <span className="font-semibold">
                    {invoice.filled_quantity.toFixed(7)} {invoice.symbol}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Position Summary */}
          {/* <PositionSummary positions={invoice.position} /> */}

          {/* Chart */}
          {/* <InvoiceChart lots={invoice.lots} /> */}
        </div>
      </div>
    </div>
  );
}
