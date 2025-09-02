// lib/tax/algeria.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Algeria tax brackets (from data.json: Cryptocurrency is banned; no legal tax rate applies)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Cryptocurrency banned - no legal tax rate
    },
    lt: null, // No distinction for holding periods
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Algeria
    cryptoBanned: true, // Cryptocurrency is banned
    legalStatus: 'banned', // No legal tax rate applies
    noCapitalGains: true, // No capital gains for individuals
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Social security pensions',
    type: 'deferred',
    fees: 'No specific advantages; investments 10-35% income tax.',
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

export const algeria: any = {
  key: 'algeria',
  name: 'Algeria',
  currency: 'DZD', // Algerian Dinar
  statuses,
  cryptoNote: 'Cryptocurrency is banned; no legal tax rate applies.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
