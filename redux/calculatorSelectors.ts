import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import { SUPPORTED_COUNTRIES } from "@/lib/calculator/constants";

// Base selectors
export const selectCalculatorState = (state: RootState) => state.calculator;

export const selectSelectedCountry = (state: RootState) => state.calculator.selectedCountry;

export const selectInvestmentInput = (state: RootState) => state.calculator.investmentInput;

export const selectDefiConfig = (state: RootState) => state.calculator.defiConfig;

export const selectCurrentResult = (state: RootState) => state.calculator.currentResult;

export const selectComparisonResult = (state: RootState) => state.calculator.comparisonResult;

export const selectCalculationHistory = (state: RootState) => state.calculator.calculationHistory;

export const selectIsCalculating = (state: RootState) => state.calculator.isCalculating;

export const selectShowDefiConfig = (state: RootState) => state.calculator.showDefiConfig;

export const selectError = (state: RootState) => state.calculator.error;

export const selectAutoSave = (state: RootState) => state.calculator.autoSave;

export const selectDefaultCountry = (state: RootState) => state.calculator.defaultCountry;

// Memoized selectors
export const selectSelectedCountryInfo = createSelector(
  [selectSelectedCountry],
  (countryCode) => {
    return SUPPORTED_COUNTRIES.find(country => country.code === countryCode) || SUPPORTED_COUNTRIES[0];
  }
);

export const selectInvestmentSummary = createSelector(
  [selectInvestmentInput, selectSelectedCountry],
  (input, country) => ({
    country,
    amount: input.amount,
    type: input.investmentType,
    period: input.holdingPeriod,
    isLongTerm: input.holdingPeriod >= 1,
  })
);

export const selectTaxSavingsFromLongTerm = createSelector(
  [selectComparisonResult],
  (comparison) => {
    if (!comparison) return null;
    
    const etfSavings = comparison.etf.totalTax;
    const cryptoSavings = comparison.crypto.totalTax;
    
    return {
      etf: etfSavings,
      crypto: cryptoSavings,
      difference: Math.abs(etfSavings - cryptoSavings),
      betterOption: etfSavings < cryptoSavings ? 'etf' : 'crypto',
    };
  }
);

export const selectRecentCalculations = createSelector(
  [selectCalculationHistory],
  (history) => history.slice(0, 5)
);

export const selectCalculationsByCountry = createSelector(
  [selectCalculationHistory],
  (history) => {
    const byCountry: Record<string, number> = {};
    history.forEach(calc => {
      byCountry[calc.country] = (byCountry[calc.country] || 0) + 1;
    });
    return byCountry;
  }
);

export const selectAverageTaxRate = createSelector(
  [selectCalculationHistory],
  (history) => {
    if (history.length === 0) return 0;
    
    const totalRate = history.reduce((sum, calc) => sum + calc.result.effectiveRate, 0);
    return totalRate / history.length;
  }
);

export const selectFormValidation = createSelector(
  [selectInvestmentInput],
  (input) => {
    const errors: string[] = [];
    
    if (input.amount <= 0) {
      errors.push("Investment amount must be greater than 0");
    }
    
    if (input.amount > 10000000) {
      errors.push("Investment amount seems unreasonably high");
    }
    
    if (input.holdingPeriod <= 0) {
      errors.push("Holding period must be greater than 0");
    }
    
    if (input.holdingPeriod > 50) {
      errors.push("Holding period seems unreasonably long");
    }
    
    if (input.currentAge < 18 || input.currentAge > 100) {
      errors.push("Current age must be between 18 and 100");
    }
    
    if (input.additionalIncome < 0) {
      errors.push("Additional income cannot be negative");
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
);

export const selectCanCalculate = createSelector(
  [selectFormValidation, selectIsCalculating],
  (validation, isCalculating) => validation.isValid && !isCalculating
);

export const selectDefiEnabled = createSelector(
  [selectInvestmentInput],
  (input) => input.enableDefi
);

export const selectEstimatedGain = createSelector(
  [selectInvestmentInput],
  (input) => {
    // Simple 7% annual return estimation
    const annualReturn = 0.07;
    const totalReturn = input.amount * Math.pow(1 + annualReturn, input.holdingPeriod);
    return totalReturn - input.amount;
  }
);

export const selectTaxEfficiency = createSelector(
  [selectCurrentResult, selectEstimatedGain],
  (result, estimatedGain) => {
    if (!result || estimatedGain <= 0) return null;
    
    const efficiency = ((estimatedGain - result.totalTax) / estimatedGain) * 100;
    
    return {
      efficiency: Math.max(0, efficiency),
      rating: efficiency > 80 ? 'excellent' : efficiency > 60 ? 'good' : efficiency > 40 ? 'fair' : 'poor',
    };
  }
);
