"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getCurrencyInfo } from "@/lib/tax/utils/currency-mapping";
import {
    selectCanCalculate,
    selectDefiEnabled,
    selectFormValidation,
    selectInvestmentInput,
    selectIsCalculating,
    selectSelectedCountry
} from "@/redux/calculatorSelectors";
import {
    calculateTaxImpact,
    setAdditionalIncome,
    setCurrentAge,
    setFilingStatus,
    setHoldingPeriod,
    setInvestmentAmount,
    setInvestmentType,
    toggleDefiConfigModal,
    toggleDefiEnabled
} from "@/redux/calculatorSlice";
import type { AppDispatch } from "@/redux/store";
import { Loader2 } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

export function InvestmentInputs() {
  const dispatch = useDispatch<AppDispatch>();
  const investmentInput = useSelector(selectInvestmentInput);
  const selectedCountry = useSelector(selectSelectedCountry);
  const isCalculating = useSelector(selectIsCalculating);
  const formValidation = useSelector(selectFormValidation);
  const canCalculate = useSelector(selectCanCalculate);
  const defiEnabled = useSelector(selectDefiEnabled);

  const handleCalculate = () => {
    if (canCalculate) {
      dispatch(calculateTaxImpact({
        country: selectedCountry,
        input: investmentInput
      }));
    }
  };

  const handleShowDefiConfig = () => {
    dispatch(toggleDefiConfigModal());
  };

  return (
    <div className="space-y-6">
      {/* Form Validation Errors */}
      {!formValidation.isValid && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {formValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="investment-amount">Investment Amount ({getCurrencyInfo(selectedCountry).code})</Label>
          <Input
            id="investment-amount"
            type="number"
            value={investmentInput.amount}
            onChange={(e) => dispatch(setInvestmentAmount(Number(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="holding-period">Holding Period (years)</Label>
          <Input
            id="holding-period"
            type="number"
            step="0.1"
            value={investmentInput.holdingPeriod}
            onChange={(e) => dispatch(setHoldingPeriod(Number(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="current-age">Current Age</Label>
          <Input
            id="current-age"
            type="number"
            value={investmentInput.currentAge}
            onChange={(e) => dispatch(setCurrentAge(Number(e.target.value)))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional-income">Additional Income ({getCurrencyInfo(selectedCountry).code})</Label>
          <Input
            id="additional-income"
            type="number"
            value={investmentInput.additionalIncome}
            onChange={(e) => dispatch(setAdditionalIncome(Number(e.target.value)))}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="filing-status">Filing Status</Label>
          <Select value={investmentInput.filingStatus} onValueChange={(value) => dispatch(setFilingStatus(value as any))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married-joint">Married Filing Jointly</SelectItem>
              <SelectItem value="married-separate">Married Filing Separately</SelectItem>
              <SelectItem value="head-of-household">Head of Household</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="investment-type">Investment Type</Label>
          <Select value={investmentInput.investmentType} onValueChange={(value) => dispatch(setInvestmentType(value as any))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="etf">ETF</SelectItem>
              <SelectItem value="crypto">Cryptocurrency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enable-defi"
            checked={defiEnabled}
            onCheckedChange={() => dispatch(toggleDefiEnabled())}
          />
          <Label htmlFor="enable-defi">Enable DeFi Yield Configuration</Label>
          {defiEnabled && (
            <Button variant="outline" size="sm" onClick={handleShowDefiConfig}>
              Configure DeFi
            </Button>
          )}
        </div>
      </div>

      <Button
        onClick={handleCalculate}
        className="w-full"
        size="lg"
        disabled={!canCalculate}
      >
        {isCalculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          "Calculate Tax Impact"
        )}
      </Button>
    </div>
  );
}
