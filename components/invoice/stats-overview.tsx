"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, FileText, DollarSign, Percent } from "lucide-react"
import { Asset, MintInvoice } from "@/types"
import IndexMaker from "../icons/indexmaker"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"
import { useMemo } from "react"

interface StatsOverviewProps {
  invoices: MintInvoice[]
  assets: Asset[]
}

export function StatsOverview({ invoices, assets }: StatsOverviewProps) {
  // --- REDUX SELECTORS ---
  // Get Market Data (Prices & Supplies)
  const { prices: reduxPrices, supplies: reduxSupplies } = useSelector(
    (state: RootState) => state.marketData
  );
  // Get List of Indexes to iterate over
  const storedIndexes = useSelector((state: RootState) => state.index.indices);

  // --- AUM CALCULATION LOGIC ---
  const normalize = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const totalAUM = useMemo(() => {
    if (!storedIndexes || storedIndexes.length === 0) return 0;

    return storedIndexes.reduce((acc, idx) => {
      const ticker = idx.ticker;

      // 1. Get Supply from Redux
      const supply = reduxSupplies[ticker] ?? 0;

      // 2. Get Price from Redux (with fuzzy fallback)
      let price = reduxPrices[ticker];
      
      if (price === undefined) {
        const norm = normalize(ticker);
        for (const [k, v] of Object.entries(reduxPrices)) {
          if (normalize(k) === norm) {
            price = v;
            break;
          }
        }
      }

      // 3. Sum (Supply * Price)
      return acc + (supply * (price ?? 0));
    }, 0);
  }, [storedIndexes, reduxPrices, reduxSupplies]);

  // --- EXISTING STATS LOGIC ---
  const totalInvoices = invoices.length
  const completedInvoices = invoices.filter((inv) => inv.status === "completed").length
  
  // Replaced manual invoice sum with the calculated AUM
  const totalValue = totalAUM; 

  const averageFillRate = 1 || invoices.reduce((sum, inv) => sum + inv.fill_rate, 0) / invoices.length || 0
  
  // Note: formatting helpers kept as is
  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) {
      return `${(num / 1e12).toFixed(1)}T`
    }
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`
    }
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`
    }
    return num
  }

  const stats = [
    {
      title: "Total Invoices",
      value: totalInvoices.toString(),
      subtitle: `${completedInvoices} completed`,
      icon: FileText,
      trend: completedInvoices > 0 ? "up" : "neutral",
    },
    {
      title: "Total Value",
      // Updated to display the calculated AUM
      value: (totalValue.toFixed(2)) + ' USDC', 
      subtitle: "Assets under management",
      icon: DollarSign,
      trend: totalValue > 0 ? "up" : "neutral",
    },
    {
      title: "Deployed Indexes",
      value: 6,
      subtitle: "Indexes",
      icon: IndexMaker,
      trend: '',
    },
    {
      title: "Avg Fill Rate",
      value: `${(averageFillRate * 100).toFixed(1)}%`,
      subtitle: "Order execution",
      icon: Percent,
      trend: averageFillRate > 0.8 ? "up" : "neutral",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="border-border bg-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.trend === "up" && (
                    <Badge variant="secondary" className="bg-background text-secondary border-accent">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Good
                    </Badge>
                  )}
                  {stat.trend === "down" && (
                    <Badge variant="secondary" className="bg-background text-secondary border-accent">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Loss
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}