"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import Link from "next/link";
import { cn, shortenAddress } from "@/lib/utils";
import RightArrow from "../icons/right-arrow";
import { useLanguage } from "@/contexts/language-context";
import { useQuoteContext } from "@/contexts/quote-context";
import IndexMaker from "../icons/indexmaker";
import { useCallback, useMemo } from "react";

export interface TokenBalance {
  address: string; // "native" for gas token
  symbol: string;
  name?: string;
  logoUrl?: string;
  balanceRaw: string; // bigint string
  decimals: number;
  usdPrice?: number; // optional
}

export interface ITPBalance {
  // ITP (Index Token Product) ERC-20 contract address
  address: string;
  // Short ticker, e.g. "ITP-AI"
  symbol: string;
  // Friendly name, e.g. "AI Index"
  name?: string;
  // Logo/icon
  logoUrl?: string;
  // Wallet balance in raw units
  balanceRaw: string;
  // Decimals
  decimals: number;
  // Optional USD price per ITP token
  usdPrice?: number;
  quantity?: string;
  // Optional: total share (%) the user owns of the ITP supply
  sharePct?: number;
}

interface WalletHoldingsTableProps {
  tokens: TokenBalance[];
  itps: ITPBalance[];
  isLoading?: boolean;
  errorText?: string;
  explorerBaseUrl?: string; // e.g. https://basescan.org
  hideZeroBalances?: boolean; // default false: show everything
  className?: string;
}

const columns = [
  { id: "asset", name: "Asset" },
  { id: "balance", name: "Balance" },
  { id: "value", name: "Value" },
  //   { id: "extra", name: "Info" },
  { id: "contract", name: "Contract" },
] as const;

function formatUnits(raw: string, decimals: number): number {
  if (!raw) return 0;
  const padded = raw.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals);
  const fracPart = padded.slice(-decimals).replace(/0+$/, "");
  const str = fracPart ? `${intPart}.${fracPart}` : intPart;
  return Number(str);
}

function toUSD(amount: number, price?: number): number | undefined {
  if (price == null) return undefined;
  return amount * price;
}

function formatNumber(n?: number, opts: Intl.NumberFormatOptions = {}) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
    ...opts,
  }).format(n);
}

