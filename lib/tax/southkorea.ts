// lib/tax/southkorea.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// South Korea tax brackets (from data.json: No capital gains tax until 2028; 6-45% progressive if over KRW 2.5M threshold starting 2028)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [14000000, 50000000, 88000000, 150000000, 300000000, 500000000, 1000000000, Number.POSITIVE_INFINITY],
      rates: [0.06, 0.15, 0.24, 0.35, 0.38, 0.40, 0.42, 0.45], // Progressive rates for staking/mining as income in KRW
    },
    lt: {
      uppers: [2500000, 14000000, 50000000, 88000000, 150000000, 300000000, 500000000, 1000000000, Number.POSITIVE_INFINITY],
      rates: [0, 0.06, 0.15, 0.24, 0.35, 0.38, 0.40, 0.42, 0.45], // No tax until 2028, then progressive if over KRW 2.5M
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in South Korea
    exemptThreshold: 2500000, // KRW 2.5M threshold
    postponedUntil: '2028-01-01', // Capital gains tax postponed until 2028
    irpBenefits: true, // Individual Retirement Pension (IRP) benefits
    isaBenefits: true, // Individual Savings Account (ISA) benefits
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'IRP',
    type: 'taxfree',
    fees: 'Tax credits on contributions, tax-free if annuity after 55.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'ISA',
    type: 'taxfree',
    fees: 'Tax-free gains up to KRW 200 million lifetime.',
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

export const southkorea: any = {
  key: 'southkorea',
  name: 'South Korea',
  currency: 'KRW', // South Korean Won
  statuses,
  cryptoNote: 'No capital gains tax until 2028 (postponed); gains taxed as other income at 6-45% if over KRW 2.5m threshold starting 2028 (brackets: 6% KRW 14m-50m, 15% 50m-88m, 24% 88m-150m, 35% 150m-300m, 38% 300m-500m, 40% 500m-1b, 45% >1b). Staking/mining taxed as income at progressive rates 6-45%.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
