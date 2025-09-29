"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import { MintInvoice } from "@/types";
import IndexMaker from "../icons/indexmaker";
import { redirect } from "next/navigation";
import { cn, shortenAddress } from "@/lib/utils";

interface InvoiceTableProps {
  invoices: MintInvoice[];
}

const ITEMS_PER_PAGE = 10;

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<{
    [key: string]: string | null;
  }>({});
  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentInvoices = invoices.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-background text-secondary border-accent";
      case "partial":
        return "bg-background text-secondary border-accent";
      case "pending":
        return "bg-background text-secondary border-accent";
      case "cancelled":
        return "bg-background text-secondary border-accent";
      default:
        return "bg-background text-secondary border-accent";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const viewDetail = (
    client_order_id: string,
    chain_id: string,
    address: string
  ) => {
    client_order_id &&
      redirect(`/invoices/${chain_id}/${address}/${client_order_id}`);
  };

  const handleAddressClick = (e: React.MouseEvent, address: string) => {
    e.stopPropagation(); // Prevent row click event
    window.open(
      `https://basescan.org/address/${address}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  function AddressLink({
    explorer,
    value,
    onCopy,
    copied,
    onAddressClick,
  }: {
    explorer: string;
    value: string;
    onCopy: () => void;
    copied: boolean;
    onAddressClick: (e: React.MouseEvent) => void;
  }) {
    // Generate consistent random image based on address
    const getAddressImage = (address: string) => {
      // Simple hash function to convert address to a number
      const hash = address.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);

      // Use absolute value and modulo to get a number between 1-10
      const imageNumber = (Math.abs(hash) % 10) + 1;

      // You can use different image sources:
      // Option 1: Placeholder images (like dice avatars)
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&size=64&radius=10`;

      // Option 2: Simple numbered placeholders (if you have your own images)
      // return `/images/avatars/avatar-${imageNumber}.png`;

      // Option 3: Gradient based on address
      // return `https://placeholder.com/32x32/${address.slice(2, 8)}/ffffff`;
    };

    const addressImage = getAddressImage(value);

    return (
      <div className="flex items-center gap-2">
        <img
          src={addressImage}
          alt="Address avatar"
          className="w-4 h-4 rounded-full"
        />
        <a
          className="text-sm underline hover:text-primary cursor-pointer"
          onClick={onAddressClick}
          title="View on BaseScan"
        >
          {value.slice(0, 6)}…{value.slice(-4)}
        </a>
        <button
          type="button"
          className="inline-flex h-6 w-8 items-center justify-center rounded hover:bg-accent"
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
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

  const onCopy = (v: string, invoiceId: string, copyType: string) => {
    navigator.clipboard.writeText(v);
    const copyKey = `${invoiceId}-${copyType}`;
    setCopiedStates((prev) => ({ ...prev, [copyKey]: copyType }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [copyKey]: null }));
    }, 1000);
  };

  const isCopied = (invoiceId: string, copyType: string) => {
    return copiedStates[`${invoiceId}-${copyType}`] === copyType;
  };

  return (
    <>
      <Card className="bg-foreground border-none rounded-[8px] mt-4 py-0">
        <CardContent className="p-0 overflow-x-auto rounded-[8px]">
          <Table className="rounded-[16px]">
            <TableHeader className="bg-foreground">
              <TableRow className="hover:bg-transparent border-accent h-[44px]">
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Invoice ID
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Symbol
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Address
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  USDC Amount
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Amount
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Fill Rate
                </TableHead>
                <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]">
                  Created
                </TableHead>
                {/* <TableHead className="text-secondary text-[13px] pl-[20px] pr-[72px]"></TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentInvoices.map((invoice) => (
                <TableRow
                  key={invoice.client_order_id}
                  className="border-accent hover:bg-accent/50 h-[54px] text-[13px] cursor-pointer"
                  onClick={() =>
                    viewDetail(
                      invoice.client_order_id,
                      invoice.chain_id,
                      invoice.address
                    )
                  }
                >
                  <TableCell className="pl-[20px] text-card pr-18">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {invoice.client_order_id}
                      </span>
                      {/* <ExternalLink className="w-3 h-3 text-secondary hover:text-primary cursor-pointer" /> */}
                    </div>
                  </TableCell>
                  <TableCell className="pl-[20px] text-card pr-18">
                    <div className="flex items-center gap-2">
                      <IndexMaker className="w-4 h-4 text-muted" />
                      {invoice.symbol}
                    </div>
                  </TableCell>
                  <TableCell className="pl-[20px] text-card pr-18">
                    <AddressLink
                      explorer={""}
                      value={invoice.address}
                      onCopy={() =>
                        onCopy(
                          invoice.address!,
                          invoice.client_order_id,
                          "address"
                        )
                      }
                      onAddressClick={(e) =>
                        handleAddressClick(e, invoice.address)
                      }
                      copied={isCopied(invoice.client_order_id, "address")}
                    />
                  </TableCell>
                  <TableCell className="pl-[20px] text-card pr-18 font-medium">
                    {invoice.amount_paid} {"USDC"}
                  </TableCell>
                  <TableCell className="pl-[20px] text-card pr-18 font-medium">
                    {invoice.filled_quantity} {invoice.symbol}
                  </TableCell>
                  <TableCell className="pl-[20px] text-card pr-18">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-secondary transition-all"
                          style={{ width: `${invoice.fill_rate * 100}%` }}
                        />
                      </div>
                      <span className="text-secondary">
                        {Math.min(Math.round(invoice.fill_rate * 100), 100)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="pl-[20px] text-secondary pr-18">
                    {formatDate(invoice.timestamp)}
                  </TableCell>
                  {/* <TableCell className="pl-[20px] text-card pr-18">
                    <Link href={`/invoices/${invoice.id}`} >
                      <ExternalLink className="h-4 w-4 text-secondary hover:text-primary cursor-pointer" />
                    </Link>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-center items-center mt-4 text-primary text-sx">
        <Button
          className="text-[11px] text-muted bg-background hover:bg-accent p-0 h-4"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-[11px] text-muted">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          className="text-[11px] text-muted bg-background hover:bg-accent p-0 h-4"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </>
  );
}
