// lib/tax/usa.ts
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

/**
 * Incremental tax from adding `delta` to a base taxable amount `baseTaxable`.
 * Critical fix: apply max(0, ·) to BOTH the before and after amounts,
 * not to `baseTaxable` alone. This preserves unused standard deduction.
 */
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

function computeUSLTCGTax(
  ordinaryTaxable: number,
  ltGain: number,
  ltUppers: readonly number[],
  ltRates: readonly number[]
) {
  let tax = 0,
    income = Math.max(0, ordinaryTaxable),
    remaining = Math.max(0, ltGain);
  for (let i = 0; i < ltUppers.length && remaining > 0; i++) {
    const bandUpper = ltUppers[i];
    const room = Math.max(0, bandUpper - income);
    const take = Math.min(remaining, room);
    tax += take * ltRates[i];
    remaining -= take;
    income += take;
  }
  return tax;
}

const statuses = ['single', 'married'];
function getBrackets(status: string): any {
  const isSingle = status === 'single';
  return {
    ordinary: {
      uppers: isSingle
        ? [11925, 48535, 103350, 197300, 250525, 626350, Number.POSITIVE_INFINITY]
        : [23850, 97070, 206700, 394600, 501050, 751600, Number.POSITIVE_INFINITY],
      rates: [0.1, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37],
    },
    lt: {
      uppers: isSingle ? [48350, 533400, Number.POSITIVE_INFINITY] : [96700, 600050, Number.POSITIVE_INFINITY],
      rates: [0, 0.15, 0.2],
    },
    stdDed: isSingle ? 15000 : 30000,
    niitThresh: isSingle ? 200000 : 250000,
  };
}

const setups: Setup[] = [
  {
    name: 'Traditional IRA',
    type: 'deferred',
    fees: 'Deductible contributions (income limits: USD 77,000-87,000 single, USD 123,000-143,000 married), tax-deferred growth, taxed withdrawals (EET).',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: 'Roth IRA',
    type: 'taxfree',
    fees: 'After-tax, tax-free growth and qualified withdrawals (TEE). No RMDs.',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: '401k Traditional',
    type: 'deferred',
    fees: 'Pre-tax contributions deductible, tax-deferred growth, taxed on withdrawal (EET).',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: '401k Roth',
    type: 'taxfree',
    fees: 'After-tax contributions, tax-free growth and qualified withdrawals (TEE).',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: 'Taxable',
    type: 'taxable',
    fees: 'No contribution limits, taxed on dividends/gains, step-up basis at death.',
    penaltyRate: 0,
    thresholdAge: 0,
  },
];

function computeTaxable(p: TaxableParams): { readonly tax: number; readonly niit: number } {
  const { agiExcl, taxableAmount, isLong, brackets, isCrypto } = p;
  const { ordinary, lt, stdDed, niitThresh } = brackets;

  // Simplified calculation for basic functionality
  const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
  
  let tax = 0;
  let niit = 0;

  if (isLong && !isCrypto && lt) {
    // Long-term capital gains
    tax = computeUSLTCGTax(ordinaryTaxable, taxableAmount, lt.uppers, lt.rates);
  } else {
    // Ordinary income or short-term gains
    tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);
  }

  // NIIT calculation (simplified)
  const totalIncome = agiExcl + taxableAmount;
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

export const usa: any = {
  key: 'usa',
  name: 'United States',
  currency: 'USD',
  statuses,
  cryptoNote: 'Crypto gains taxed as capital gains (short-term as ordinary income, long-term preferential rates).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
