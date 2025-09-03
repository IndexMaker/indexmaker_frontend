// lib/tax/argentina.ts
import type { Brackets, Setup } from './types';
import { createCountryBrackets, createDefaultComputeFunctions } from './utils/tax-calculations';

// Argentina tax brackets (from data.json: 15% capital gains; 25-35% progressive for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [101679575, 1016795752, Number.POSITIVE_INFINITY],
      rates: [0.25, 0.30, 0.35], // Progressive rates for mining/staking as income in ARS
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.15], // 15% capital gains tax
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Argentina
    capitalGainsFlatRate: 0.15, // 15% capital gains tax
    declarationDeadline: '2025-03-31', // Assets declared before March 31, 2025 exempt on holdings
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'Foreign pensions',
    type: 'deferred',
    fees: 'Not taxed.',
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

export const argentina: any = {
  key: 'argentina',
  name: 'Argentina',
  currency: 'ARS', // Argentine Peso
  statuses,
  cryptoNote: 'Capital gains taxed at 15%; assets declared before March 31, 2025, taxed only on gains (exempt on holdings). No distinction for holding periods; mining/staking taxed as income at up to 35% (brackets: 25% ARS 0-101,679,575, 30% 101,679,576-1,016,795,752, 35% >1,016,795,752).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
