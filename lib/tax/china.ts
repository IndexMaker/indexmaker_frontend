// lib/tax/china.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// China tax brackets (from data.json: Cryptocurrency is banned; no legal tax rate applies)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Cryptocurrency is banned - no legal tax rate applies
    },
    lt: null, // No capital gains on crypto (banned)
    stdDed: 0, // No standard deduction
    niitThresh: 0, // No NIIT in China
    cryptoBanned: true, // Cryptocurrency is banned in China
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Voluntary personal pension system',
    type: 'deferred',
    fees: 'Tax deduction up to CNY 12,000, tax-exempt returns, benefits taxed at 3% (EET).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Enterprise annuities',
    type: 'taxable',
    fees: 'Tax benefits vary',
    penaltyRate: 0,
    thresholdAge: 65,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const china: any = {
  key: 'china',
  name: 'China',
  currency: 'CNY', // Chinese Yuan
  statuses,
  cryptoNote: 'Cryptocurrency is banned; no legal tax rate applies.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
