"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    selectCurrentResult,
    selectSelectedCountry,
    selectShowDefiConfig
} from "@/redux/calculatorSelectors";
import type { AppDispatch } from "@/redux/store";
import { useDispatch, useSelector } from "react-redux";
import { CalculationHistory } from "./calculation-history";
import { CountrySelector } from "./country-selector";
import { DefiConfigurator } from "./defi-configurator";
import { InvestmentInputs } from "./investment-inputs";
import { ResultsDisplay } from "./results-display";

export function TaxCalculator() {
  const dispatch = useDispatch<AppDispatch>();
  const selectedCountry = useSelector(selectSelectedCountry);
  const calculationResults = useSelector(selectCurrentResult);
  const showDefiConfig = useSelector(selectShowDefiConfig);

  return (
    <div className="grid gap-6">
      {/* Country Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Country</CardTitle>
          <CardDescription>
            Choose your country of residence for accurate tax calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CountrySelector />
        </CardContent>
      </Card>

      {/* Investment Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Details</CardTitle>
          <CardDescription>
            Enter your investment parameters for tax calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvestmentInputs />
        </CardContent>
      </Card>

      {/* Results Display */}
      {calculationResults && (
        <ResultsDisplay />
      )}

      {/* DeFi Configuration Modal */}
      <DefiConfigurator />

      {/* Calculation History */}
      <CalculationHistory />

    </div>
  );
}
