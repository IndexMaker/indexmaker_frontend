// lib/tax/philippines.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Philippines tax brackets (from data.json: Progressive capital gains up to 15%; up to 32% for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [250000, 400000, 800000, 2000000, 8000000, Number.POSITIVE_INFINITY],
      rates: [0, 0.15, 0.20, 0.25, 0.30, 0.32], // Progressive rates for mining/staking as income in PHP
    },
    lt: {
      uppers: [100000, 500000, Number.POSITIVE_INFINITY],
      rates: [0.05, 0.10, 0.15], // Progressive capital gains rates
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Philippines
    vatOnServices: true, // Potential VAT on services
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'PERA',
    type: 'taxfree',
    fees: '5% tax credit on contributions, tax-free growth/withdrawals if qualified (TEE).',
    penaltyRate: 0.2,
    thresholdAge: 55,
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

export const philippines: any = {
  key: 'philippines',
  name: 'Philippines',
  currency: 'PHP', // Philippine Peso
  statuses,
  cryptoNote: 'Capital gains tax up to 15% on profits (progressive: 5% PHP 0-100,000, 10% 100,001-500,000, 15% >500,000); no distinction for holding periods. Mining/staking taxed as income at 5-32% (brackets: 0% PHP 0-250,000, 15% 250,001-400,000, 20% 400,001-800,000, 25% 800,001-2m, 30% 2m-8m, 32% >8m); potential VAT on services.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
