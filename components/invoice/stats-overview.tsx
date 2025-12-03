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
  const { prices: reduxPrices, supplies: reduxSupplies } = useSelector(
    (state: RootState) => state.marketData
  );
  const storedIndexes = useSelector((state: RootState) => state.index.indices);

  // --- AUM CALCULATION LOGIC ---
  const normalize = (s: string) => s.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const totalAUM = useMemo(() => {
    if (!storedIndexes || storedIndexes.length === 0) return 0;

    return storedIndexes.reduce((acc, idx) => {
      const ticker = idx.ticker;
      const supply = reduxSupplies[ticker] ?? 0;
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

      return acc + (supply * (price ?? 0));
    }, 0);
  }, [storedIndexes, reduxPrices, reduxSupplies]);

  // --- EXISTING STATS LOGIC ---
  const totalInvoices = invoices.length
  const completedInvoices = invoices.filter((inv) => inv.status === "completed").length
  
  const totalValue = totalAUM; 

  const averageFillRate = 1 || invoices.reduce((sum, inv) => sum + inv.fill_rate, 0) / invoices.length || 0
  
  const allStats = [
    {
      title: "Total Invoices",
      value: totalInvoices.toString(),
      subtitle: `${completedInvoices} completed`,
      icon: FileText,
      trend: completedInvoices > 0 ? "up" : "neutral",
    },
    {
      title: "Total Value",
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

  // Filter out the Total Value card if the value is 0
  const displayedStats = allStats.filter((stat) => {
    if (stat.title === "Total Value" && totalValue === 0) {
      return false
    }
    return true
  })

  // Dynamic grid class based on item count
  const gridColsClass = displayedStats.length === 3 
    ? "lg:grid-cols-3" 
    : "lg:grid-cols-4";

  return (
    // Applied dynamic variable here
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridColsClass} gap-4`}>
      {displayedStats.map((stat, index) => {
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