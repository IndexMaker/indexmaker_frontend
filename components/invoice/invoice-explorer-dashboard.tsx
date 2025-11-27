"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Activity } from "lucide-react";
import { InvoiceTable } from "./invoice-table";
import { AssetTable } from "./asset-table";
import { StatsOverview } from "./stats-overview";
import { AdvancedSearch, type SearchFilters } from "./advanced-search";
import { Asset, MintInvoice } from "@/types";
import {
  fetchAssets,
  fetchInventory,
  // fetchMintInvoices, // Import is already present below, removed duplicate
} from "@/server/invoice";
import { fetchMintInvoices } from "@/server/invoice"; // Explicitly imported for clarity
import { useDispatch, useSelector } from "react-redux";
import { setAssets } from "@/redux/assetSlice";
import { RootState } from "@/redux/store";
import {
  selectMintInvoices,
  selectMintInvoicesLoading,
  setError,
  setInvoices,
  setLoading,
} from "@/redux/mintInvoicesSlice";
import { useWallet } from "@/contexts/wallet-context";

const now = new Date();

// Default “from”: Jan 1, 2025 @ 00:00:00 UTC
const DEFAULT_FROM = new Date(Date.UTC(2025, 0, 1, 0, 0, 0, 0));

// Default “to”: today @ 00:00:00 UTC
const DEFAULT_TO = new Date(
  Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0
  )
);

