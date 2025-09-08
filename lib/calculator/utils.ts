// Calculator utility functions

import type { TaxBracket, InvestmentInput, DefiConfig } from "./types";
import { CurrencyFormatter } from "../tax/utils/currency-formatter";

/**
 * Format currency amount using the centralized currency formatter
 * @deprecated Use CurrencyFormatter.formatCurrency() directly for better country-specific formatting
 */
export function formatCurrency(amount: number, countryKey = "usa"): string {
  return CurrencyFormatter.formatCurrency(amount, countryKey, { showCode: true });
}

/**
 * Format percentage
 */
export function formatPercentage(rate: number, decimals = 2): string {
  return `${rate.toFixed(decimals)}%`;
}

/**
 * Calculate tax based on brackets
 */
export function calculateTaxFromBrackets(
  income: number,
  brackets: TaxBracket[]
): number {
  let tax = 0;
  let remainingIncome = income;

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const taxableInThisBracket = Math.min(
      remainingIncome,
      bracket.max - bracket.min
    );

    tax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;
  }

  return tax;
}

/**
 * Calculate compound interest with DeFi yield
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  compoundFrequency: number = 365
): number {
  return principal * Math.pow(1 + rate / compoundFrequency, compoundFrequency * time);
}

/**
 * Calculate DeFi yield based on configuration
 */
export function calculateDefiYield(
  principal: number,
  config: DefiConfig
): number {
  const compoundFrequencyMap = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
  };

  const frequency = compoundFrequencyMap[config.compoundFrequency];
  const timeInYears = config.stakingPeriod / 12;
  const adjustedRate = config.yieldRate / 100;

  return calculateCompoundInterest(principal, adjustedRate, timeInYears, frequency);
}

/**
 * Validate investment input
 */
export function validateInvestmentInput(input: InvestmentInput): string[] {
  const errors: string[] = [];

  if (input.amount <= 0) {
    errors.push("Investment amount must be greater than 0");
  }

  if (input.holdingPeriod <= 0) {
    errors.push("Holding period must be greater than 0");
  }

  if (input.currentAge < 18 || input.currentAge > 100) {
    errors.push("Current age must be between 18 and 100");
  }

  if (input.additionalIncome < 0) {
    errors.push("Additional income cannot be negative");
  }

  return errors;
}

/**
 * Generate unique calculation ID
 */
export function generateCalculationId(): string {
  return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get filing status display name
 */
export function getFilingStatusDisplayName(status: string): string {
  const statusMap = {
    single: "Single",
    "married-joint": "Married Filing Jointly",
    "married-separate": "Married Filing Separately",
    "head-of-household": "Head of Household",
  };

  return statusMap[status as keyof typeof statusMap] || status;
}

/**
 * Calculate effective tax rate
 */
export function calculateEffectiveRate(tax: number, income: number): number {
  if (income === 0) return 0;
  return (tax / income) * 100;
}
