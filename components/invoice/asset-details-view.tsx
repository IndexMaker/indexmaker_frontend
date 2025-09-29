"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { redirect, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { ArrowLeft, Activity, DollarSign, TrendingUp } from "lucide-react";
import { Asset } from "@/types";
import { fetchAssets } from "@/server/invoice";
import { RootState } from "@/redux/store";
import { useSelector } from "react-redux";
import { format } from "date-fns";

interface AssetDetailsViewProps {
  assetId: string;
}

export function AssetDetailsView({ assetId }: AssetDetailsViewProps) {
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);
  const { assets } = useSelector((state: RootState) => state.assets);

  // --- helpers
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  // --- initial asset load
  useEffect(() => {
    let mounted = true;

    const loadAsset = async () => {
      try {
        if (assets.length === 0) {
          const _assets = await fetchAssets();
          if (!mounted) return;
          const foundAsset = _assets.find((a) => a.id === assetId);
          setAsset(foundAsset || null);
        } else {
          const foundAsset = assets.find((a) => a.id === assetId);
          setAsset(foundAsset || null);
        }
      } catch (error) {
        console.error("Failed to load asset:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAsset();
    return () => {
      mounted = false;
    };
  }, [assetId, assets]);

  // --- figure out which CoinGecko id to use
  const coingeckoId = useMemo(() => {
    if (!asset) return null;
    // Prefer an explicit mapping on your asset
    // (e.g., add `coingecko_id` to your Asset type)
    // Fallbacks are best-effort; CoinGecko expects ID, not symbol.
    return (asset as any).coingecko_id || asset.id || null;
  }, [asset]);

  // --- polling every 10s for live market data
  useEffect(() => {
    if (!coingeckoId) return;

    let abort = new AbortController();
    let timer: NodeJS.Timeout | null = null;
    let disposed = false;
    let inFlight = false;

    const fetchLive = async () => {
      if (inFlight) return; // prevent overlapping calls
      inFlight = true;
      setLiveError(null);

      try {
        const res = await fetch(
          `/api/market?id=${encodeURIComponent(coingeckoId)}&vs=usd`,
          {
            cache: "no-store",
            signal: abort.signal,
          }
        );
        if (!res.ok) {
          throw new Error(`Live fetch failed: ${res.status}`);
        }
        const m = await res.json();

        // Merge the market fields into existing asset
        setAsset((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            // Prefer live values from CoinGecko:
            price_usd: m.price_usd ?? prev.price_usd,
            market_cap: m.market_cap ?? prev.market_cap,
            total_supply: m.total_supply ?? prev.total_supply,
            circulating_supply: m.circulating_supply ?? prev.circulating_supply,
            thumb: m.thumb ?? prev.thumb,
            last_updated: m.last_updated ?? (prev as any).last_updated,
          } as Asset;
        });
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error(e);
          setLiveError(e?.message || "Failed to refresh market data");
        }
      } finally {
        inFlight = false;
      }
    };

    // initial fetch immediately, then every 10s
    fetchLive();
    timer = setInterval(fetchLive, 15_000);

    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      abort.abort();
    };
  }, [coingeckoId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-muted rounded"></div>
            <div className="space-y-4">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Asset Not Found</h1>
          <p className="text-muted-foreground">
            The requested asset could not be found.
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const supplyPercentage =
    asset.total_supply && asset.circulating_supply
      ? (asset.circulating_supply / asset.total_supply) * 100
      : 0;

  return (
    <div className="container mx-auto pt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {asset.thumb ? (
                <Image
                  width={48}
                  height={48}
                  src={asset.thumb}
                  alt={asset.symbol}
                />
              ) : (
                <span className="text-lg font-bold text-primary">
                  {asset.symbol?.slice(0, 3)?.toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-primary">
                {asset.name}
              </h1>
              <p className="text-muted-foreground">{asset.symbol}</p>
            </div>
          </div>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price and Market Data */}
          <Card className="bg-foreground">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Market Data</CardTitle>
              {liveError ? (
                <span className="text-xs text-red-500">Live update error</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {asset.last_updated
                    ? `Updated: ${new Date(
                        asset.last_updated
                      ).toLocaleTimeString()}`
                    : "Live (10s)"}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Current Price
                    </label>
                    <div className="text-3xl font-bold">
                      {formatCurrency(Number(asset.price_usd || 0))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Market Cap
                    </label>
                    <div className="text-xl font-semibold">
                      {asset.market_cap != null
                        ? formatLargeNumber(Number(asset.market_cap))
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </label>
                    <div className="text-sm">
                      {asset.last_updated
                        ? format(
                            new Date(asset.last_updated),
                            "MMM d, HH:mm:ss"
                          )
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Inventory in Custody
                    </label>
                    <div className="text-xl font-semibold">
                      {asset.expected_inventory ?? "—"}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Created
                    </label>
                    <div className="text-sm">
                      {asset.created_at
                        ? format(new Date(asset.created_at), "MMM d, HH:mm:ss")
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supply Information */}
          <Card className="bg-foreground">
            <CardHeader>
              <CardTitle>Supply Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Total Supply
                  </label>
                  <div className="text-lg font-semibold">
                    {asset.total_supply != null
                      ? formatLargeNumber(Number(asset.total_supply))
                      : "—"}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Circulating Supply
                  </label>
                  <div className="text-lg font-semibold">
                    {asset.circulating_supply != null
                      ? formatLargeNumber(Number(asset.circulating_supply))
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Circulation Progress
                  </span>
                  <span className="text-sm font-medium">
                    {supplyPercentage ? supplyPercentage.toFixed(2) + "%" : "—"}
                  </span>
                </div>
                <Progress
                  value={isFinite(supplyPercentage) ? supplyPercentage : 0}
                  className="h-3"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="bg-foreground">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Price</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(Number(asset.price_usd || 0))}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-chart-1" />
                  <span className="text-sm text-muted-foreground">
                    Market Cap
                  </span>
                </div>
                <span className="font-semibold">
                  {asset.market_cap != null
                    ? formatLargeNumber(Number(asset.market_cap))
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-chart-2" />
                  <span className="text-sm text-muted-foreground">
                    Inventory in Custody
                  </span>
                </div>
                <span className="font-semibold">
                  {asset.expected_inventory ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="bg-foreground">
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Trading Status
                </span>
                <Badge
                  variant="secondary"
                  className="bg-chart-1/10 text-chart-1"
                >
                  <Activity className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Network</span>
                <Badge variant="outline" className="bg-green-600">
                  Live
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Last Updated
                </span>
                <span className="text-sm">
                  {asset.last_updated
                    ? new Date(asset.last_updated).toLocaleTimeString()
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
