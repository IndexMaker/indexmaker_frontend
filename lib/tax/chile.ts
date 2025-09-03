// lib/tax/chile.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Chile tax brackets (from data.json: 0-40% progressive Global Complementary Tax; 35% Additional Tax for non-residents)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      // UTA brackets converted to approximate CLP values (1 UTA ≈ CLP 64,000 in 2024)
      uppers: [864000, 1920000, 3200000, 4480000, 5760000, 7680000, 19840000, Number.POSITIVE_INFINITY],
      rates: [0, 0.04, 0.08, 0.135, 0.23, 0.32, 0.35, 0.40], // Global Complementary Tax progressive rates
    },
    lt: null, // No distinction for holding periods
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Chile
    nonResidentRate: 0.35, // 35% Additional Tax for non-residents
    utaBased: true, // Tax brackets based on UTA (Unidad Tributaria Anual)
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'APV',
    type: 'taxfree',
    fees: 'Deduction or state subsidy, tax-free growth, taxed benefits (EET).',
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

export const chile: any = {
  key: 'chile',
  name: 'Chile',
  currency: 'CLP', // Chilean Peso
  statuses,
  cryptoNote: 'Profits taxed as income under Global Complementary Tax 0-40% progressive (brackets: 0% CLP 0-13.5 UTA, 4% 13.5-30 UTA, 8% 30-50 UTA, 13.5% 50-70 UTA, 23% 70-90 UTA, 32% 90-120 UTA, 35% 120-310 UTA, 40% >310 UTA) or Additional Tax for non-residents (35%). No distinction for holding periods; mining/staking taxed as business income.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
