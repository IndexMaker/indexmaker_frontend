// lib/tax/malaysia.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Malaysia tax brackets (from data.json: 0% for occasional investors, 0-30% for regular trading)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [5000, 20000, 35000, 50000, 70000, 100000, 400000, 600000, 1000000, Number.POSITIVE_INFINITY],
      rates: [0, 0.01, 0.03, 0.06, 0.11, 0.19, 0.25, 0.26, 0.28, 0.30], // Progressive rates in MYR
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // 0% for occasional investors (no capital gains tax)
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Malaysia
    occasionalInvestorRate: 0, // 0% for occasional investors
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'PRS',
    type: 'taxfree',
    fees: 'Relief up to RM3,000, tax-free growth, taxed withdrawals at 8% (EET partial).',
    penaltyRate: 0.08,
    thresholdAge: 55,
  },
  {
    name: 'EPF',
    type: 'taxable',
    fees: 'Tax-exempt.',
    penaltyRate: 0,
    thresholdAge: 55,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const malaysia: any = {
  key: 'malaysia',
  name: 'Malaysia',
  currency: 'MYR', // Malaysian Ringgit
  statuses,
  cryptoNote: '0% for occasional investors (no capital gains tax); income tax at 0-30% if regular trading or business (brackets: 0% MYR 0-5,000, 1% 5,001-20,000, 3% 20,001-35,000, 6% 35,001-50,000, 11% 50,001-70,000, 19% 70,001-100,000, 25% 100,001-400,000, 26% 400,001-600,000, 28% 600,001-1m, 30% >1m). No distinction for holding periods.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
