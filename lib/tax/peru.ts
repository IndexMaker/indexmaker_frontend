// lib/tax/peru.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Peru tax brackets (from data.json: 5% capital gains for non-domiciled; 8-30% progressive for residents)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      // UIT brackets converted to approximate PEN values (1 UIT ≈ PEN 5,150 in 2024)
      uppers: [25750, 103000, 180250, 231750, Number.POSITIVE_INFINITY],
      rates: [0.08, 0.14, 0.17, 0.20, 0.30], // Progressive rates for residents in PEN
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.05], // 5% capital gains for non-domiciled individuals
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Peru
    nonDomiciledRate: 0.05, // 5% for non-domiciled individuals
    uitBased: true, // Tax brackets based on UIT (Unidad Impositiva Tributaria)
    intangibleAsset: true, // Crypto treated as intangible asset
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'SPP',
    type: 'taxable',
    fees: 'Tax-exempt for pension savings (TTE).',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const peru: any = {
  key: 'peru',
  name: 'Peru',
  currency: 'PEN', // Peruvian Sol
  statuses,
  cryptoNote: 'Treated as intangible asset; capital gains taxed at 5% for non-domiciled individuals; income tax up to 30% for residents (brackets: 8% PEN 0-5 UIT, 14% 5-20 UIT, 17% 20-35 UIT, 20% 35-45 UIT, 30% >45 UIT). No distinction for holding periods; mining/staking taxed as income.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
