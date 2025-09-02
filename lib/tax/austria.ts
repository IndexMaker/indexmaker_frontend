// lib/tax/austria.ts
import type { Brackets, CountryModule, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Austria tax brackets (from data.json: 0%, 20%, 30%, 40%, 48%, 50%, 55% + flat 27.5% on capital income)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [12816, 20818, 34513, 66612, 99266, 1000000, Number.POSITIVE_INFINITY],
      rates: [0, 0.20, 0.30, 0.40, 0.48, 0.50, 0.55], // Progressive rates for ordinary income
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.275], // Flat 27.5% on capital income (crypto/investments)
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Austria
    capitalGainsFlatRate: 0.275, // Flat 27.5% on capital gains
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension companies/occupational plans',
    type: 'deferred',
    fees: 'Deductible, exempt growth, taxed benefits at reduced rate (EET).',
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

export const austria: CountryModule = {
  key: 'austria',
  name: 'Austria',
  currency: 'EUR', // TODO: Add proper currency mapping
  statuses,
  cryptoNote: 'Flat 27.5% on capital income from cryptocurrencies; no distinction for holding periods. Mining/staking taxed at progressive rates up to 55% (brackets: 0% €0-€12,816, 20% €12,817-€20,818, 30% €20,819-€34,513, 40% €34,514-€66,612, 48% €66,613-€99,266, 50% €99,267-€1m, 55% >€1m).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
