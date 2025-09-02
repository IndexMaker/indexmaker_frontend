// lib/tax/czechrepublic.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Czech Republic tax brackets (from data.json: Tax-free if held >3 years; otherwise 15-23% progressive; exempt under CZK 30,800/year)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [2000000, Number.POSITIVE_INFINITY], // ~€80,000 equivalent in CZK
      rates: [0.15, 0.23], // 15% up to €80,000 equivalent, 23% above
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Tax-free if held more than 3 years
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Czech Republic
    exemptThreshold: 30800, // Exempt under CZK 30,800/year
    longTermHoldingPeriod: 3, // 3 years for tax-free treatment
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'DIP',
    type: 'taxfree',
    fees: 'Deduction, tax-free if held 10 years (TEE).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Pension insurance',
    type: 'deferred',
    fees: 'State matching.',
    penaltyRate: 0,
    thresholdAge: 60,
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

export const czechrepublic: any = {
  key: 'czechrepublic',
  name: 'Czech Republic',
  currency: 'CZK', // Czech Koruna
  statuses,
  cryptoNote: 'Tax-free if held more than 3 years; otherwise progressive 15-23% (15% up to €80,000 equivalent, 23% above); exempt under CZK 30,800/year. Mining/staking taxed as income.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
