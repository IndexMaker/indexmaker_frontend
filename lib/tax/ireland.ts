// lib/tax/ireland.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Ireland tax brackets (from data.json: Flat 33% capital gains; up to 52% for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [42000, Number.POSITIVE_INFINITY],
      rates: [0.52, 0.52], // Up to 52% (20% standard + 40% higher + USC/PRSI up to 12%)
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.33], // Flat 33% on capital gains
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Ireland
    capitalGainsFlatRate: 0.33, // Flat 33% on capital gains
    standardRate: 0.20, // 20% standard rate up to €42,000
    higherRate: 0.40, // 40% higher rate above €42,000
    uscPrsiRate: 0.12, // USC/PRSI up to 12%
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension plans',
    type: 'taxfree',
    fees: 'Relief at marginal rate, tax-free growth, 25% tax-free lump sum (EET partial).',
    penaltyRate: 0,
    thresholdAge: 50,
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

export const ireland: any = {
  key: 'ireland',
  name: 'Ireland',
  currency: 'EUR', // Euro
  statuses,
  cryptoNote: 'Flat 33% on capital gains; no exemptions or distinction for holding periods. Mining/staking taxed as income at up to 52% (standard 20% €0-€42,000, higher 40% >€42,000 + USC/PRSI up to 12%).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
