// lib/tax/singapore.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Singapore tax brackets (from data.json: 0%, 2%, 3.5%, 7%, 12%, 16%, 19%, 20%, 21%, 22%)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [20000, 30000, 40000, 80000, 120000, 160000, 200000, 240000, 280000, Number.POSITIVE_INFINITY],
      rates: [0, 0.02, 0.035, 0.07, 0.12, 0.16, 0.19, 0.20, 0.21, 0.22], // Singapore progressive rates
    },
    lt: null, // 0% capital gains tax for individual investors
    stdDed: 0, // No standard deduction in Singapore
    niitThresh: 0, // No NIIT in Singapore
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'CPF',
    type: 'taxfree',
    fees: 'Tax-exempt contributions/growth/withdrawals (TEE).',
    penaltyRate: 0,
    thresholdAge: 55,
  },
  {
    name: 'SRS',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, 50% taxable withdrawals.',
    penaltyRate: 0.05,
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

export const singapore: any = {
  key: 'singapore',
  name: 'Singapore',
  currency: 'SGD', // Singapore Dollar
  statuses,
  cryptoNote: '0% capital gains tax for individual investors; income tax up to 22% if frequent trading or business activity (brackets: 0% SGD 0-20,000, 2% 20,001-30,000, 3.5% 30,001-40,000, 7% 40,001-80,000, 12% 80,001-120,000, 16% 120,001-160,000, 19% 160,001-200,000, 20% 200,001-240,000, 21% 240,001-280,000, 22% >280,000). 8% GST on purchases; no distinction for holding periods.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