export function InvoiceExplorerDashboard() {
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");
  const dispatch = useDispatch();
  const { assets } = useSelector((state: RootState) => state.assets);
  const { wallet } = useWallet();
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    status: "all",
    symbol: "all",
    minAmount: "",
    maxAmount: "",
    dateFrom: undefined,
    dateTo: undefined,
    fillRateMin: "",
    fillRateMax: "",
  });

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const inventory = await fetchInventory();

        if (!inventory?.positions) {
          dispatch(setAssets([]));
          return;
        }

        // 1) Fetch Binance USDC pair prices
        const priceRes = await fetch(
          "https://api.binance.com/api/v3/ticker/price"
        );
        const priceData: { symbol: string; price: string }[] =
          await priceRes.json();

        // Build a lookup map, e.g. { BTC: 62345.12, ETH: 2950.55 }
        const priceMap: Record<string, number> = {};
        priceData.forEach((p) => {
          if (p.symbol.endsWith("USDC")) {
            const sym = p.symbol.replace("USDC", "");
            priceMap[sym] = parseFloat(p.price);
          }
        });

        // 2) Map inventory → Asset[]
        const mapped: Asset[] = Object.entries(inventory.positions)
          .flatMap(([key, val]: [string, any]) => {
            const inv = val?.inventory_position;
            if (!inv) return [];

            const balanceRaw = val.actual_balance ?? 0;
            const expected_inventory = parseFloat(
              typeof balanceRaw === "string" ? balanceRaw : String(balanceRaw)
            );

            return [
              {
                id: key,
                symbol: inv.symbol,
                name: inv.symbol,
                price_usd: priceMap[inv.symbol] ?? 0, // from Binance price
                expected_inventory: Number.isFinite(expected_inventory)
                  ? expected_inventory
                  : 0,
                created_at: inv.created_timestamp,
                last_updated:
                  inv.last_update_timestamp || inv.created_timestamp,
              } as Asset,
            ];
          })
          .sort((a, b) => a.symbol.localeCompare(b.symbol));
        dispatch(setAssets(mapped));
      } catch (e) {
        console.error("Failed to load inventory:", e);
      } finally {
        setLoadingAssets(false);
      }
    };

    loadInventory();
  }, [dispatch]);

  const invoices = useSelector(selectMintInvoices);
  const loading = useSelector(selectMintInvoicesLoading);
  // 2) Load invoices ONLY when dateFrom/dateTo change
  useEffect(() => {
    let cancelled = false;
    const from = filters.dateFrom ?? DEFAULT_FROM;
    const to = filters.dateTo ?? DEFAULT_TO;

    dispatch(setLoading(true));

    const t = setTimeout(async () => {
      try {
        const invoicesData = await fetchMintInvoices(from, to);

        // 1) optional filter by address
        let filtered = invoicesData;

        // 2) augment with status
        const augmented = filtered.map((inv) => ({
          ...inv,
          status: "completed" as const,
        }));

        // 3) sort descending
        const sorted = augmented.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        if (!cancelled) {
          dispatch(setInvoices(sorted as MintInvoice[]));
        }
      } catch (err: any) {
        if (!cancelled)
          dispatch(setError(err.message ?? "Failed to load invoices"));
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    filters.dateFrom?.getTime(),
    filters.dateTo?.getTime(),
    wallet,
    dispatch,
  ]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesQuery = !filters.query;

      const matchesStatus = !filters.status || filters.status === "all";

      const matchesSymbol = filters.symbol === "all";

      // Handle missing/undefined values
      const matchesAmount = (() => {
        if (invoice.assets_value == null) return false;
        const minAmount = filters.minAmount
          ? Number.parseFloat(filters.minAmount)
          : 0;
        const maxAmount = filters.maxAmount
          ? Number.parseFloat(filters.maxAmount)
          : Number.POSITIVE_INFINITY;
        return (
          invoice.assets_value >= minAmount && invoice.assets_value <= maxAmount
        );
      })();

      const matchesFillRate = (() => {
        if (invoice.fill_rate == null) return false;
        const minRate = filters.fillRateMin
          ? Number.parseFloat(filters.fillRateMin) / 100
          : 0;
        const maxRate = filters.fillRateMax
          ? Number.parseFloat(filters.fillRateMax) / 100
          : 100;
        return invoice.fill_rate >= minRate && invoice.fill_rate <= maxRate;
      })();

      const matchesDate = (() => {
        if (!invoice.timestamp) return false;
        const invoiceDate = new Date(invoice.timestamp);
        if (isNaN(invoiceDate.getTime())) return false;

        const fromDate = filters.dateFrom;
        const toDate = filters.dateTo;
        if (fromDate && invoiceDate < fromDate) return false;
        if (toDate && invoiceDate > toDate) return false;
        return true;
      })();

      const result =
        matchesQuery &&
        matchesStatus &&
        matchesSymbol &&
        matchesAmount &&
        matchesFillRate &&
        matchesDate;

      return result;
    });
  }, [invoices, filters]);

  const filteredAssets = assets.filter(
    (asset) =>
      !filters.query ||
      asset.symbol.toLowerCase().includes(filters.query.toLowerCase()) ||
      asset.name.toLowerCase().includes(filters.query.toLowerCase())
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.status !== "all") count++;
    if (filters.symbol !== "all") count++;
    if (filters.minAmount || filters.maxAmount) count++;
    if (filters.fillRateMin || filters.fillRateMax) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  };

  const resetFilters = () => {
    setFilters({
      query: "",
      status: "all",
      symbol: "all",
      minAmount: "",
      maxAmount: "",
      dateFrom: undefined,
      dateTo: undefined,
      fillRateMin: "",
      fillRateMax: "",
    });
  };

  if (loadingAssets && loadingInvoices) {
    return (
      <div className="container mx-auto pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse bg-foreground">
              <CardContent className="p-6">
                <div className="h-4 bg-background rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-background rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto pt-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[38px] text-primary">
              Index Mint Invoices & Inventory Audit
            </h1>
            <p className="text-secondary text-[18px]">
              Track and analyze Index Mint Invoices and Inventory Audit
            </p>
          </div>
        </div>

        <AdvancedSearch
          filters={filters}
          onFiltersChange={setFilters}
          onReset={resetFilters}
          activeFilterCount={getActiveFilterCount()}
        />
      </div>

      {/* Stats Overview */}
      <StatsOverview invoices={filteredInvoices} assets={filteredAssets} />

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6 w-full"
      >
        {/* CHANGED: grid-cols-2 to grid-cols-1 to accommodate the single remaining tab */}
        <TabsList className="grid grid-cols-1 w-full bg-foreground">
          <TabsTrigger
            value="invoices"
            className="flex items-center gap-2 bg-foreground text-secondary"
          >
            <FileText className="h-4 w-4" />
            Mint Invoices
          </TabsTrigger>
          
          {/* TEMPORARILY COMMENTED OUT: Supply to Expected Inventory Trigger */}
          {/* <TabsTrigger
            value="assets"
            className="flex items-center gap-2 bg-foreground text-secondary"
          >
            <Activity className="h-4 w-4" />
            Supply to Expected Inventory
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between text-primary">
            <h2 className="text-[20px] text-primary">Mint Invoices</h2>
            <Badge variant="outline" className="text-secondary">
              {filteredInvoices.length} invoices
            </Badge>
          </div>

          {/* Note: The USDC Amount 2 precision max must be implemented 
              inside the InvoiceTable component, as it handles the rendering. 
              The raw data is passed here to preserve sorting accuracy. 
          */}
          <InvoiceTable invoices={filteredInvoices} />

          {filteredInvoices.length === 0 && (
            <Card className="p-8 text-center bg-foreground">
              <p className="text-secondary">
                No invoices found matching your search criteria.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* TEMPORARILY COMMENTED OUT: Supply to Expected Inventory Content */}
        {/* <TabsContent value="assets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] text-primary">
              Supply to Expected Inventory
            </h2>
            <Badge variant="outline" className="text-secondary">
              {filteredAssets.length} assets
            </Badge>
          </div>

          <AssetTable assets={filteredAssets} />

          {filteredAssets.length === 0 && (
            <Card className="p-8 text-center bg-foreground">
              <p className="text-muted-foreground">
                No assets found matching your search.
              </p>
            </Card>
          )}
        </TabsContent> */}
      </Tabs>
    </div>
  );
}