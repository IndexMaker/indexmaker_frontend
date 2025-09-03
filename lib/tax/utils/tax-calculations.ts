// lib/tax/utils/tax-calculations.ts
// Shared tax calculation utilities to eliminate code duplication

import { TaxableParams } from "../types";

/**
 * Calculate progressive tax based on income brackets
 * @param income - The taxable income
 * @param uppers - Array of bracket upper limits
 * @param rates - Array of tax rates for each bracket
 * @returns Total tax amount
 */
export function calcProgressiveTax(
  income: number, 
  uppers: readonly number[], 
  rates: readonly number[]
): number {
  let tax = 0;
  let prev = 0;
  const inc = Math.max(0, income);
  
  for (let i = 0; i < uppers.length; i++) {
    const upper = uppers[i];
    const rate = rates[i];
    const seg = Math.min(inc, upper) - prev;
    
    if (seg > 0) {
      tax += seg * rate;
    }
    
    prev = upper;
    if (inc <= upper) break;
  }
  
  return tax;
}

/**
 * Calculate incremental tax on additional income
 * @param uppers - Array of bracket upper limits
 * @param rates - Array of tax rates for each bracket
 * @param baseTaxable - Base taxable income
 * @param delta - Additional income amount
 * @returns Additional tax on the delta amount
 */
export function taxIncrement(
  uppers: readonly number[],
  rates: readonly number[],
  baseTaxable: number,
  delta: number
): number {
  const d = Math.max(0, delta);
  const x0 = Math.max(0, baseTaxable);
  const x1 = Math.max(0, baseTaxable + d);
  
  return calcProgressiveTax(x1, uppers, rates) - calcProgressiveTax(x0, uppers, rates);
}

/**
 * Create tax brackets with country-specific properties
 * @param config - Configuration object with bracket details and country-specific properties
 * @returns Bracket structure with country-specific properties
 */
export function createCountryBrackets(config: {
  ordinary: {
    uppers: readonly number[];
    rates: readonly number[];
  };
  lt?: {
    uppers: readonly number[];
    rates: readonly number[];
  } | null;
  stdDed?: number;
  niitThresh?: number;
  [key: string]: any; // Allow country-specific properties
}) {
  const { ordinary, lt, stdDed, niitThresh, ...additionalProps } = config;
  return {
    ordinary,
    lt: lt || null,
    stdDed: stdDed || 0,
    niitThresh: niitThresh || 0,
    ...additionalProps // Spread any additional country-specific properties
  };
}

/**
 * Create default tax brackets for countries without specific implementation
 * @param stdDed - Standard deduction amount
 * @param niitThresh - Net Investment Income Tax threshold
 * @returns Default bracket structure
 */
export function createDefaultBrackets(stdDed: number = 10000, niitThresh: number = 200000) {
  return createCountryBrackets({
    ordinary: {
      uppers: [50000, 100000, 200000, Number.POSITIVE_INFINITY],
      rates: [0.1, 0.2, 0.3, 0.4]
    },
    stdDed,
    niitThresh
  });
}

/**
 * Create default computation functions for countries
 * @param brackets - Tax bracket configuration
 * @returns Object with computeTaxable and computeDeferredFull functions
 */
export function createDefaultComputeFunctions(getBrackets: (status: string) => any) {
  const computeTaxable = (p: TaxableParams) => {
    const { agiExcl, taxableAmount, brackets } = p;
    const { ordinary, stdDed, niitThresh } = brackets;
    
    // Calculate ordinary income tax
    const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
    const tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);
    
    // Calculate NIIT (Net Investment Income Tax) - simplified
    const totalIncome = agiExcl + taxableAmount;
    let niit = 0;
    if (totalIncome > niitThresh) {
      niit = Math.min(taxableAmount, totalIncome - niitThresh) * 0.038;
    }
    
    return {
      tax: tax + niit,
      niit
    };
  };

  const computeDeferredFull = (p: TaxableParams) => {
    // For deferred accounts, everything is taxed as ordinary income
    return computeTaxable(p);
  };

  return { computeTaxable, computeDeferredFull };
}
