// lib/tax/kazakhstan.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Kazakhstan tax brackets (from data.json: 10% for residents, 20% for non-residents; VAT on mining services)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.10], // 10% for residents (gains taxed as income)
    },
    lt: null, // No distinction for holding periods
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Kazakhstan
    residentRate: 0.10, // 10% for residents
    nonResidentRate: 0.20, // 20% for non-residents
    vatOnMining: true, // VAT on mining services
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'UAPF',
    type: 'taxable',
    fees: 'Tax-exempt from 2026.',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Voluntary pension annuities',
    type: 'deferred',
    fees: 'Deduction.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const kazakhstan: any = {
  key: 'kazakhstan',
  name: 'Kazakhstan',
  currency: 'KZT', // Kazakhstani Tenge
  statuses,
  cryptoNote: 'Gains taxed as income at 10% for residents, 20% for non-residents; VAT on mining services. No distinction for holding periods.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
