// lib/tax/iraq.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Iraq tax brackets (from data.json: Cryptocurrency is banned; no legal tax rate applies)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Cryptocurrency is banned - no legal tax rate applies
    },
    lt: null, // No capital gains on crypto (banned)
    stdDed: 0, // No standard deduction
    niitThresh: 0, // No NIIT in Iraq
    cryptoBanned: true, // Cryptocurrency is banned in Iraq
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
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'No withdrawal restrictions',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const iraq: any = {
  key: 'iraq',
  name: 'Iraq',
  currency: 'IQD', // Iraqi Dinar
  statuses,
  cryptoNote: 'Cryptocurrency is banned; no legal tax rate applies.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
