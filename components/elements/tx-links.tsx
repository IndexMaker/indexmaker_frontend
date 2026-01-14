"use client";

/**
 * TxLinks Component
 *
 * Displays transaction hashes with links to respective block explorers.
 * Supports both Arbitrum and Orbit chains with copy-to-clipboard functionality.
 *
 * @see Story 3-3 Task 2
 */

import { useState, useCallback } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ARBITRUM_CHAIN_ID, ORBIT_CHAIN_ID, ORBIT_EXPLORER_URL } from "@/lib/contracts/addresses";
import { useLanguageSafe } from "@/contexts/language-context";

/**
 * Normalize explorer URL to ensure no double slashes
 */
function normalizeExplorerUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  return `${base}${pathPart}`;
}

/**
 * Block explorer configuration
 */
export const BLOCK_EXPLORERS = {
  arbitrum: {
    name: "Arbiscan",
    txUrl: "https://arbiscan.io/tx/",
    chainId: ARBITRUM_CHAIN_ID,
  },
  orbit: {
    name: "Orbit Explorer",
    txUrl: normalizeExplorerUrl(ORBIT_EXPLORER_URL, "/tx/"),
    chainId: ORBIT_CHAIN_ID,
  },
} as const;

/**
 * Shortens a transaction hash for display
 * @param hash - Full transaction hash (0x...)
 * @param chars - Number of characters to show on each side (default: 6)
 * @returns Shortened hash like "0xabc123...def456"
 */
export function shortenTxHash(hash: string, chars = 6): string {
  if (!hash || hash.length < chars * 2 + 2) return hash || "";
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

/**
 * Props for a single transaction link
 */
export interface TxLinkProps {
  /** Transaction hash */
  hash: string;
  /** Chain identifier */
  chain: "arbitrum" | "orbit";
  /** Optional label (e.g., "Arbitrum Tx") */
  label?: string;
  /** Show copy button (default: true) */
  showCopy?: boolean;
  /** Optional CSS class */
  className?: string;
}

/**
 * Single transaction link with explorer link and copy functionality
 */
export function TxLink({
  hash,
  chain,
  label,
  showCopy = true,
  className,
}: TxLinkProps) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguageSafe();

  const explorer = BLOCK_EXPLORERS[chain];
  const explorerUrl = `${explorer.txUrl}${hash}`;
  const displayHash = shortenTxHash(hash);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      toast.success(t("bridge.txHashCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("bridge.copyFailed"));
    }
  }, [hash, t]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="text-xs text-secondary">{label}</span>}

      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400 transition-colors"
      >
        <span className="font-mono">{displayHash}</span>
        <ExternalLink className="w-3 h-3" />
      </a>

      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="Copy transaction hash"
          type="button"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-secondary hover:text-primary" />
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Props for the dual transaction links component
 */
export interface DualTxLinksProps {
  /** Arbitrum transaction hash (required) */
  arbitrumTxHash: string;
  /** Orbit transaction hash (optional - may not be available yet) */
  orbitTxHash?: string | null;
  /** Optional CSS class */
  className?: string;
  /** Layout direction */
  direction?: "row" | "column";
}

/**
 * Displays both Arbitrum and Orbit transaction hashes.
 * Orbit hash may not be available until the bridge operation completes.
 *
 * Usage:
 * ```tsx
 * <DualTxLinks
 *   arbitrumTxHash="0x123..."
 *   orbitTxHash="0x456..." // or null if not yet available
 * />
 * ```
 */
export function DualTxLinks({
  arbitrumTxHash,
  orbitTxHash,
  className,
  direction = "column",
}: DualTxLinksProps) {
  return (
    <div
      className={cn(
        "space-y-2",
        direction === "row" && "flex flex-wrap items-center gap-4 space-y-0",
        className
      )}
    >
      {/* Arbitrum Transaction */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500" title="Arbitrum" />
        <TxLink hash={arbitrumTxHash} chain="arbitrum" label="Arbitrum" />
      </div>

      {/* Orbit Transaction - only show if available */}
      {orbitTxHash && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" title="Orbit" />
          <TxLink hash={orbitTxHash} chain="orbit" label="Orbit" />
        </div>
      )}

      {/* Pending indicator when Orbit tx not yet available */}
      {!orbitTxHash && (
        <div className="flex items-center gap-2 text-xs text-secondary">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span>Orbit transaction pending...</span>
        </div>
      )}
    </div>
  );
}

export default DualTxLinks;
