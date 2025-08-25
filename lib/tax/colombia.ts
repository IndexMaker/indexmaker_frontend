// lib/tax/colombia.ts
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
    name: 'Voluntary pension funds',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed benefits (EET).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'AFC',
    type: 'taxable',
    fees: 'Tax exemption on savings for housing.',
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

export const colombia: CountryModule = {
  key: 'colombia',
  name: 'Colombia',
  currency: 'COP', // TODO: Add proper currency mapping
  statuses,
  cryptoNote: 'Treated as intangible asset; capital gains taxed at 10-15% for individuals depending on income (10% <COP 1,800 UVT, 15% >1,800 UVT); income tax up to 39% if business activity (brackets: 0% COP 0-1,090 UVT, 19% 1,091-1,700 UVT, 28% 1,701-4,100 UVT, 33% 4,101-8,670 UVT, 35% 8,671-18,970 UVT, 37% 18,971-31,000 UVT, 39% >31,000 UVT). No distinction for holding periods.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
