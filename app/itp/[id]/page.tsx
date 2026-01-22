"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, notFound } from "next/navigation";
import { TrendingUp, TrendingDown, ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn, shortenAddress } from "@/lib/utils";
import Dashboard from "@/components/views/Dashboard/dashboard";
import { TradingCard } from "@/components/elements/TradingCard";
import { PendingOrders } from "@/components/elements/PendingOrders";
import { ItpPriceChart } from "@/components/elements/ItpPriceChart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet } from "@/contexts/wallet-context";
import { useBridgeWallet } from "@/hooks/useBridgeWallet";
import {
  checkUsdcBalance,
  checkItpBalance,
  type BalanceResult,
} from "@/lib/contracts/balance-utils";
import type { ItpListEntry } from "@/types/itp";

function ItpDetailClient() {
  const params = useParams();
  const itpId = params.id?.toString();
  const { isConnected, address: walletAddress } = useWallet();
  const { publicClient, address: bridgeAddress, isCorrectChain } = useBridgeWallet();

  const [itp, setItp] = useState<ItpListEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Balance state
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [itpBalance, setItpBalance] = useState<string>("0");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Fetch ITP details
  useEffect(() => {
    if (!itpId) {
      notFound();
      return;
    }

    const fetchItp = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/itp/list?search=${itpId}`);
        if (!response.ok) throw new Error("Failed to fetch ITP");

        const data = await response.json();
        const foundItp = data.itps.find(
          (i: ItpListEntry) => i.id.toString() === itpId || i.symbol.toLowerCase() === itpId.toLowerCase()
        );

        if (!foundItp) {
          setError("ITP not found");
          return;
        }

        setItp(foundItp);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load ITP");
      } finally {
        setLoading(false);
      }
    };

    fetchItp();
  }, [itpId]);

  // Fetch balances when wallet is connected
  const fetchBalances = useCallback(async () => {
    if (!isConnected || !bridgeAddress || !publicClient || !itp?.arbitrum_address) {
      return;
    }

    try {
      setBalanceLoading(true);
      const [usdcResult, itpResult] = await Promise.all([
        checkUsdcBalance(publicClient, bridgeAddress).catch((): BalanceResult => ({
          raw: 0n,
          formatted: "0",
          decimals: 6,
        })),
        checkItpBalance(publicClient, bridgeAddress, itp.arbitrum_address as `0x${string}`).catch(
          (): BalanceResult => ({
            raw: 0n,
            formatted: "0",
            decimals: 18,
          })
        ),
      ]);

      setUsdcBalance(usdcResult.formatted);
      setItpBalance(itpResult.formatted);
    } catch (err) {
      console.error("Failed to fetch balances:", err);
    } finally {
      setBalanceLoading(false);
    }
  }, [isConnected, bridgeAddress, publicClient, itp?.arbitrum_address]);

  // Fetch balances on mount and when dependencies change
  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Auto-refresh balances every 30 seconds
  useEffect(() => {
    if (!isConnected || !bridgeAddress || !itp?.arbitrum_address) {
      return;
    }

    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [isConnected, bridgeAddress, itp?.arbitrum_address, fetchBalances]);

  // Handle successful transaction - refresh balances
  const handleTransactionSuccess = useCallback(() => {
    fetchBalances();
  }, [fetchBalances]);

  if (loading) {
    return (
      <Dashboard>
        <div className="flex flex-col gap-4 pt-6 max-w-7xl mx-auto">
          <Skeleton className="h-8 w-32" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[200px] rounded-lg" />
              <Skeleton className="h-[300px] rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-[400px] rounded-lg" />
            </div>
          </div>
        </div>
      </Dashboard>
    );
  }

  if (error || !itp) {
    return (
      <Dashboard>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p className="text-muted-foreground">{error || "ITP not found"}</p>
          <Link href="/discover">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discover
            </Button>
          </Link>
        </div>
      </Dashboard>
    );
  }

  const isPositive = (itp.price_24h_change ?? 0) >= 0;

  return (
    <Dashboard>
      <div className="flex flex-col gap-6 pt-6 max-w-7xl mx-auto">
        {/* Back link */}
        <Link
          href="/discover"
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Discover
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-[38px] font-normal text-primary">{itp.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-lg text-muted-foreground">{itp.symbol}</span>
              {itp.arbitrum_address && (
                <a
                  href={`https://arbiscan.io/token/${itp.arbitrum_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-[#2470ff] hover:underline"
                >
                  {shortenAddress(itp.arbitrum_address)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold text-primary">
              ${itp.current_price?.toFixed(2) ?? "N/A"}
            </div>
            {itp.price_24h_change !== null && (
              <div
                className={cn(
                  "flex items-center justify-end gap-1 text-lg",
                  isPositive ? "text-green-500" : "text-red-500"
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {isPositive ? "+" : ""}
                {itp.price_24h_change?.toFixed(2) ?? "0.00"}% (24h)
              </div>
            )}
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Card */}
            <div className="bg-foreground border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Token Info</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Price</div>
                  <div className="text-lg font-medium text-primary">
                    ${itp.current_price?.toFixed(4) ?? "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">24h Change</div>
                  <div
                    className={cn(
                      "text-lg font-medium",
                      isPositive ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {itp.price_24h_change?.toFixed(2) ?? "0"}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Supply</div>
                  <div className="text-lg font-medium text-primary">
                    {formatSupply(itp.total_supply)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="text-lg font-medium text-primary">
                    {new Date(itp.created_at * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses Card */}
            <div className="bg-foreground border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Contract Addresses</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Arbitrum</span>
                  {itp.arbitrum_address ? (
                    <a
                      href={`https://arbiscan.io/token/${itp.arbitrum_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[#2470ff] hover:underline font-mono text-sm"
                    >
                      {itp.arbitrum_address}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not available</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Orbit</span>
                  {itp.orbit_address ? (
                    <span className="font-mono text-sm text-primary">
                      {shortenAddress(itp.orbit_address)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not available</span>
                  )}
                </div>
              </div>
            </div>

            {/* Price Chart */}
            <div className="bg-foreground border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-primary mb-4">Price Chart</h2>
              <ItpPriceChart itpId={itp.orbit_address || itp.id.toString()} />
            </div>
          </div>

          {/* Right column - Trading Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              {itp.arbitrum_address ? (
                <>
                  {/* Balance refresh button */}
                  {isConnected && isCorrectChain && (
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={fetchBalances}
                        disabled={balanceLoading}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <RefreshCw
                          className={cn("w-3 h-3", balanceLoading && "animate-spin")}
                        />
                        Refresh balances
                      </button>
                    </div>
                  )}
                  <TradingCard
                    itpAddress={itp.arbitrum_address as `0x${string}`}
                    itpSymbol={itp.symbol}
                    itpName={itp.name}
                    currentPrice={itp.current_price ?? 0}
                    usdcBalance={usdcBalance}
                    itpBalance={itpBalance}
                    onSuccess={handleTransactionSuccess}
                    assets={itp.assets}
                    weights={itp.weights}
                  />

                  {/* Pending Orders */}
                  <div className="mt-6">
                    <PendingOrders compact={true} maxOrders={5} />
                  </div>
                </>
              ) : (
                <div className="bg-foreground border border-border rounded-lg p-6 text-center">
                  <p className="text-muted-foreground">
                    Trading not available - Arbitrum address not configured
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dashboard>
  );
}

function formatSupply(supply: string): string {
  const num = parseFloat(supply) / 1e18;
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

export default dynamic(() => Promise.resolve(ItpDetailClient), {
  ssr: false,
});
