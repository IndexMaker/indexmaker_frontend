"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Lot } from "@/types";

interface LotsTableProps {
  lots: Lot[];
}

export function LotsTable({ lots }: LotsTableProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(
    new Set()
  );

  const toggleSymbol = (symbol: string) => {
    const next = new Set(expandedSymbols);
    next.has(symbol) ? next.delete(symbol) : next.add(symbol);
    setExpandedSymbols(next);
  };

  // Group lots by symbol and calculate summaries
  const groupedLots = lots.reduce((acc, lot) => {
    if (!acc[lot.symbol]) {
      acc[lot.symbol] = {
        lots: [] as Lot[],
        totalValue: 0,
        totalQuantity: 0,
        totalFee: 0,
        averagePrice: 0,
      };
    }
    acc[lot.symbol].lots.push(lot);
    acc[lot.symbol].totalValue +=
      Number(lot.price) * Number(lot.assigned_quantity);
    acc[lot.symbol].totalQuantity += Number(lot.assigned_quantity);
    acc[lot.symbol].totalFee += Number(lot.assigned_fee);
    return acc;
  }, {} as Record<string, { lots: Lot[]; totalValue: number; totalQuantity: number; totalFee: number; averagePrice: number }>);

  // Calculate average prices
  Object.keys(groupedLots).forEach((symbol) => {
    const g = groupedLots[symbol];
    g.averagePrice = g.totalQuantity > 0 ? g.totalValue / g.totalQuantity : 0;
  });

  const formatCurrency = (amount: number) => Number(amount);

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Card className="bg-foreground">
      <CardHeader>
        <CardTitle>Asset Lots Details (USDC)</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Parent header (for summary rows) */}
        <div className="sticky top-0 z-10 bg-foreground border-b px-4 py-2">
          <div className="flex items-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <div className="w-6 shrink-0" /> {/* space for expand button */}
            <div className="flex-1 grid grid-cols-6 gap-4">
              <div>Symbol</div>
              <div className="text-right">Value</div>
              <div className="text-right">Avg Price</div>
              <div className="text-right">Assigned Qty</div>
              <div className="text-right">Assigned Fee</div>
              <div className="text-right">Lots</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {Object.entries(groupedLots).map(([symbol, group]) => (
            <div key={symbol} className="border border-border rounded-lg">
              {/* Summary Row */}
              <div
                className="flex items-center text-[13px] gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleSymbol(symbol)}
              >
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  {expandedSymbols.has(symbol) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                <div className="flex-1 grid grid-cols-6 gap-4 items-center text-[13px]">
                  <div>
                    <Badge variant="outline" className="text-secondary">
                      {symbol}
                    </Badge>
                  </div>
                  <div className="text-right">
                    {formatCurrency(group.totalValue).toFixed(7)}
                  </div>
                  <div className="text-right">
                    ~{formatCurrency(group.averagePrice).toFixed(7)}
                  </div>
                  <div className="text-right">
                    {Number(group.totalQuantity).toFixed(7)}
                  </div>
                  <div className="text-right">
                    {formatCurrency(group.totalFee).toFixed(7)}
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-background">
                      {group.lots.length} lots
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Detailed Rows */}
              {expandedSymbols.has(symbol) && (
                <div className="border-t border-border">
                  {/* Child table header */}
                  <div className="grid grid-cols-12 gap-2 p-4 text-[10px] font-medium text-muted-foreground bg-muted/30 uppercase tracking-wide">
                    <div className="col-span-1"></div>
                    <div>Symbol</div>
                    <div className="text-right">Value</div>
                    <div className="text-right">Price</div>
                    <div className="text-right">Assigned Qty</div>
                    <div className="text-right">Assigned Fee</div>
                    <div className="text-right">Assigned At</div>
                    <div>Lot ID</div>
                    <div className="text-right">Original Qty</div>
                    <div className="text-right">Remaining Qty</div>
                    <div className="text-right">Original Fee</div>
                    <div className="text-right">Created At</div>
                  </div>

                  {/* Child rows */}
                  {group.lots.map((lot, index) => (
                    <div
                      key={lot.lot_id}
                      className={`grid grid-cols-12 gap-2 p-4 text-[10px] items-center ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      }`}
                    >
                      <div className="col-span-1" />
                      <div>
                        <Badge
                          variant="outline"
                          className="text-xs text-secondary"
                        >
                          {lot.symbol}
                        </Badge>
                      </div>
                      <div className="text-right font-medium">
                        {formatCurrency(
                          Number(lot.price) * Number(lot.assigned_quantity)
                        ).toFixed(7)}
                      </div>
                      <div className="text-right">
                        {formatCurrency(Number(lot.price)).toFixed(7)}
                      </div>
                      <div className="text-right">
                        {Number(lot.assigned_quantity).toFixed(7)}
                      </div>
                      <div className="text-right">
                        {formatCurrency(Number(lot.assigned_fee)).toFixed(7)}
                      </div>
                      <div className="text-right text-muted-foreground">
                        {formatDateTime(lot.assigned_timestamp)}
                      </div>
                      <div className="font-mono text-[10px] overflow-ellipsis overflow-hidden w-[5vw]">
                        {lot.lot_id}
                      </div>
                      <div className="text-right">
                        {Number(lot.original_quantity).toFixed(7)}
                      </div>
                      <div className="text-right">
                        {Number(lot.remaining_quantity).toFixed(7)}
                      </div>
                      <div className="text-right">
                        {formatCurrency(Number(lot.original_fee)).toFixed(7)}
                      </div>
                      <div className="text-right text-muted-foreground">
                        {formatDateTime(lot.created_timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
