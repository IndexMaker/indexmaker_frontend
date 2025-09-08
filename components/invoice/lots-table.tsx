"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Lot } from "@/types"

interface LotsTableProps {
  lots: Lot[]
}

export function LotsTable({ lots }: LotsTableProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set())

  const toggleSymbol = (symbol: string) => {
    const newExpanded = new Set(expandedSymbols)
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol)
    } else {
      newExpanded.add(symbol)
    }
    setExpandedSymbols(newExpanded)
  }

  // Group lots by symbol and calculate summaries
  const groupedLots = lots.reduce(
    (acc, lot) => {
      if (!acc[lot.symbol]) {
        acc[lot.symbol] = {
          lots: [],
          totalValue: 0,
          totalQuantity: 0,
          totalFee: 0,
          averagePrice: 0,
        }
      }
      acc[lot.symbol].lots.push(lot)
      acc[lot.symbol].totalValue += lot.price * lot.assigned_quantity * 1
      acc[lot.symbol].totalQuantity += lot.assigned_quantity * 1
      acc[lot.symbol].totalFee += lot.assigned_fee * 1
      return acc
    },
    {} as Record<string, any>,
  )

  // Calculate average prices
  Object.keys(groupedLots).forEach((symbol) => {
    const group = groupedLots[symbol]
    group.averagePrice = group.totalQuantity > 0 ? group.totalValue / group.totalQuantity : 0
  })

  const formatCurrency = (amount: Number) => {
    // return new Intl.NumberFormat("en-US", {
    //   style: "currency",
    //   currency: "USD",
    //   minimumFractionDigits: 2,
    //   maximumFractionDigits: 7,
    // }).format(amount)

    return Number(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="bg-foreground">
      <CardHeader>
        <CardTitle>Asset Lots Details (USDC)</CardTitle>
      </CardHeader>
      <CardContent>
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
                <div className="flex-1 grid grid-cols-6 gap-4 items-center text-[13x]">
                  <div>
                    <Badge variant="outline" className="text-secondary">{symbol}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="">{formatCurrency(group.totalValue).toFixed(7)}</span>
                  </div>
                  <div className="text-right">
                    <span className="">~{formatCurrency(group.averagePrice).toFixed(7)}</span>
                  </div>
                  <div className="text-right">
                    <span className="">{Number(group.totalQuantity).toFixed(7)}</span>
                  </div>
                  <div className="text-right">
                    <span className="">{formatCurrency(group.totalFee).toFixed(7)}</span>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-background">{group.lots.length} lots</Badge>
                  </div>
                </div>
              </div>

              {/* Detailed Rows */}
              {expandedSymbols.has(symbol) && (
                <div className="border-t border-border">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 p-4 text-[10px] font-medium text-muted-foreground bg-muted/30">
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

                  {/* Detail Rows */}
                  {group.lots.map((lot: Lot, index: number) => (
                    <div
                      key={lot.lot_id}
                      className={`grid grid-cols-12 gap-2 p-4 text-[10px] items-center ${
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      }`}
                    >
                      <div className="col-span-1"></div>
                      <div>
                        <Badge variant="outline" className="text-xs text-secondary">
                          {lot.symbol}
                        </Badge>
                      </div>
                      <div className="text-right font-medium">{formatCurrency(lot.price * lot.assigned_quantity).toFixed(7)}</div>
                      <div className="text-right">{formatCurrency(lot.price).toFixed(7)}</div>
                      <div className="text-right">{Number(lot.assigned_quantity).toFixed(7)}</div>
                      <div className="text-right">{formatCurrency(lot.assigned_fee).toFixed(7)}</div>
                      <div className="text-right text-muted-foreground">{formatDateTime(lot.assigned_timestamp)}</div>
                      <div className="font-mono text-[10px] overflow-ellipsis overflow-hidden w-[5vw]">{lot.lot_id}</div>
                      <div className="text-right">{Number(lot.original_quantity).toFixed(7)}</div>
                      <div className="text-right">{Number(lot.remaining_quantity).toFixed(7)}</div>
                      <div className="text-right">{formatCurrency(lot.original_fee).toFixed(7)}</div>
                      <div className="text-right text-muted-foreground">{formatDateTime(lot.created_timestamp)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
