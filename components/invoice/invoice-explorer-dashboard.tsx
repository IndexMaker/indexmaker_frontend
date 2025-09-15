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
import { fetchAssets, fetchInventory, fetchMintInvoices } from "@/server/invoice";
import { useDispatch, useSelector } from "react-redux";
import { setAssets } from "@/redux/assetSlice";
import { RootState } from "@/redux/store";
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
  const [invoices, setInvoices] = useState<MintInvoice[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");
  const dispatch = useDispatch();
  const { assets } = useSelector((state: RootState) => state.assets);

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
    const loadAssets = async () => {
      try {
        if (assets.length === 0) {
          const [assetsData, inventory] = await Promise.all([
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
          const filtered = assetsData
            .filter((a) => invMap[a.symbol] != null)
            .map((a) => ({ ...a, expected_inventory: invMap[a.symbol] }));
          dispatch(setAssets(filtered));
        }
      } catch (e) {
        console.error("Failed to load assets/inventory:", e);
      } finally {
        setLoadingAssets(false);
      }
    };
    loadAssets();
  }, [dispatch, assets.length]);

  // 2) Load invoices ONLY when dateFrom/dateTo change
  useEffect(() => {
    let cancelled = false;
    // guard: both dates must exist
    const from = filters.dateFrom ?? DEFAULT_FROM;
    const to = filters.dateTo ?? DEFAULT_TO;

    setLoadingInvoices(true);

    // small debounce so changing both dates triggers one call
    const t = setTimeout(async () => {
      try {
        const invoicesData = await fetchMintInvoices(from, to);

        // mock augmentation you already had:
        const augmented = invoicesData.map((inv) => ({
          ...inv,
          status: "completed",
        }));

        if (!cancelled) setInvoices(augmented as MintInvoice[]);
      } catch (e) {
        console.error("Failed to load invoices:", e);
      } finally {
        if (!cancelled) setLoadingInvoices(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [filters.dateFrom?.getTime(), filters.dateTo?.getTime()]); // <-- only react to date changes

  // ---- filtering (unchanged) ----
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesQuery =
        !filters.query ||
        invoice.symbol.toLowerCase().includes(filters.query.toLowerCase()) ||
        invoice.address.toLowerCase().includes(filters.query.toLowerCase()) ||
        invoice.client_order_id
          .toLowerCase()
          .includes(filters.query.toLowerCase()) ||
        invoice.payment_id.toLowerCase().includes(filters.query.toLowerCase());

      const matchesStatus =
        !filters.status ||
        filters.status === "all" ||
        invoice.status === filters.status;

      const matchesSymbol =
        filters.symbol === "all" || invoice.symbol === filters.symbol;

      const matchesAmount = (() => {
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
        const minRate = filters.fillRateMin
          ? Number.parseFloat(filters.fillRateMin) / 100
          : 0;
        const maxRate = filters.fillRateMax
          ? Number.parseFloat(filters.fillRateMax) / 100
          : 1;
        return invoice.fill_rate >= minRate && invoice.fill_rate <= maxRate;
      })();

      const matchesDate = (() => {
        const invoiceDate = new Date(invoice.timestamp);
        const fromDate = filters.dateFrom;
        const toDate = filters.dateTo;
        if (fromDate && invoiceDate < fromDate) return false;
        if (toDate && invoiceDate > toDate) return false;
        return true;
      })();

      return (
        matchesQuery &&
        matchesStatus &&
        matchesSymbol &&
        matchesAmount &&
        matchesFillRate &&
        matchesDate
      );
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
          {/* <Badge variant="secondary" className="px-3 py-1">
            Live Network
          </Badge> */}
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
        <TabsList className="grid grid-cols-2 w-full bg-foreground">
          <TabsTrigger
            value="invoices"
            className="flex items-center gap-2 bg-foreground text-secondary"
          >
            <FileText className="h-4 w-4" />
            Mint Invoices
          </TabsTrigger>
          <TabsTrigger
            value="assets"
            className="flex items-center gap-2 bg-foreground text-secondary"
          >
            <Activity className="h-4 w-4" />
            Supply to Expected Inventory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between text-primary">
            <h2 className="text-[20px] text-primary">Mint Invoices</h2>
            <Badge variant="outline" className="text-secondary">
              {filteredInvoices.length} invoices
            </Badge>
          </div>

          <InvoiceTable invoices={filteredInvoices} />

          {filteredInvoices.length === 0 && (
            <Card className="p-8 text-center bg-foreground">
              <p className="text-secondary">
                No invoices found matching your search criteria.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] text-primary">Supply to Expected Inventory</h2>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
