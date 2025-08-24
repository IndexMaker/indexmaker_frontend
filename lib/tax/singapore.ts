// lib/tax/singapore.ts
import type { Brackets, CalcOut, CountryModule, Setup, TaxableParams, TaxParams } from './types';

// Helpers (local)
function calcProgressiveTax(income: number, uppers: readonly number[], rates: readonly number[]) {
  let tax = 0,
    prev = 0;
  const inc = Math.max(0, income);
  for (let i = 0; i < uppers.length; i++) {
    const upper = uppers[i],
      rate = rates[i];
    const seg = Math.min(inc, upper) - prev;
    if (seg > 0) tax += seg * rate;
    prev = upper;
    if (inc <= upper) break;
  }
  return tax;
}

function taxIncrement(
  uppers: readonly number[],
  rates: readonly number[],
  baseTaxable: number,
  delta: number
) {
  const d = Math.max(0, delta);
  const x0 = Math.max(0, baseTaxable);
  const x1 = Math.max(0, baseTaxable + d);
  return calcProgressiveTax(x1, uppers, rates) - calcProgressiveTax(x0, uppers, rates);
}

// Basic brackets - TODO: Implement country-specific tax brackets
function getBrackets(status: string): Brackets {
  return {
    ordinary: {
      uppers: [50000, 100000, 200000, Number.POSITIVE_INFINITY],
      rates: [0.1, 0.2, 0.3, 0.4]
    },
    stdDed: 10000,
    niitThresh: 200000
  };
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'CPF',
    type: 'taxfree',
    fees: 'Tax-exempt contributions/growth/withdrawals (TEE).',
    penaltyRate: 0,
    thresholdAge: 55,
  },
  {
    name: 'SRS',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, 50% taxable withdrawals.',
    penaltyRate: 0.05,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'No withdrawal restrictions',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

function computeTaxable(p: TaxableParams): { readonly tax: number; readonly niit: number } {
  const { agiExcl, taxableAmount, brackets } = p;
  const { ordinary, stdDed, niitThresh } = brackets;

  // Basic implementation - TODO: Implement country-specific logic
  const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
  const tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);
  
  // Basic NIIT calculation
  const totalIncome = agiExcl + taxableAmount;
  let niit = 0;
  if (totalIncome > niitThresh) {
    niit = Math.min(taxableAmount, totalIncome - niitThresh) * 0.038;
  }

  return { tax, niit };
}

function computeDeferredFull(p: TaxableParams): { readonly tax: number; readonly niit: number } {
  const { agiExcl, taxableAmount, brackets } = p;
  const { ordinary, stdDed, niitThresh } = brackets;

  // For deferred accounts, everything is taxed as ordinary income
  const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
  const tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);
  
  // NIIT calculation
  const totalIncome = agiExcl + taxableAmount;
  let niit = 0;
  if (totalIncome > niitThresh) {
    niit = Math.min(taxableAmount, totalIncome - niitThresh) * 0.038;
  }

  return { tax, niit };
}

export const singapore: CountryModule = {
  key: 'singapore',
  name: 'Singapore',
  currency: 'SGD', // TODO: Add proper currency mapping
  statuses,
  cryptoNote: '0% capital gains tax for individual investors; income tax up to 22% if frequent trading or business activity (brackets: 0% SGD 0-20,000, 2% 20,001-30,000, 3.5% 30,001-40,000, 7% 40,001-80,000, 12% 80,001-120,000, 16% 120,001-160,000, 19% 160,001-200,000, 20% 200,001-240,000, 21% 240,001-280,000, 22% >280,000). 8% GST on purchases; no distinction for holding periods.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
