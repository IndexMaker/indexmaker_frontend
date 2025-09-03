// lib/tax/israel.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Israel tax brackets (from data.json: 25% capital gains; up to 50% progressive for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [7010, 10060, 16150, 22870, 50000, Number.POSITIVE_INFINITY],
      rates: [0.10, 0.14, 0.20, 0.31, 0.47, 0.50], // Progressive rates for mining/staking as business income in ILS
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.25], // 25% capital gains tax
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Israel
    capitalGainsFlatRate: 0.25, // 25% capital gains tax
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension funds',
    type: 'taxfree',
    fees: 'Tax credit, tax-free growth, annuity tax-free (EET partial).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Keren Hishtalmut',
    type: 'taxfree',
    fees: 'Tax-free after 6 years.',
    penaltyRate: 0,
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

export const israel: any = {
  key: 'israel',
  name: 'Israel',
  currency: 'ILS', // Israeli Shekel
  statuses,
  cryptoNote: 'Capital gains tax at 25%; no distinction for holding periods. Mining/staking taxed as business income at up to 50% (brackets: 10% ILS 0-7,010, 14% 7,011-10,060, 20% 10,061-16,150, 31% 16,151-22,870, 47% 22,871-50,000, 50% >50,000).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
