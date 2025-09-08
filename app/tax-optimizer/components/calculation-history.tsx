"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyFormatter } from "@/lib/tax/utils/currency-formatter";
import { log } from "@/lib/utils/logger";
import { selectCalculationHistory, selectRecentCalculations } from "@/redux/calculatorSelectors";
import { removeFromHistory } from "@/redux/calculatorSlice";
import type { AppDispatch } from "@/redux/store";
import { Download, History, Trash2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

export function CalculationHistory() {
  const dispatch = useDispatch<AppDispatch>();
  const history = useSelector(selectCalculationHistory);
  const recentCalculations = useSelector(selectRecentCalculations);

  const formatCurrency = (amount: number, country: string) => {
    return CurrencyFormatter.formatTaxAmount(amount, country);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDelete = (id: string) => {
    dispatch(removeFromHistory(id));
  };

  const handleExport = () => {
    // Export functionality
    log.info("Exporting calculation history", { historyCount: history.length });
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Calculation History
          </CardTitle>
          <CardDescription>
            Your recent tax calculations will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No calculations yet</p>
            <p className="text-sm">Start by calculating your tax impact above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Calculation History
            </CardTitle>
            <CardDescription>
              Your recent tax calculations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentCalculations.map((calculation) => (
            <div
              key={calculation.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{calculation.country.toUpperCase()}</Badge>
                  <Badge variant="outline">{calculation.result.investmentType.toUpperCase()}</Badge>
                  <span className="text-sm text-foreground">
                    {formatDate(calculation.date)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount: </span>
                    <span className="font-medium">{formatCurrency(calculation.input.amount, calculation.country)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tax: </span>
                    <span className="font-medium text-red-600">{formatCurrency(calculation.result.totalTax, calculation.country)}</span>
                  </div>
                  <div>
                    <span className="text-foreground">Rate: </span>
                    <span className="font-medium">{calculation.result.effectiveRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(calculation.id)}
                className="text-red-500/50 hover:text-red-700/50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
