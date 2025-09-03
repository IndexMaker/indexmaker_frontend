// lib/tax/egypt.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Egypt tax brackets (from data.json: Cryptocurrency is banned; no legal tax rate applies)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Cryptocurrency is banned - no legal tax rate applies
    },
    lt: null, // No capital gains on crypto (banned)
    stdDed: 0, // No standard deduction
    niitThresh: 0, // No NIIT in Egypt
    cryptoBanned: true, // Cryptocurrency is banned in Egypt
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Private pension funds',
    type: 'deferred',
    fees: 'Limited, no capital gains on funds.',
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

export const egypt: any = {
  key: 'egypt',
  name: 'Egypt',
  currency: 'EGP', // Egyptian Pound
  statuses,
  cryptoNote: 'Cryptocurrency is banned; no legal tax rate applies.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
