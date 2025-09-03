// lib/tax/finland.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Finland tax brackets (from data.json: 30% capital gains up to €30,000, then 34%)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.44], // Up to 44% for mining/staking (progressive state + municipal)
    },
    lt: {
      uppers: [30000, Number.POSITIVE_INFINITY],
      rates: [0.30, 0.34], // Capital gains: 30% up to €30,000, 34% above
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Finland
    exemptThreshold: 1000, // Exempt under €1,000/year
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Voluntary pension insurance',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed benefits (EET).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'PS-savings accounts',
    type: 'taxable',
    fees: 'Tax on dividends/gains deferred.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const finland: any = {
  key: 'finland',
  name: 'Finland',
  currency: 'EUR', // Euro
  statuses,
  cryptoNote: 'Progressive capital gains 30-34% (30% up to €30,000, 34% above); exempt under €1,000/year. No distinction for holding periods; mining/staking taxed as income at up to 44% (progressive state + municipal avg 20%, total 5.5-31.25% state + municipal).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
