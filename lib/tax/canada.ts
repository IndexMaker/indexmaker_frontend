// lib/tax/canada.ts
import type { Brackets, CalcOut, Setup, TaxableParams, TaxParams } from './types';
import { createCountryBrackets, taxIncrement } from './utils/tax-calculations';

const statuses = ['single'];
function getBrackets(): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [57375, 114750, 177882, 253414, Number.POSITIVE_INFINITY],
      rates: [0.15, 0.205, 0.26, 0.29, 0.33], // Federal tax brackets from data.json
    },
    lt: null,
    stdDed: 0,
    niitThresh: 0,
    capGainInclusion: 0.5, // 50% of capital gains included in income
  });
}

const setups: Setup[] = [
  {
    name: 'RRSP',
    type: 'deferred',
    fees: '18% of income or CAD 31,560 (2025). Deductible, tax-deferred growth, taxed withdrawals (EET). Until 71, then RRIF; early withdrawal taxed + withholding.',
    penaltyRate: 0.1, // Withholding tax on early withdrawal
    thresholdAge: 71,
  },
  {
    name: 'TFSA',
    type: 'taxfree',
    fees: 'CAD 7,000 annually (2025), cumulative. Tax-free (TEE). No minimum; withdrawals tax-free, add to future room.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'No withdrawal restrictions. Subject to capital gains tax (50% inclusion rate).',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
];

function computeTaxable(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = p;
  const inclusion = brackets.capGainInclusion ?? 0.5;
  const taxableGain = taxableAmount * inclusion;
  const base = Math.max(0, agiExcl);
  const tax = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, base, taxableGain);
  return { tax, niit: 0 };
}

function computeDeferredFull(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = p;
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

  if (setup.type === 'taxable') {
    // Taxable account: only pay tax on gains
    const result = computeTaxable({
      country: 'canada',
      status,
      agiExcl,
      taxableAmount: gain,
      isLong: years > 1,
      brackets,
      isCrypto,
      years,
      gain,
    });
    tax = result.tax;
    niit = result.niit;
  } else if (setup.type === 'deferred') {
    // RRSP: tax on full withdrawal
    const result = computeDeferredFull({
      country: 'canada',
      status,
      agiExcl,
      taxableAmount: withdrawn,
      isLong: years > 1,
      brackets,
      isCrypto,
      years,
      gain,
    });
    tax = result.tax;
    niit = result.niit;

    // Early withdrawal penalty (withholding tax)
    if (currentAge < setup.thresholdAge) {
      penalty = withdrawn * setup.penaltyRate;
    }
  } else if (setup.type === 'taxfree') {
    // TFSA: no tax on withdrawal
    tax = 0;
    niit = 0;
  }

  // Add any additional penalty
  penalty += withdrawn * additionalPenalty;

  const totalTax = tax + niit + penalty;

  // Calculate tax percentage correctly based on account type
  let taxPct = 0;
  if (setup.type === 'deferred') {
    // RRSP: Tax is on entire withdrawal, so percentage should be against withdrawal
    taxPct = withdrawn > 0 ? (totalTax / withdrawn) * 100 : 0;
  } else if (setup.type === 'taxfree') {
    // TFSA: No tax, so 0%
    taxPct = 0;
  } else {
    // Taxable accounts: Tax is on gains only, so percentage should be against gains
    taxPct = gain > 0 ? (totalTax / gain) * 100 : 0;
  }

  return {
    tax: totalTax,
    niit,
    penalty,
    taxPct,
  };
}

export const canada: any = {
  key: 'canada',
  name: 'Canada',
  currency: 'CAD',
  statuses,
  cryptoNote: 'Crypto treated as commodity. 50% of capital gains taxable. Business income taxed at marginal rates.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
  computeSetupTax,
};
