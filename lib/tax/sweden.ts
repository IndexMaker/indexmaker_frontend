// lib/tax/sweden.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Sweden tax brackets (from data.json: Flat 30% capital gains; 32-52% for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [625800, Number.POSITIVE_INFINITY],
      rates: [0.32, 0.52], // Municipal avg 32% + national 20% above SEK 625,800
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.30], // Flat 30% on capital gains
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Sweden
    capitalGainsFlatRate: 0.30, // Flat 30% on capital gains
    municipalTaxRate: 0.32, // Municipal average 32%
    nationalTaxRate: 0.20, // National 20% above SEK 625,800
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'ISK',
    type: 'taxable',
    fees: 'Deemed yield tax ~1.06% (2025), no tax on actual gains.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Pension savings',
    type: 'deferred',
    fees: 'Deduction, taxed benefits.',
    penaltyRate: 0,
    thresholdAge: 55,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const sweden: any = {
  key: 'sweden',
  name: 'Sweden',
  currency: 'SEK', // Swedish Krona
  statuses,
  cryptoNote: 'Flat 30% on capital gains; no distinction for holding periods. Mining/staking taxed as income at 32-52% (municipal + national; national 0% <SEK 625,800, 20% >SEK 625,800; municipal avg 32%).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
