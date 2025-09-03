// lib/tax/uae.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// UAE tax brackets (from data.json: 0% personal income/capital gains; 5% VAT; 9% corporate tax over AED 375,000)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // 0% personal income tax
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // 0% personal capital gains tax
    },
    stdDed: 0, // No standard deduction (no personal tax)
    niitThresh: 0, // No NIIT in UAE
    vatRate: 0.05, // 5% VAT may apply on goods/services purchased with crypto
    corporateTaxRate: 0.09, // 9% corporate tax on business profits over AED 375,000
    corporateTaxThreshold: 375000, // AED 375,000 threshold for corporate tax
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'End-of-service gratuity',
    type: 'taxfree',
    fees: 'Tax-free.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'DEWS plans',
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

export const uae: any = {
  key: 'uae',
  name: 'UAE',
  currency: 'AED', // UAE Dirham
  statuses,
  cryptoNote: '0%; no personal income or capital gains tax. 5% VAT may apply on goods/services purchased with crypto; corporate tax 9% on business profits over AED 375,000.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
