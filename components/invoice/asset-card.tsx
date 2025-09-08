"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Asset } from "@/types"

interface AssetCardProps {
  asset: Asset
}

export function AssetCard({ asset }: AssetCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatLargeNumber = (num: number) => {
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`
    }
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`
    }
    if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`
    }
    return num.toLocaleString()
  }

  const supplyPercentage = (asset.circulating_supply / asset.total_supply) * 100

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-border bg-foreground">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{asset.symbol.slice(0, 2)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">{asset.symbol}</h3>
              <p className="text-xs text-muted-foreground">{asset.name}</p>
            </div>
          </div>
          <Link href={`/asset/${asset.id}`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Price</span>
          <p className="text-lg font-bold">{formatCurrency(asset.price_usd)}</p>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Market Cap</span>
            <p className="text-sm font-semibold">{formatLargeNumber(asset.market_cap)}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">24h Volume</span>
            <p className="text-sm font-semibold">{(asset.expected_inventory)}</p>
          </div>
        </div>

        {/* Supply Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Circulating Supply</span>
            <span className="text-xs font-medium">{supplyPercentage.toFixed(1)}%</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${supplyPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatLargeNumber(asset.circulating_supply)}</span>
              <span>{formatLargeNumber(asset.total_supply)}</span>
            </div>
          </div>
        </div>

        {/* Activity Indicator */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Activity className="h-3 w-3 text-chart-1" />
          <span className="text-xs text-muted-foreground">Active Trading</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            Live
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
