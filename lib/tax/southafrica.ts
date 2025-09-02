// lib/tax/southafrica.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// South Africa tax brackets (from data.json: Capital gains tax with 40% inclusion, effective 0-18%; 18-45% for trading/mining)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [237100, 370500, 512800, 673000, 857900, Number.POSITIVE_INFINITY],
      rates: [0.18, 0.26, 0.31, 0.36, 0.41, 0.45], // Progressive rates for trading/mining as income in ZAR
    },
    lt: {
      uppers: [237100, 370500, 512800, 673000, 857900, Number.POSITIVE_INFINITY],
      rates: [0.072, 0.104, 0.124, 0.144, 0.164, 0.18], // 40% inclusion rate: effective rates 0-18%
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in South Africa
    annualExclusion: 40000, // R40,000 annual exclusion
    inclusionRate: 0.40, // 40% inclusion rate for capital gains
    intangibleAsset: true, // Treated as intangible assets
    lossCarryForward: true, // Losses carry forward
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'TFSA',
    type: 'taxfree',
    fees: 'Tax-free (TEE).',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Retirement Annuity',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed benefits (EET).',
    penaltyRate: 0,
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

export const southafrica: any = {
  key: 'southafrica',
  name: 'South Africa',
  currency: 'ZAR', // South African Rand
  statuses,
  cryptoNote: 'Treated as intangible assets; capital gains tax with 40% inclusion in income, effective rate 0-18% (marginal rates: 18% ZAR 0-237,100, 26% 237,101-370,500, 31% 370,501-512,800, 36% 512,801-673,000, 41% 673,001-857,900, 45% >857,900); annual exclusion R40,000. Income tax at 18-45% if trading/mining; no distinction for holding periods but losses carry forward.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
