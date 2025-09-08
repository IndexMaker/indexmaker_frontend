// lib/tax/iran.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Iran tax brackets (from data.json: progressive rates up to 35% - 10% up to 5x exemption, 20% excess)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [Number.POSITIVE_INFINITY], // Simplified - 5x annual exemption varies
      rates: [0.35], // Up to 35% progressive rates (10%, 20% brackets)
    },
    lt: null, // No specific capital gains tax mentioned
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Iran
    miningTaxRate: 0.25, // Mining taxed at 25% for businesses
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Pension funds',
    type: 'deferred',
    fees: 'Tax deferral on contributions.',
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

export const iran: any = {
  key: 'iran',
  name: 'Iran',
  currency: 'IRR', // Iranian Rial
  statuses,
  cryptoNote: 'No specific crypto tax framework; treated as asset or business income, taxed at progressive rates up to 35% (brackets: 10% up to 5 times annual exemption, 20% excess). Mining legal and taxed at 25% for businesses; trading regulated but no CGT specified.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
