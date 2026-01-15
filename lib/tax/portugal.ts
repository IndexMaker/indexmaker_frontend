// lib/tax/portugal.ts
import type { Brackets, Setup, TaxableParams, CalcOut, TaxParams } from './types';
import { createCountryBrackets, taxIncrement } from './utils/tax-calculations';

// Portugal tax brackets (from data.json: 28% short-term gains; tax-free if held >1 year; 14.5-53% progressive for mining/staking)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [8500, 11623, 16472, 21321, 27146, 39791, 51997, 78834, 250000, Number.POSITIVE_INFINITY],
      rates: [0.145, 0.23, 0.265, 0.285, 0.345, 0.37, 0.43, 0.46, 0.48, 0.53], // Progressive rates for mining/staking
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0], // Tax-free if held over 1 year
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in Portugal
    shortTermRate: 0.28, // 28% on short-term gains (held less than 1 year)
    longTermHoldingPeriod: 1, // 1 year for tax-free treatment
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'PPR',
    type: 'taxfree',
    fees: 'Tax-free if held 5 years.',
    penaltyRate: 0,
    thresholdAge: 65,
  },
  {
    name: 'Pension funds',
    type: 'deferred',
    fees: 'Deductible, reduced tax after 8 years (17.5% 0-5 years, 14% 5-8 years, 7% >8 years).',
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

// Custom computation functions for Portugal's unique crypto tax rules
function computeTaxable(p: TaxableParams) {
  const { agiExcl, taxableAmount, isLong, brackets, isCrypto, years } = p;

  let tax = 0;

  if (isCrypto) {
    // Portugal crypto rules:
    // - Tax-free if held over 1 year
    // - 28% flat rate if held less than 1 year
    const holdingPeriod = (brackets as any).longTermHoldingPeriod ?? 1;
    if (isLong && years >= holdingPeriod) {
      tax = 0; // Tax-free for long-term crypto
    } else {
      const shortTermRate = (brackets as any).shortTermRate ?? 0.28;
      tax = taxableAmount * shortTermRate; // 28% flat rate
    }
  } else {
    // Regular investments - progressive tax on gains
    const base = Math.max(0, agiExcl);
    tax = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, base, taxableAmount);
  }

  return { tax, niit: 0 };
}

function computeDeferredFull(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = p;
  // Deferred accounts taxed as ordinary income
  const base = Math.max(0, agiExcl);
  const tax = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, base, taxableAmount);
  return { tax, niit: 0 };
}

function computeSetupTax(setup: Setup, p: TaxParams): CalcOut {
  const {
    status,
    agiExcl,
    initial,
    gain,
    years,
    currentAge,
    isCrypto,
    additionalPenalty,
    brackets,
  } = p;
  const withdrawn = initial + gain;

  let tax = 0;
  let niit = 0;
  let penalty = 0;

  if (setup.type === 'deferred') {
    // Pension funds - reduced tax after 8 years
    let rate = 0.175; // 17.5% for 0-5 years
    if (years >= 5 && years < 8) {
      rate = 0.14; // 14% for 5-8 years
    } else if (years >= 8) {
      rate = 0.07; // 7% for >8 years
    }
    tax = withdrawn * rate;
  } else if (setup.type === 'taxfree') {
    // PPR - Tax-free if held 5 years
    if (years >= 5) {
      tax = 0;
    } else {
      // Early withdrawal - standard capital gains tax
      tax = gain * 0.28;
    }
  } else {
    // Taxable accounts
    const taxableParams = {
      country: 'portugal' as const,
      status,
      agiExcl,
      taxableAmount: gain,
      isLong: years >= 1,
      brackets,
      isCrypto,
      years,
    };
    const result = computeTaxable(taxableParams);
    tax = result.tax;
    niit = result.niit;
  }

  // Add any additional penalty
  penalty += withdrawn * additionalPenalty;

  const totalTax = tax + niit + penalty;

  // Calculate tax percentage
  let taxPct = 0;
  if (setup.type === 'deferred') {
    taxPct = withdrawn > 0 ? (totalTax / withdrawn) * 100 : 0;
  } else if (setup.type === 'taxfree') {
    taxPct = years >= 5 ? 0 : (gain > 0 ? (totalTax / gain) * 100 : 0);
  } else {
    // For crypto: tax-free after 1 year, 28% short-term
    // Tax is calculated on full gain (no exemption subtracted), so use gain as base
    // For non-crypto: progressive rates on full gain
    taxPct = gain > 0 ? (totalTax / gain) * 100 : 0;
  }

  return {
    tax: totalTax,
    niit,
    penalty,
    taxPct,
  };
}

export const portugal: any = {
  key: 'portugal',
  name: 'Portugal',
  currency: 'EUR', // Euro
  statuses,
  cryptoNote: '28% on short-term gains (held less than 1 year); tax-free if held over 1 year. Staking/mining taxed as income at 14.5-53% progressive (brackets: 14.5% €0-€8,500, 23% €8,501-€11,623, 26.5% €11,624-€16,472, 28.5% €16,473-€21,321, 34.5% €21,322-€27,146, 37% €27,147-€39,791, 43% €39,792-€51,997, 46% €51,998-€78,834, 48% €78,835-€250,000, 53% >€250,000).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
  computeSetupTax,
};
