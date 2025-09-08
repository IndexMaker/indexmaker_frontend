// lib/tax/austria.ts
import type { Brackets, Setup, TaxableParams, CountryModule } from './types';
import { createCountryBrackets, taxIncrement } from './utils/tax-calculations';

// Austria tax brackets (from data.json: 0%, 20%, 30%, 40%, 48%, 50%, 55% + flat 27.5% on capital income)
function getBrackets(): Brackets {
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

/**
 * Custom Austrian tax computation that properly handles crypto vs regular investments
 */
function computeTaxable(params: TaxableParams) {
  const { taxableAmount, brackets } = params;
  const capitalGainsFlatRate = brackets.capitalGainsFlatRate ?? 0.275; // Default to 27.5% if undefined

  // Austria applies flat 27.5% rate to all capital gains (crypto and regular investments)
  const tax = taxableAmount * capitalGainsFlatRate;

  return {
    tax,
    niit: 0 // No NIIT in Austria
  };
}

/**
 * For deferred accounts, everything is taxed as ordinary income using progressive rates
 */
function computeDeferredFull(params: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = params;
  const { ordinary, stdDed } = brackets;

  // Calculate ordinary income tax using progressive brackets
  const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
  const tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);

  return {
    tax,
    niit: 0 // No NIIT in Austria
  };
}

export const austria: CountryModule = {
  key: 'austria',
  name: 'Austria',
  currency: 'EUR',
  statuses,
  cryptoNote: 'Flat 27.5% on capital income from cryptocurrencies; no distinction for holding periods. Mining/staking taxed at progressive rates up to 55% (brackets: 0% €0-€12,816, 20% €12,817-€20,818, 30% €20,819-€34,513, 40% €34,514-€66,612, 48% €66,613-€99,266, 50% €99,267-€1m, 55% >€1m).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
