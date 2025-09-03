// lib/tax/indonesia.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Indonesia tax brackets (from data.json: 5%, 15%, 25%, 30%, 35% progressive rates)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [60000000, 250000000, 500000000, 5000000000, Number.POSITIVE_INFINITY],
      rates: [0.05, 0.15, 0.25, 0.30, 0.35], // Progressive rates in IDR
    },
    lt: null, // Capital gains taxed as income
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Indonesia
    transactionTax: 0.0021, // 0.21% final income tax on transaction value
    vatRate: 0.0011, // 0.11% VAT on mining and exchange services
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Voluntary pension funds',
    type: 'deferred',
    fees: 'Contributions and income tax-exempt, withdrawals taxed (EET).',
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

export const indonesia: any = {
  key: 'indonesia',
  name: 'Indonesia',
  currency: 'IDR', // Indonesian Rupiah
  statuses,
  cryptoNote: 'Capital gains taxed as income at progressive rates 5-35% (brackets: 5% IDR 0-60m, 15% 60m-250m, 25% 250m-500m, 30% 500m-5b, 35% >5b); 0.21% final income tax on transaction value; 0.11% VAT on mining and exchange services (VAT exempt on asset sales).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
