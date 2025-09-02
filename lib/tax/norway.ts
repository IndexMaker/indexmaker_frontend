// lib/tax/norway.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Norway tax brackets (from data.json: Flat 22% capital gains; up to 52% for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [217401, 306050, 774800, 1065550, 2225000, Number.POSITIVE_INFINITY],
      rates: [0.22, 0.239, 0.269, 0.359, 0.389, 0.399], // 22% general + bracket tax + municipal avg 22-25%
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.22], // Flat 22% on capital gains
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Norway
    capitalGainsFlatRate: 0.22, // Flat 22% on capital gains
    generalTaxRate: 0.22, // 22% general tax
    municipalTaxRate: 0.235, // Average 22-25% municipal tax (using 23.5% average)
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'ASK',
    type: 'deferred',
    fees: 'Tax-deferred gains.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'IPS',
    type: 'taxfree',
    fees: 'Deduction, tax-free if held to 62.',
    penaltyRate: 0,
    thresholdAge: 62,
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

export const norway: any = {
  key: 'norway',
  name: 'Norway',
  currency: 'NOK', // Norwegian Krone
  statuses,
  cryptoNote: 'Flat 22% on capital gains; no distinction for holding periods. Mining/staking taxed as income at up to 52% (22% general + bracket tax: 1.7% NOK 217,401-306,050, 4.7% 306,051-774,800, 13.7% 774,801-1,065,550, 16.7% 1,065,551-2,225,000, 17.7% >2,225,000; plus municipal avg 22-25%).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
