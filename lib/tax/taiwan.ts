// lib/tax/taiwan.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Taiwan tax brackets (from data.json: Progressive 5-40% rates; 0.1% securities transaction tax may apply)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [560000, 1260000, 2800000, 5600000, Number.POSITIVE_INFINITY],
      rates: [0.05, 0.12, 0.20, 0.30, 0.40], // Progressive rates for gains/mining/staking as income in TWD
    },
    lt: null, // No specific capital gains tax distinction
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Taiwan
    securitiesTransactionTax: 0.001, // 0.1% securities transaction tax may apply if classified as securities
    treatedAsProperty: true, // Treated as property
    laborPensionBenefits: true, // Labor Pension Fund benefits available
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Labor Pension Fund',
    type: 'deferred',
    fees: 'Tax-deferred contributions/growth, taxed benefits (EET).',
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

export const taiwan: any = {
  key: 'taiwan',
  name: 'Taiwan',
  currency: 'TWD', // New Taiwan Dollar
  statuses,
  cryptoNote: 'Treated as property; gains taxed as income at progressive rates 5-40% (brackets: 5% NTD 0-560,000, 12% 560,001-1,260,000, 20% 1,260,001-2,800,000, 30% 2,800,001-5,600,000, 40% >5,600,000). No specific capital gains tax; 0.1% securities transaction tax may apply if classified as securities. Mining/staking taxed as income.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
