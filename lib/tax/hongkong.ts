// lib/tax/hongkong.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Hong Kong SAR tax brackets (from data.json: 2%, 6%, 10%, 14%, 17%)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [50000, 100000, 150000, 200000, Number.POSITIVE_INFINITY],
      rates: [0.02, 0.06, 0.10, 0.14, 0.17], // HK progressive rates from data.json
    },
    lt: null, // No long-term capital gains distinction
    stdDed: 0, // No standard deduction in Hong Kong
    niitThresh: 0, // No NIIT in Hong Kong
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'MPF',
    type: 'taxfree',
    fees: 'Deductible up to HKD 18,000, tax-free growth/withdrawals (TEE).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'ORSO',
    type: 'taxable',
    fees: 'Tax relief on contributions.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const hongkong: any = {
  key: 'hongkong',
  name: 'Hong Kong SAR',
  currency: 'HKD', // Hong Kong Dollar
  statuses,
  cryptoNote: 'Exempt from taxation for long-term investments; income tax up to 17% if professional trading or business (brackets: 2% HKD 0-50,000, 6% 50,001-100,000, 10% 100,001-150,000, 14% 150,001-200,000, 17% >200,000).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
