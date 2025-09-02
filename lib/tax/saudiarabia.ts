// lib/tax/saudiarabia.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Saudi Arabia tax brackets (from data.json: Exempt from taxation; no income or capital gains tax on crypto)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Exempt from taxation - no income tax
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // No capital gains tax on crypto
    },
    stdDed: 0, // No standard deduction (no personal tax)
    niitThresh: 0, // No NIIT in Saudi Arabia
    taxExempt: true, // Exempt from taxation
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'End-of-service benefits',
    type: 'taxfree',
    fees: 'Tax-free.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Voluntary savings plans',
    type: 'taxfree',
    fees: 'Tax-free.',
    penaltyRate: 0,
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

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const saudiarabia: any = {
  key: 'saudiarabia',
  name: 'Saudi Arabia',
  currency: 'SAR', // Saudi Riyal
  statuses,
  cryptoNote: 'Exempt from taxation; no income or capital gains tax on crypto.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
