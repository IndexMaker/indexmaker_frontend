// lib/tax/thailand.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Thailand tax brackets (from data.json: Capital gains exempt until Dec 31, 2029; 0-35% for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [150000, 300000, 500000, 750000, 1000000, 2000000, 5000000, Number.POSITIVE_INFINITY],
      rates: [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35], // Progressive rates for mining/staking in THB
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Capital gains exempt until December 31, 2029 (on licensed platforms)
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Thailand
    capitalGainsExemptUntil: '2029-12-31', // Capital gains exempt until this date
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'RMF',
    type: 'deferred',
    fees: 'Deductible, taxed benefits (EET).',
    penaltyRate: 0.03,
    thresholdAge: 55,
  },
  {
    name: 'Thai ESG',
    type: 'deferred',
    fees: 'Deductible.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'SSF',
    type: 'deferred',
    fees: 'Deductible.',
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

export const thailand: any = {
  key: 'thailand',
  name: 'Thailand',
  currency: 'THB', // Thai Baht
  statuses,
  cryptoNote: 'Capital gains exempt until December 31, 2029 (for trades on licensed platforms); income tax on mining/staking at progressive rates 0-35% (brackets: 0% THB 0-150,000, 5% 150,001-300,000, 10% 300,001-500,000, 15% 500,001-750,000, 20% 750,001-1m, 25% 1m-2m, 30% 2m-5m, 35% >5m).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
