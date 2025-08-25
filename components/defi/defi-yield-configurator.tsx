'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Asset = {
  key: string;
  name: string;
  defaultRate: number; // decimal, e.g. 0.0074 = 0.74%
  notes: string;
};

const ASSETS: Asset[] = [
  {
    key: 'stocks_large',
    name: 'Stocks - Large Cap',
    defaultRate: 0.0074,
    notes:
      'Avg securities lending income on large-cap funds (ex-Vanguard). Typical 0.2–5% depending on borrow demand.',
  },
  {
    key: 'stocks_mid',
    name: 'Stocks - Mid Cap',
    defaultRate: 0.0063,
    notes: 'Industry averages suggest slightly below large-cap; depends on utilization.',
  },
  {
    key: 'stocks_small',
    name: 'Stocks - Small Cap',
    defaultRate: 0.015,
    notes: 'Often 1–2%+ due to higher shorting demand and lower float.',
  },
  {
    key: 'etfs',
    name: 'ETFs',
    defaultRate: 0.0067,
    notes: 'Global avg ~0.67%; can be as low as ~0.11% on some small-cap ETFs.',
  },
  {
    key: 'crypto_large',
    name: 'Crypto - Large Cap (ETH)',
    defaultRate: 0.045,
    notes: 'Common 5–10% band across major platforms; volatile.',
  },
  {
    key: 'crypto_mid',
    name: 'Crypto - Mid Cap',
    defaultRate: 0.035,
    notes: 'Similar to large-cap, sometimes higher depending on borrow demand.',
  },
  {
    key: 'crypto_stables',
    name: 'Crypto - Stablecoins (USDT/USDC)',
    defaultRate: 0.047,
    notes: 'Often 4–8% on reputable venues; higher on riskier platforms.',
  },
  {
    key: 'bonds',
    name: 'Bonds',
    defaultRate: 0.035,
    notes: 'Proxy using cash/sovereign yields; lending premia limited.',
  },
  {
    key: 'commodities',
    name: 'Commodities',
    defaultRate: 0.002,
    notes: 'Direct lending not standard; proxy near zero. Indirect via derivatives programs.',
  },
  {
    key: 'real_estate',
    name: 'Real Estate',
    defaultRate: 0.06,
    notes: 'Cap-rate style yield proxy; varies by market.',
  },
  {
    key: 'fx_cash',
    name: 'Forex / Cash',
    defaultRate: 0.04,
    notes: 'Money-market style rates; carry depends on currency pair.',
  },
];

type AssetAllocation = {
  assetKey: string;
  allocation: number; // percentage (0-100)
  customRate?: number; // optional custom rate override
};

interface DefiYieldConfiguratorProps {
  onConfigChange?: (config: {
    allocations: AssetAllocation[];
    totalYield: number;
    weightedYield: number;
  }) => void;
}

export default function DefiYieldConfigurator({ onConfigChange }: DefiYieldConfiguratorProps) {
  const [allocations, setAllocations] = useState<AssetAllocation[]>([
    { assetKey: 'stocks_large', allocation: 60 },
    { assetKey: 'bonds', allocation: 40 },
  ]);

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate weighted yield
  const { totalAllocation, weightedYield } = useMemo(() => {
    const total = allocations.reduce((sum, alloc) => sum + alloc.allocation, 0);
    const weighted = allocations.reduce((sum, alloc) => {
      const asset = ASSETS.find(a => a.key === alloc.assetKey);
      if (!asset) return sum;
      const rate = alloc.customRate ?? asset.defaultRate;
      return sum + (alloc.allocation / 100) * rate;
    }, 0);
    
    return {
      totalAllocation: total,
      weightedYield: weighted,
    };
  }, [allocations]);

  // Notify parent of changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange({
        allocations,
        totalYield: totalAllocation,
        weightedYield,
      });
    }
  }, [allocations, totalAllocation, weightedYield, onConfigChange]);

  const addAsset = () => {
    const unusedAssets = ASSETS.filter(
      asset => !allocations.some(alloc => alloc.assetKey === asset.key)
    );
    if (unusedAssets.length > 0) {
      setAllocations([...allocations, { assetKey: unusedAssets[0].key, allocation: 0 }]);
    }
  };

  const removeAsset = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: keyof AssetAllocation, value: any) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const normalizeAllocations = () => {
    if (totalAllocation === 0) return;
    const factor = 100 / totalAllocation;
    const normalized = allocations.map(alloc => ({
      ...alloc,
      allocation: Math.round(alloc.allocation * factor * 100) / 100,
    }));
    setAllocations(normalized);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          DeFi Yield Configurator
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Configure your asset allocation and expected yields for tax calculations</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Asset Allocation</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addAsset}>
                Add Asset
              </Button>
              <Button variant="outline" size="sm" onClick={normalizeAllocations}>
                Normalize to 100%
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Allocation (%)</TableHead>
                <TableHead>Expected Yield (%)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation, index) => {
                const asset = ASSETS.find(a => a.key === allocation.assetKey);
                if (!asset) return null;

                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={allocation.assetKey}
                        onValueChange={(value) => updateAllocation(index, 'assetKey', value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSETS.map(asset => (
                            <SelectItem key={asset.key} value={asset.key}>
                              {asset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={allocation.allocation}
                        onChange={(e) => updateAllocation(index, 'allocation', parseFloat(e.target.value) || 0)}
                        className="w-20"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={((allocation.customRate ?? asset.defaultRate) * 100).toFixed(2)}
                        onChange={(e) => updateAllocation(index, 'customRate', (parseFloat(e.target.value) || 0) / 100)}
                        className="w-20"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAsset(index)}
                        disabled={allocations.length <= 1}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-sm font-medium">Total Allocation</Label>
              <p className={`text-lg font-bold ${totalAllocation === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                {totalAllocation.toFixed(1)}%
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Weighted Yield</Label>
              <p className="text-lg font-bold text-blue-600">
                {(weightedYield * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
