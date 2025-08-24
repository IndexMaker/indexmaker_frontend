// lib/tax/switzerland.ts
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
    name: 'Pillar 3a',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed withdrawals (EET).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Pillar 2',
    type: 'taxable',
    fees: 'Tax deferral.',
    penaltyRate: 0,
    thresholdAge: 65,
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

export const switzerland: CountryModule = {
  key: 'switzerland',
  name: 'Switzerland',
  currency: 'CHF', // TODO: Add proper currency mapping
  statuses,
  cryptoNote: 'Exempt from capital gains tax for private investors; wealth tax 0.3-1% annually on holdings depending on canton. Mining/staking taxed as income at 0-40% (federal + cantonal brackets vary, e.g., federal 0% <CHF 18,300, progressive to 11.5% >CHF 895,800; cantons add 0-30%); professional traders pay business income tax up to 40%.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
