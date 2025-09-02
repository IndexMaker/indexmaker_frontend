// lib/tax/romania.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Romania tax brackets (from data.json: Flat 10% on gains and mining/staking; 0% exemption ended July 31, 2025)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.10], // Flat 10% on mining/staking as income
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.10], // Flat 10% on capital gains
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Romania
    capitalGainsFlatRate: 0.10, // Flat 10% on capital gains
    exemptionEnded: '2025-07-31', // 0% exemption ended July 31, 2025
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pillar 3 voluntary pensions',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, 10% tax on benefits (EET partial).',
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

export const romania: any = {
  key: 'romania',
  name: 'Romania',
  currency: 'RON', // Romanian Leu
  statuses,
  cryptoNote: 'Flat 10% on gains (after 0% exemption ended July 31, 2025); no distinction for holding periods. Mining/staking taxed as income at 10%.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
