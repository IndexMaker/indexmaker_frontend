// lib/tax/pakistan.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Pakistan tax brackets (from data.json: 15% capital gains + CVT 0-15%; up to 45% progressive for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [600000, 1200000, 2400000, 3600000, 4800000, 6000000, 7200000, 12000000, Number.POSITIVE_INFINITY],
      rates: [0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.45], // Progressive rates for mining/staking as income in PKR
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.15], // 15% capital gains tax
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Pakistan
    capitalGainsFlatRate: 0.15, // 15% capital gains tax
    cvtRate: 0.15, // Capital Value Tax (CVT) 0-15% depending on holding period and value
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'VPS',
    type: 'taxfree',
    fees: 'Tax credit up to 20%, tax-free growth, taxed withdrawals (EET).',
    penaltyRate: 0,
    thresholdAge: 65,
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

export const pakistan: any = {
  key: 'pakistan',
  name: 'Pakistan',
  currency: 'PKR', // Pakistani Rupee
  statuses,
  cryptoNote: 'Capital gains tax at 15% on profits; potential Capital Value Tax (CVT) 0-15% depending on holding period and value. Mining/staking taxed as income at up to 45% (brackets: 0% PKR 0-600,000, 5% 600,001-1,200,000, 10% 1,200,001-2,400,000, 15% 2,400,001-3,600,000, 20% 3,600,001-4,800,000, 25% 4,800,001-6,000,000, 30% 6,000,001-7,200,000, 35% 7,200,001-12,000,000, 40% >12,000,000).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
