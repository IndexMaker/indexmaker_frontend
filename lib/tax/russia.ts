// lib/tax/russia.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Russia tax brackets (from data.json: 13% up to 2.4M RUB, 15% above; 25% profit tax for business mining)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [2400000, Number.POSITIVE_INFINITY],
      rates: [0.13, 0.15], // 13% up to 2.4M RUB, 15% above for individuals
    },
    lt: null, // No distinction for holding periods
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Russia
    businessProfitTax: 0.25, // 25% profit tax for business mining
    iiaBenefits: true, // Individual Investment Accounts (IIA) benefits available
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Individual Investment Accounts (IIA)',
    type: 'taxfree',
    fees: 'Type A: deduction up to RUB 52,000; Type B: tax-free gains if held 3 years.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Voluntary long-term savings plan',
    type: 'taxable',
    fees: 'Deduction, government matching up to RUB 36,000/year.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const russia: any = {
  key: 'russia',
  name: 'Russia',
  currency: 'RUB', // Russian Ruble
  statuses,
  cryptoNote: '13% on gains up to 2.4 million RUB; 15% above. No distinction for holding periods; mining taxed at 25% profit tax for businesses.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
