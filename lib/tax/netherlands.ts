// lib/tax/netherlands.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Netherlands tax brackets (from data.json: Wealth tax under Box 3 at up to 36% on deemed yield)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.36], // Up to 36% wealth tax on deemed yield (Box 3)
    },
    lt: null, // No capital gains tax - wealth tax applies instead
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Netherlands
    wealthTaxRate: 0.36, // Wealth tax under Box 3 at up to 36%
    deemedYieldBased: true, // Tax based on deemed yield, not actual gains
    box3System: true, // Netherlands Box 3 wealth tax system
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension plans (Box 1)',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed benefits (EET).',
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

export const netherlands: any = {
  key: 'netherlands',
  name: 'Netherlands',
  currency: 'EUR', // Euro
  statuses,
  cryptoNote: 'Wealth tax under Box 3 at up to 36% on deemed yield (assumed return on asset value, not actual gains). No capital gains tax; mining/staking included in wealth calculation.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
