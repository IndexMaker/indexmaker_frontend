// lib/tax/bangladesh.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Bangladesh tax brackets (from data.json: Cryptocurrency is banned; no legal tax rate applies)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Cryptocurrency banned - no legal tax rate
    },
    lt: null, // No distinction for holding periods
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Bangladesh
    cryptoBanned: true, // Cryptocurrency is banned
    legalStatus: 'banned', // No legal tax rate applies
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Investment tax rebate',
    type: 'taxable',
    fees: 'Rebate on investments in approved instruments.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Universal Pension Scheme',
    type: 'taxfree',
    fees: 'Contributions treated as investment for rebate, pension tax-free.',
    penaltyRate: 0,
    thresholdAge: 60,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const bangladesh: any = {
  key: 'bangladesh',
  name: 'Bangladesh',
  currency: 'BDT', // Bangladeshi Taka
  statuses,
  cryptoNote: 'Cryptocurrency is banned; no legal tax rate applies.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
