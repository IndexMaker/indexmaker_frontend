// lib/tax/denmark.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Denmark tax brackets (from data.json: 37% up to DKK 600,000, then 52%)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [600000, Number.POSITIVE_INFINITY],
      rates: [0.37, 0.52], // Progressive rates: 37% bottom bracket, 52% top bracket
    },
    lt: null, // No distinction for holding periods
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Denmark
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension plans',
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

export const denmark: any = {
  key: 'denmark',
  name: 'Denmark',
  currency: 'DKK', // Danish Krone
  statuses,
  cryptoNote: 'Progressive 37-52% depending on income bracket (bottom 37% up to DKK 600,000, top 52% >DKK 600,000 incl. labor market tax; share income 27% <DKK 67,500, 42% >DKK 67,500); potential tax on unrealized gains under review. No distinction for holding periods.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
