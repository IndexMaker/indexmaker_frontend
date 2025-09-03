// lib/tax/spain.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Spain tax brackets (from data.json: 19-28% capital gains; up to 47% for mining/staking; exempt under €1,000/year)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [12450, 20200, 35200, 60000, 300000, Number.POSITIVE_INFINITY],
      rates: [0.19, 0.24, 0.30, 0.37, 0.45, 0.47], // Progressive rates for mining/staking as income
    },
    lt: {
      uppers: [6000, 50000, 200000, 300000, Number.POSITIVE_INFINITY],
      rates: [0.19, 0.21, 0.23, 0.27, 0.28], // Progressive capital gains rates
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Spain
    exemptThreshold: 1000, // Exempt under €1,000/year
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension plans',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed withdrawals (EET).',
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

export const spain: any = {
  key: 'spain',
  name: 'Spain',
  currency: 'EUR', // Euro
  statuses,
  cryptoNote: 'Progressive 19-28% (19% up to €6,000, 21% €6,000-50,000, 23% €50,000-200,000, 27% €200,000-300,000, 28% over €300,000); exempt under €1,000/year. No distinction for holding periods; mining/staking taxed at up to 47% (income brackets: 19% €0-€12,450, 24% €12,451-€20,200, 30% €20,201-€35,200, 37% €35,201-€60,000, 45% €60,001-€300,000, 47% >€300,000).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
