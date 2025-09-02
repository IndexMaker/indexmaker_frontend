// lib/tax/belgium.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Belgium tax brackets (from data.json: 25%, 40%, 45%, 50% + 0% for normal investment, 33% speculative)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [15820, 27920, 50000, Number.POSITIVE_INFINITY],
      rates: [0.25, 0.40, 0.45, 0.50], // Progressive income tax rates
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // 0% for normal private investment ('good family man' profile)
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Belgium
    speculativeTaxRate: 0.33, // 33% for speculative activity
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension savings plans',
    type: 'deferred',
    fees: 'Tax credit 25-30%, benefits taxed 8-10% (EET partial).',
    penaltyRate: 0,
    thresholdAge: 60,
  },
  {
    name: 'Long-term savings insurance',
    type: 'taxable',
    fees: 'Tax relief on premiums.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const belgium: any = {
  key: 'belgium',
  name: 'Belgium',
  currency: 'EUR', // TODO: Add proper currency mapping
  statuses,
  cryptoNote: '0% for normal private investment (\'good family man\' profile); 33% for speculative activity; up to 50% for professional traders (income tax rates, brackets: 25% €0-€15,820, 40% €15,821-€27,920, 45% €27,921-€50,000, 50% >€50,000). No distinction for holding periods; mining/staking taxed based on profile. New 10% capital gains tax on financial assets including crypto starts January 2026.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
