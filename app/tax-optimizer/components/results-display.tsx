"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyFormatter } from "@/lib/tax/utils/currency-formatter";
import { selectCurrentResult, selectSelectedCountry, selectSelectedCountryInfo } from "@/redux/calculatorSelectors";
import { DollarSign, Percent, TrendingUp } from "lucide-react";
import { useSelector } from "react-redux";

export function ResultsDisplay() {
  const results = useSelector(selectCurrentResult);
  const countryInfo = useSelector(selectSelectedCountryInfo);
  const selectedCountry = useSelector(selectSelectedCountry);

  if (!results) return null;

  const formatCurrency = (amount: number) => {
    return CurrencyFormatter.formatTaxAmount(amount, selectedCountry);
  };

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tax Calculation Results
        </CardTitle>
        <CardDescription>
          Tax implications for your {results.investmentType.toUpperCase()} investment in {countryInfo.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Total Tax</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(results.totalTax)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Net Return</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(results.netReturn)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Effective Rate</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercentage(results.effectiveRate)}
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-foreground rounded-lg">
          <h4 className="font-semibold mb-2">Summary</h4>
          <p className="text-sm text-secondary">
            Based on your {results.investmentType} investment in {countryInfo.name},
            you would pay {formatCurrency(results.totalTax)} in taxes,
            resulting in a net return of {formatCurrency(results.netReturn)}
            at an effective tax rate of {formatPercentage(results.effectiveRate)}.
          </p>
        </div>

        <div className="mt-4 flex gap-2">
          <Badge variant="outline">
            {countryInfo.flag} {countryInfo.name}
          </Badge>
          <Badge variant="outline">
            {results.investmentType.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
