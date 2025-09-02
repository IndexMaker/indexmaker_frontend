// lib/tax/switzerland.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Switzerland tax brackets (from data.json: Exempt capital gains for private investors; wealth tax 0.3-1%; mining/staking 0-40%)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [18300, 31600, 41400, 55200, 72500, 78100, 103600, 134600, 176000, 755200, 895800, Number.POSITIVE_INFINITY],
      rates: [0, 0.0077, 0.0088, 0.022, 0.025, 0.0275, 0.055, 0.066, 0.088, 0.11, 0.1133, 0.115], // Federal rates + cantonal (0-30%)
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Exempt from capital gains tax for private investors
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Switzerland
    wealthTaxRate: 0.01, // Wealth tax 0.3-1% annually (using 1% average)
    professionalTraderRate: 0.40, // Professional traders pay business income tax up to 40%
    pillar3aBenefits: true, // Pillar 3a retirement benefits
    pillar2Benefits: true, // Pillar 2 pension benefits
    cantonalVariation: true, // Cantonal tax rates vary 0-30%
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pillar 3a',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed withdrawals (EET).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Pillar 2',
    type: 'taxable',
    fees: 'Tax deferral.',
    penaltyRate: 0,
    thresholdAge: 65,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const switzerland: any = {
  key: 'switzerland',
  name: 'Switzerland',
  currency: 'CHF', // Swiss Franc
  statuses,
  cryptoNote: 'Exempt from capital gains tax for private investors; wealth tax 0.3-1% annually on holdings depending on canton. Mining/staking taxed as income at 0-40% (federal + cantonal brackets vary, e.g., federal 0% <CHF 18,300, progressive to 11.5% >CHF 895,800; cantons add 0-30%); professional traders pay business income tax up to 40%.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
