// lib/tax/mexico.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Mexico tax brackets (from data.json: 1.92-35% progressive; 10% provisional withholding on exchanges)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [8952.49, 75984.55, 133536.07, 155229.8, 185852.57, 289305.2, 346235.3, 1020308.74, 1360411.65, 4081234.95, Number.POSITIVE_INFINITY],
      rates: [0.0192, 0.064, 0.1088, 0.16, 0.1792, 0.2136, 0.2352, 0.30, 0.32, 0.34, 0.35], // Progressive rates in MXN
    },
    lt: null, // No distinction for holding periods
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Mexico
    provisionalWithholding: 0.10, // 10% provisional withholding on exchanges
    miscellaneousIncome: true, // Treated as miscellaneous income
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Afores',
    type: 'taxfree',
    fees: 'Deductible voluntary, tax-free growth, taxed withdrawals (EET).',
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

export const mexico: any = {
  key: 'mexico',
  name: 'Mexico',
  currency: 'MXN', // Mexican Peso
  statuses,
  cryptoNote: 'Treated as miscellaneous income; progressive income tax 1.92-35% (brackets: 1.92% MXN 0.01-8,952.49, 6.4% 8,952.5-75,984.55, 10.88% 75,984.56-133,536.07, 16% 133,536.08-155,229.8, 17.92% 155,229.81-185,852.57, 21.36% 185,852.58-289,305.2, 23.52% 289,305.21-346,235.3, 30% 346,235.31-1,020,308.74, 32% 1,020,308.75-1,360,411.65, 34% 1,360,411.66-4,081,234.95, 35% over 4,081,234.96) with 10% provisional withholding on exchanges. No distinction for holding periods; mining/staking taxed as income at same rates.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
