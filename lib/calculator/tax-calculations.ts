// Core tax calculation logic adapted from calculator project

import { COUNTRY_CONFIGS } from "./constants";
import {
    CalculationError,
    ConfigurationError,
    createErrorResult,
    createSuccessResult,
    ValidationError,
    type ErrorResult
} from "./errors";
import type { CountryTaxConfig, InvestmentInput, TaxBracket, TaxCalculationResult } from "./types";
import { validateInvestmentInput } from "./validation";

/**
 * Calculate progressive tax based on brackets
 */
function calculateProgressiveTax(income: number, brackets: TaxBracket[]): number {
  let tax = 0;
  let remainingIncome = Math.max(0, income);

  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;

    const taxableInThisBracket = Math.min(
      remainingIncome,
      bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min
    );

    tax += taxableInThisBracket * bracket.rate;
    remainingIncome -= taxableInThisBracket;

    if (bracket.max === Infinity) break;
  }

  return tax;
}

/**
 * Calculate capital gains tax
 */
function calculateCapitalGainsTax(
  gain: number,
  isLongTerm: boolean,
  config: CountryTaxConfig,
  ordinaryIncome: number
): number {
  if (gain <= 0) return 0;

  const rate = isLongTerm ? config.capitalGainsRates.longTerm : config.capitalGainsRates.shortTerm;
  
  // For short-term gains, treat as ordinary income
  if (!isLongTerm) {
    const totalIncome = ordinaryIncome + gain;
    const brackets = config.brackets.single; // Simplified - should use actual filing status
    const totalTax = calculateProgressiveTax(totalIncome, brackets);
    const ordinaryTax = calculateProgressiveTax(ordinaryIncome, brackets);
    return totalTax - ordinaryTax;
  }

  // For long-term gains, use flat rate (simplified)
  return gain * rate;
}

/**
 * Calculate Net Investment Income Tax (NIIT) for USA
 */
function calculateNIIT(
  investmentIncome: number,
  modifiedAGI: number,
  filingStatus: string
): number {
  // NIIT thresholds for 2024
  const thresholds = {
    single: 200000,
    "married-joint": 250000,
    "married-separate": 125000,
    "head-of-household": 200000,
  };

  const threshold = thresholds[filingStatus as keyof typeof thresholds] || thresholds.single;
  
  if (modifiedAGI <= threshold) return 0;

  const excessIncome = modifiedAGI - threshold;
  const niitBase = Math.min(investmentIncome, excessIncome);
  
  return niitBase * 0.038; // 3.8% NIIT rate
}

/**
 * Main tax calculation function with proper error handling
 */
export function calculateTaxes(
  countryCode: string,
  input: InvestmentInput
): ErrorResult<TaxCalculationResult> {
  // Validate input
  const validationResult = validateInvestmentInput(input);
  if (!validationResult.success) {
    return createErrorResult(
      new ValidationError(`Invalid input: ${validationResult.errors.join(", ")}`)
    );
  }

  // Get country configuration
  const config = COUNTRY_CONFIGS[countryCode as keyof typeof COUNTRY_CONFIGS];
  if (!config) {
    return createErrorResult(
      new ConfigurationError(`Unsupported country: ${countryCode}`, countryCode)
    );
  }

  try {
    return createSuccessResult(calculateTaxesInternal(countryCode, config, validationResult.data));
  } catch (error) {
    return createErrorResult(
      new CalculationError(
        error instanceof Error ? error.message : "Unknown calculation error",
        countryCode,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Internal tax calculation function (pure, no error handling)
 */
function calculateTaxesInternal(
  countryCode: string,
  config: CountryTaxConfig,
  input: InvestmentInput
): TaxCalculationResult {

  // Determine if gains are long-term (> 1 year)
  const isLongTerm = input.holdingPeriod >= 1;
  
  // Calculate gain (simplified - assuming 7% annual return)
  const annualReturn = 0.07;
  const totalReturn = input.amount * Math.pow(1 + annualReturn, input.holdingPeriod);
  const gain = totalReturn - input.amount;

  // Get tax brackets based on filing status
  const brackets = config.brackets[input.filingStatus.replace("-", "") as keyof typeof config.brackets] || config.brackets.single;
  
  // Calculate standard deduction
  const standardDeduction = config.standardDeduction[input.filingStatus.replace("-", "") as keyof typeof config.standardDeduction] || config.standardDeduction.single;
  
  // Calculate taxable ordinary income
  const taxableOrdinaryIncome = Math.max(0, input.additionalIncome - standardDeduction);
  
  // Calculate capital gains tax
  const capitalGainsTax = calculateCapitalGainsTax(gain, isLongTerm, config, taxableOrdinaryIncome);
  
  // Calculate ordinary income tax (if any additional tax from capital gains)
  const ordinaryIncomeTax = calculateProgressiveTax(taxableOrdinaryIncome, brackets);
  
  // Calculate NIIT (for USA only)
  let niitTax = 0;
  if (countryCode === "usa") {
    const modifiedAGI = input.additionalIncome + gain;
    niitTax = calculateNIIT(gain, modifiedAGI, input.filingStatus);
  }

  // Special handling for crypto (higher rates in some countries)
  let cryptoAdjustment = 0;
  if (input.investmentType === "crypto") {
    // Some countries treat crypto differently
    if (countryCode === "germany" && input.holdingPeriod < 1) {
      // Germany: crypto held < 1 year is taxed as ordinary income
      cryptoAdjustment = gain * 0.1; // Simplified adjustment
    }
  }

  const totalTax = capitalGainsTax + niitTax + cryptoAdjustment;
  const netReturn = totalReturn - totalTax;
  const effectiveRate = gain > 0 ? (totalTax / gain) * 100 : 0;

  return {
    country: countryCode,
    investmentType: input.investmentType,
    totalTax,
    netReturn,
    effectiveRate,
    breakdown: {
      capitalGainsTax,
      ordinaryIncomeTax: 0, // Not adding to total for this calculation
      defiYieldTax: 0, // DeFi yield tax (currently simplified - would need detailed implementation per country)
    },
  };
}

/**
 * Compare tax implications between ETF and Crypto with proper error handling
 */
export function compareTaxImplications(
  countryCode: string,
  baseInput: InvestmentInput
): ErrorResult<{ etf: TaxCalculationResult; crypto: TaxCalculationResult }> {
  const etfInput = { ...baseInput, investmentType: "etf" as const };
  const cryptoInput = { ...baseInput, investmentType: "crypto" as const };

  const etfResult = calculateTaxes(countryCode, etfInput);
  const cryptoResult = calculateTaxes(countryCode, cryptoInput);

  if (!etfResult.success) {
    return etfResult;
  }

  if (!cryptoResult.success) {
    return cryptoResult;
  }

  return createSuccessResult({
    etf: etfResult.data,
    crypto: cryptoResult.data,
  });
}

/**
 * Calculate tax-optimized holding period
 */
export function calculateOptimalHoldingPeriod(
  countryCode: string,
  input: InvestmentInput
): ErrorResult<{ period: number; taxSavings: number }> {
  const shortTermResult = calculateTaxes(countryCode, { ...input, holdingPeriod: 0.5 });
  const longTermResult = calculateTaxes(countryCode, { ...input, holdingPeriod: 1.1 });

  if (!shortTermResult.success) {
    return shortTermResult;
  }

  if (!longTermResult.success) {
    return longTermResult;
  }

  const taxSavings = shortTermResult.data.totalTax - longTermResult.data.totalTax;

  return createSuccessResult({
    period: 1, // Simplified - always recommend > 1 year for long-term treatment
    taxSavings,
  });
}
