"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ExternalLink, Clock, DollarSign, TrendingUp } from "lucide-react"
import Link from "next/link"
import { MintInvoice } from "@/types"

interface InvoiceCardProps {
  invoice: MintInvoice
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const fillPercentage = Math.round(invoice.fill_rate * 100)
  const totalValue = invoice.assets_value
  // const profitLoss = invoice.position.reduce((sum, pos) => sum + pos.unrealized_pnl, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-chart-1 text-white"
      case "pending":
        return "bg-chart-2 text-white"
      case "failed":
        return "bg-destructive text-destructive-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
            <span className="text-sm text-muted-foreground">#{invoice.id}</span>
          </div>
          <Link href={`/invoice/${invoice.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Address and Symbol */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Address</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{formatAddress(invoice.address)}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Symbol</span>
            <Badge variant="outline">{invoice.symbol}</Badge>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Value</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(totalValue)}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">P&L</span>
            </div>
            {/* <p className={`text-sm font-semibold ${profitLoss >= 0 ? "text-chart-1" : "text-destructive"}`}>
              {profitLoss >= 0 ? "+" : ""}
              {formatCurrency(profitLoss)}
            </p> */}
          </div>
        </div>

        {/* Fill Rate Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Fill Rate</span>
            <span className="text-sm font-medium">{fillPercentage}%</span>
          </div>
          <Progress value={fillPercentage} className="h-2" />
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {new Date(invoice.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        {/* Asset Lots Count */}
        <div className="pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {invoice.lots.length} asset lot{invoice.lots.length !== 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
