"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Position } from "@/types"

interface PositionSummaryProps {
  positions: Position[]
}

export function PositionSummary({ positions }: PositionSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const totalValue = positions.reduce((sum, pos) => sum + pos.total_value, 0)
  const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl, 0)

  return (
    <Card className="bg-foreground">
      <CardHeader>
        <CardTitle>Position Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Summary */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="font-semibold">{formatCurrency(totalValue)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total P&L</span>
            <div className="flex items-center gap-2">
              {totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={`font-semibold ${totalPnL >= 0 ? "text-chart-1" : "text-destructive"}`}>
                {totalPnL >= 0 ? "+" : ""}
                {formatCurrency(totalPnL)}
              </span>
            </div>
          </div>
        </div>

        {/* Individual Positions */}
        <div className="space-y-3">
          {positions.map((position, index) => (
            <div key={index} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-secondary">{position.asset_symbol}</Badge>
                <span className="text-sm font-medium">{position.quantity.toFixed(7)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Avg Price:</span>
                  <div className="font-medium">{formatCurrency(position.average_price)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Value:</span>
                  <div className="font-medium">{formatCurrency(position.total_value)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Unrealized P&L</span>
                <div className="flex items-center gap-1">
                  {position.unrealized_pnl >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-chart-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      position.unrealized_pnl >= 0 ? "text-chart-1" : "text-destructive"
                    }`}
                  >
                    {position.unrealized_pnl >= 0 ? "+" : ""}
                    {formatCurrency(position.unrealized_pnl)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
