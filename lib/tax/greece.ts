// lib/tax/greece.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Greece tax brackets (from data.json: Flat 15% capital gains; 9-44% progressive for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [10000, 20000, 30000, 40000, Number.POSITIVE_INFINITY],
      rates: [0.09, 0.22, 0.28, 0.36, 0.44], // Progressive rates for mining/staking as income
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.15], // Flat 15% on capital gains
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Greece
    capitalGainsFlatRate: 0.15, // Flat 15% on capital gains
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Voluntary occupational funds',
    type: 'taxable',
    fees: 'Contributions excluded, reduced tax on benefits 5-20%.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const greece: any = {
  key: 'greece',
  name: 'Greece',
  currency: 'EUR', // Euro
  statuses,
  cryptoNote: 'Flat 15% on capital gains; no exemptions or distinction for holding periods. Mining/staking taxed as income at 9-44% (brackets: 9% €0-10,000, 22% 10,001-20,000, 28% 20,001-30,000, 36% 30,001-40,000, 44% >40,000).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
