"use client";

import Image from "next/image";
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
  // Chain indicator: which chain this balance is on
  chain?: 'arbitrum' | 'orbit';
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

  return (
    <div className={cn("rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-primary">Assets</h2>
          {hasAnyRows && (
            <span className="px-2 py-0.5 text-xs bg-accent text-secondary rounded-full">
              {tokenRows.length + itpRows.length} held
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      ) : errorText ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-2 mb-2">
          <p className="text-xs text-red-500 text-center">{errorText}</p>
        </div>
      ) : !hasAnyRows ? (
        <p className="text-xs text-muted text-center py-4">
          {t?.("common.noEarnPosition") ?? "No holdings found"}
        </p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground text-left border-b border-border">
              <th className="py-1.5 font-medium">Asset</th>
              <th className="py-1.5 font-medium">Balance</th>
              <th className="py-1.5 font-medium">Value</th>
              <th className="py-1.5 font-medium text-right">Contract</th>
            </tr>
          </thead>
          <tbody>
            {itpRows.map((itp, i) => (
              <CompactHoldingsRow
                key={`itp-${itp.address}-${itp.chain ?? 'default'}-${i}`}
                type="itp"
                symbol={itp.symbol}
                name={itp.name}
                logoUrl={itp.logoUrl}
                amount={itp.amount}
                value={itp.value}
                contractAddress={itp.address}
                explorerBaseUrl={explorerBaseUrl}
                chain={itp.chain}
              />
            ))}
            {tokenRows.map((tkn, i) => (
              <CompactHoldingsRow
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
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * Chain badge component for displaying which chain a balance is on
 */
function ChainBadge({ chain }: { chain?: 'arbitrum' | 'orbit' }) {
  if (!chain) return null;

  const isArbitrum = chain === 'arbitrum';

  return (
    <span
      className={cn(
        "px-1.5 py-0.5 rounded text-[10px] font-medium",
        isArbitrum
          ? "bg-blue-500/20 text-blue-400"
          : "bg-purple-500/20 text-purple-400"
      )}
    >
      {isArbitrum ? "Arb" : "Orbit"}
    </span>
  );
}

function CompactHoldingsRow({
  type,
  symbol,
  name,
  logoUrl,
  amount,
  value,
  contractAddress,
  explorerBaseUrl,
  chain,
}: {
  type: "token" | "itp";
  symbol: string;
  name?: string;
  logoUrl?: string;
  amount: number;
  value?: number;
  contractAddress: string;
  explorerBaseUrl: string;
  chain?: 'arbitrum' | 'orbit';
}) {
  const isNative = contractAddress.toLowerCase() === "native";
  const contractUrl = isNative
    ? `${explorerBaseUrl}`
    : `${explorerBaseUrl}/address/${contractAddress}`;

  return (
    <tr className="border-b border-border/50">
      <td className="py-2">
        <div className="flex items-center gap-1.5">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={`${symbol} logo`}
              width={14}
              height={14}
              className="rounded-full"
            />
          ) : type === "itp" ? (
            <IndexMaker className="w-3.5 h-3.5 text-muted" />
          ) : (
            <div className="w-[14px] h-[14px] rounded-full bg-white/15" />
          )}
          <span className="font-medium text-primary">{symbol}</span>
          <ChainBadge chain={chain} />
        </div>
      </td>
      <td className="py-2 text-primary font-mono">
        {formatNumber(amount, { maximumFractionDigits: type === "itp" ? 6 : 6 })}
      </td>
      <td className="py-2 text-secondary">
        {value == null
          ? "—"
          : type === "itp"
          ? `${formatNumber(value, { maximumFractionDigits: 2 })} USDC`
          : `$${formatNumber(value, { maximumFractionDigits: 2 })}`}
      </td>
      <td className="py-2 text-right">
        <a
          href={contractUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#2470ff] hover:underline flex items-center gap-1 font-mono justify-end"
        >
          {isNative ? "Native" : shortenAddress(contractAddress)}
          <RightArrow
            className="rotate-135 text-[#2470ff]"
            width="10px"
            height="10px"
          />
        </a>
      </td>
    </tr>
  );
}