export default function WalletHoldingsTable({
  tokens,
  itps,
  isLoading = false,
  errorText,
  explorerBaseUrl = "https://basescan.org",
  hideZeroBalances = false,
  className,
}: WalletHoldingsTableProps) {
  const { t } = useLanguage();
  const { indexPrices } = useQuoteContext();
  const normalize = useCallback(
    (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
    []
  );
  const getLiveIndexPrice = useCallback(
    (symbol: string): number | undefined => {
      if (!indexPrices) return undefined;
      if (indexPrices[symbol] != null) return Number(indexPrices[symbol]);
      const norm = normalize(symbol);
      for (const [k, v] of Object.entries(indexPrices)) {
        if (normalize(k) === norm) return Number(v);
      }
      return undefined;
    },
    [indexPrices, normalize]
  );
  const filterZero = (amt: number) => (hideZeroBalances ? amt > 0 : true);

  const tokenRows = tokens
    .map((t) => ({
      ...t,
      amount: formatUnits(t.balanceRaw, t.decimals),
      value: toUSD(formatUnits(t.balanceRaw, t.decimals), t.usdPrice),
    }))
    .filter((r) => filterZero(r.amount))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || b.amount - a.amount);

  const itpRows = useMemo(() => {
    return itps
      .map((itp) => {
        const amount = Number(itp.quantity); // already human units in your code
        const livePrice = getLiveIndexPrice(itp.symbol); // USDC per ITP
        const priceToUse = livePrice ?? itp.usdPrice;
        return { ...itp, amount, value: toUSD(amount, priceToUse) };
      })
      .filter((r) => filterZero(r.amount))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0) || b.amount - a.amount);
  }, [itps, getLiveIndexPrice, filterZero]);

  const hasAnyRows = tokenRows.length + itpRows.length > 0;

  const sectionHeader = (label: string) => (
    <TableRow>
      <TableCell
        colSpan={columns.length}
        className="bg-white/5 text-[12px] uppercase tracking-wide text-secondary py-2"
      >
        {label}
      </TableCell>
    </TableRow>
  );

  return (
    <Card
      className={cn("bg-foreground border-none rounded-[8px] py-0", className)}
    >
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader className="bg-foreground">
            <TableRow className="hover:bg-transparent border-[#afafaf1a] h-[44px]">
              {columns.map((c) => (
                <TableHead
                  key={c.id}
                  className="text-secondary text-[13px] pl-[20px] pr-[48px]"
                >
                  {t?.(`table.${c.id}` as any) ?? c.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow
                  key={`skel-${i}`}
                  className="border-[#afafaf1a] h-[54px]"
                >
                  {columns.map((c) => (
                    <TableCell key={`${c.id}-${i}`} className="pl-[20px] pr-18">
                      <div className="h-4 w-32 rounded animate-pulse bg-white/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : errorText ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-4 text-muted"
                >
                  {errorText}
                </TableCell>
              </TableRow>
            ) : !hasAnyRows ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-4 text-muted"
                >
                  {t?.("common.noEarnPosition") ?? "No holdings found"}
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* ITPs SECTION */}
                {itpRows.length > 0 && sectionHeader("ITP Indexes")}
                {itpRows.map((itp, i) => (
                  <HoldingsRow
                    key={`itp-${itp.address}-${i}`}
                    type="itp"
                    symbol={itp.symbol}
                    name={itp.name}
                    logoUrl={itp.logoUrl}
                    amount={itp.amount}
                    value={itp.value}
                    contractAddress={itp.address}
                    explorerBaseUrl={explorerBaseUrl}
                    extra={
                      itp.sharePct != null
                        ? `${formatNumber(itp.sharePct, {
                            maximumFractionDigits: 2,
                          })}% ${t?.("table.share") ?? "Share"}`
                        : undefined
                    }
                  />
                ))}

                {/* TOKENS SECTION */}
                {tokenRows.length > 0 && sectionHeader("Assets")}
                {tokenRows.map((tkn, i) => (
                  <HoldingsRow
                    key={`tok-${tkn.address}-${i}`}
                    type="token"
                    symbol={tkn.symbol}
                    name={tkn.name}
                    logoUrl={tkn.logoUrl}
                    amount={tkn.amount}
                    value={tkn.value}
                    contractAddress={tkn.address}
                    explorerBaseUrl={explorerBaseUrl}
                  />
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function HoldingsRow({
  type, // "token" | "itp"
  symbol,
  name,
  logoUrl,
  amount,
  value,
  contractAddress,
  explorerBaseUrl,
  extra,
}: {
  type: "token" | "itp";
  symbol: string;
  name?: string;
  logoUrl?: string;
  amount: number;
  value?: number;
  contractAddress: string; // "native" ok for tokens; ITPs are ERC-20
  explorerBaseUrl: string;
  extra?: string;
}) {
  const isNative = contractAddress.toLowerCase() === "native";
  const contractUrl = isNative
    ? `${explorerBaseUrl}`
    : `${explorerBaseUrl}/address/${contractAddress}`;

  return (
    <TableRow className="border-[#afafaf1a] hover:bg-foreground/50 h-[54px] text-[13px]">
      {/* Asset */}
      <TableCell className="pl-[20px] text-card pr-18">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${symbol} logo`}
              width={18}
              height={18}
              className="rounded-full"
            />
          ) : type === "itp" ? (
            <IndexMaker className="w-4 h-4 text-muted" />
          ) : (
            <div className="w-[18px] h-[18px] rounded-full bg-white/15" />
          )}
          <div className="flex items-center gap-2">
            <span className="font-medium">{symbol}</span>
            {name ? <span className="text-secondary">{name}</span> : null}
          </div>
        </div>
      </TableCell>

      {/* Balance */}
      <TableCell className="pl-[20px] text-card pr-18">
        {formatNumber(amount, {
          maximumFractionDigits: type === "itp" ? 30 : 6,
        })}{" "}
        {symbol}
      </TableCell>

      {/* Value */}
      <TableCell className="pl-[20px] text-card pr-18">
        <div className="px-[2px] pt-1 rounded-[4px] bg-accent text-secondary text-[11px] inline-flex items-center">
          {value == null
            ? "—"
            : type === "itp"
            ? `${formatNumber(value, { maximumFractionDigits: 6 })} USDC`
            : `$${formatNumber(value, { maximumFractionDigits: 6 })}`}
        </div>
      </TableCell>

      {/* Contract */}
      <TableCell className="pl-[20px] text-card pr-18">
        <div className="flex items-center gap-2">
          <span>{isNative ? "Native" : shortenAddress(contractAddress)}</span>
          <Link href={contractUrl} target="_blank">
            <RightArrow
              className="rotate-135 text-secondary"
              width="11px"
              height="11px"
            />
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}
