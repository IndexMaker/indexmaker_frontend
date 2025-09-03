// lib/tax/poland.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Poland has flat 19% tax rate (from data.json)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.19], // Flat 19% rate on all income
    },
    lt: null, // No long-term capital gains distinction
    stdDed: 0, // No standard deduction mentioned in data.json
    niitThresh: 0, // No NIIT for Poland
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'IKE',
    type: 'taxfree',
    fees: 'Tax-free if held to retirement (TEE).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'IKZE',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, 10% tax on withdrawal.',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'OKI',
    type: 'taxfree',
    fees: 'Tax-free.',
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

export const poland: any = {
  key: 'poland',
  name: 'Poland',
  currency: 'PLN', // Polish Zloty
  statuses,
  cryptoNote: 'Flat 19% on gains and income; no exemptions or distinction for holding periods. Mining/staking taxed at 19%.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
