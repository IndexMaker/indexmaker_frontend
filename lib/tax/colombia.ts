// lib/tax/colombia.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Colombia tax brackets (from data.json: 10-15% capital gains; 0-39% progressive for business activity)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      // UVT brackets converted to approximate COP values (1 UVT ≈ COP 47,065 in 2024)
      uppers: [51300850, 80010500, 192966500, 408053550, 893024050, 1458915000, Number.POSITIVE_INFINITY],
      rates: [0, 0.19, 0.28, 0.33, 0.35, 0.37, 0.39], // Progressive rates for business activity
    },
    lt: {
      uppers: [84717000, Number.POSITIVE_INFINITY], // 1,800 UVT threshold
      rates: [0.10, 0.15], // 10% <1,800 UVT, 15% >1,800 UVT for capital gains
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Colombia
    uvtBased: true, // Tax brackets based on UVT (Unidad de Valor Tributario)
    intangibleAsset: true, // Crypto treated as intangible asset
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Voluntary pension funds',
    type: 'taxfree',
    fees: 'Deductible, tax-free growth, taxed benefits (EET).',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'AFC',
    type: 'taxable',
    fees: 'Tax exemption on savings for housing.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Use shared computation functions
const { computeTaxable, computeDeferredFull } = createDefaultComputeFunctions(getBrackets);

export const colombia: any = {
  key: 'colombia',
  name: 'Colombia',
  currency: 'COP', // Colombian Peso
  statuses,
  cryptoNote: 'Treated as intangible asset; capital gains taxed at 10-15% for individuals depending on income (10% <COP 1,800 UVT, 15% >1,800 UVT); income tax up to 39% if business activity (brackets: 0% COP 0-1,090 UVT, 19% 1,091-1,700 UVT, 28% 1,701-4,100 UVT, 33% 4,101-8,670 UVT, 35% 8,671-18,970 UVT, 37% 18,971-31,000 UVT, 39% >31,000 UVT). No distinction for holding periods.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
