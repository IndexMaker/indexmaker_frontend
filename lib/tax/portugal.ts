// lib/tax/portugal.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Portugal tax brackets (from data.json: 28% short-term gains; tax-free if held >1 year; 14.5-53% progressive for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [8500, 11623, 16472, 21321, 27146, 39791, 51997, 78834, 250000, Number.POSITIVE_INFINITY],
      rates: [0.145, 0.23, 0.265, 0.285, 0.345, 0.37, 0.43, 0.46, 0.48, 0.53], // Progressive rates for mining/staking
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Tax-free if held over 1 year
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Portugal
    shortTermRate: 0.28, // 28% on short-term gains (held less than 1 year)
    longTermHoldingPeriod: 1, // 1 year for tax-free treatment
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'PPR',
    type: 'taxfree',
    fees: 'Tax-free if held 5 years.',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Pension funds',
    type: 'deferred',
    fees: 'Deductible, reduced tax after 8 years (17.5% 0-5 years, 14% 5-8 years, 7% >8 years).',
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

export const portugal: any = {
  key: 'portugal',
  name: 'Portugal',
  currency: 'EUR', // Euro
  statuses,
  cryptoNote: '28% on short-term gains (held less than 1 year); tax-free if held over 1 year. Staking/mining taxed as income at 14.5-53% progressive (brackets: 14.5% €0-€8,500, 23% €8,501-€11,623, 26.5% €11,624-€16,472, 28.5% €16,473-€21,321, 34.5% €21,322-€27,146, 37% €27,147-€39,791, 43% €39,792-€51,997, 46% €51,998-€78,834, 48% €78,835-€250,000, 53% >€250,000).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
