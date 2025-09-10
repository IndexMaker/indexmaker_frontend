"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  TrendingUp,
  BarChart3,
  Grid3X3,
  List,
} from "lucide-react";
import Link from "next/link";
import { AssetCard } from "./asset-card";
import { AssetTable } from "./asset-table";
import { AssetChart } from "./asset-chart";
import { Asset } from "@/types";
import { fetchAssets, fetchInventory } from "@/server/invoice";

type SortOption = "market_cap" | "price" | "volume" | "name";
type ViewMode = "grid" | "table" | "chart";

export function AssetInventoryBrowser() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("market_cap");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [priceFilter, setPriceFilter] = useState<string>("all");

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const [assets, inventory] = await Promise.all([
          fetchAssets(),
          fetchInventory(),
        ]);

        const invMap: Record<string, number> = Object.fromEntries(
          Object.entries(inventory?.positions ?? {}).map(([key, val]) => {
            const sym = val?.inventory_position?.symbol ?? key;
            const raw = val?.actual_balance ?? 0;
            const num = typeof raw === "string" ? parseFloat(raw) : raw;
            return [sym, Number.isFinite(num) ? num : 0];
          })
        );

        const filtered = assets
          .filter((a) => invMap[a.symbol] != null)
          .map((a) => ({
            ...a,
            expected_inventory: invMap[a.symbol],
          }));

        setAssets(filtered);
      } catch (error) {
        console.error("Failed to load assets:", error);
      } finally {
        setLoading(false);
      }
    };

    // loadAssets();
  }, []);

  // Filter and sort assets
  const filteredAndSortedAssets = assets
    .filter((asset) => {
      const matchesSearch =
        asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPrice = (() => {
        switch (priceFilter) {
          case "under_100":
            return asset.price_usd < 100;
          case "100_1000":
            return asset.price_usd >= 100 && asset.price_usd < 1000;
          case "1000_10000":
            return asset.price_usd >= 1000 && asset.price_usd < 10000;
          case "over_10000":
            return asset.price_usd >= 10000;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "market_cap":
          return b.market_cap - a.market_cap;
        case "price":
          return b.price_usd - a.price_usd;
        case "volume":
          return b.expected_inventory - a.expected_inventory;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const totalMarketCap = assets.reduce(
    (sum, asset) => sum + asset.market_cap,
    0
  );
  const totalVolume = assets.reduce(
    (sum, asset) => sum + asset.expected_inventory,
    0
  );
  const averagePrice =
    assets.reduce((sum, asset) => sum + asset.price_usd, 0) / assets.length ||
    0;

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) {
      return `${(num / 1e12).toFixed(1)}T`;
    }
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`;
    }
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    }
    return num.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[38px] font-bold text-primary">
              Inventory Audit
            </h1>
            <p className="text-muted-foreground">
              Browse and analyze blockchain assets in the network
            </p>
          </div>
          {/* <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link> */}
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Market Cap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {formatLargeNumber(totalMarketCap)}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-chart-1/10 text-chart-1"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                24h Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  {formatLargeNumber(totalVolume)}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-chart-2/10 text-chart-2"
                >
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assets Tracked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{assets.length}</div>
                <Badge variant="outline">
                  {filteredAndSortedAssets.length} filtered
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters and Controls */}
      <Card className="bg-foreground">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search assets by name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Price Filter */}
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under_100">Under $100</SelectItem>
                  <SelectItem value="100_1000">$100 - $1,000</SelectItem>
                  <SelectItem value="1000_10000">$1,000 - $10,000</SelectItem>
                  <SelectItem value="over_10000">Over $10,000</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={sortBy}
                onValueChange={(value: SortOption) => setSortBy(value)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market_cap">Market Cap</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="volume">24h Volume</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "chart" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("chart")}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-secondary">
            {viewMode === "grid" && "Asset Grid"}
            {viewMode === "table" && "Asset Table"}
            {viewMode === "chart" && "Market Overview"}
          </h2>
          <Badge variant="outline" className="text-secondary">
            {filteredAndSortedAssets.length} assets
          </Badge>
        </div>

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && (
          <AssetTable assets={filteredAndSortedAssets} />
        )}

        {/* Chart View */}
        {viewMode === "chart" && (
          <AssetChart assets={filteredAndSortedAssets} />
        )}

        {filteredAndSortedAssets.length === 0 && (
          <Card className="p-8 text-center bg-foreground">
            <p className="text-muted-foreground">
              No assets found matching your criteria.
            </p>
            <Button
              variant="outline"
              className="mt-4 bg-transparent"
              onClick={() => {
                setSearchQuery("");
                setPriceFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
