// lib/tax/australia.ts
import type { Brackets, Setup, TaxableParams } from './types';
import { createCountryBrackets, taxIncrement } from './utils/tax-calculations';

const statuses = ['single'];
function getBrackets(): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [18200, 45000, 135000, 190000, Number.POSITIVE_INFINITY],
      rates: [0, 0.19, 0.30, 0.37, 0.45], // Updated to match data.json: 19% not 16%
    },
    lt: null,
    stdDed: 18200,
    niitThresh: 0,
    capGainDiscount: 0.5, // 50% discount for assets held >12 months
    medicareLevyRate: 0.02, // 2% Medicare levy
  });
}

const setups: Setup[] = [
  {
    name: 'Superannuation',
    type: 'super',
    fees: 'AUD 30,000 concessional, AUD 120,000 non-concessional. Earnings taxed in fund: 15% (10% if CGT >12m). From 60 (preservation age); early hardship/compassionate only.',
    penaltyRate: 0, // Early access only in specific circumstances
    thresholdAge: 60,
  },
  {
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'No withdrawal restrictions. Subject to capital gains tax (0-45%) with 50% discount after 12 months.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
];

function computeTaxable(p: TaxableParams) {
  const { agiExcl, taxableAmount, isLong, brackets } = p;
  const discount = isLong ? (brackets.capGainDiscount ?? 0) : 0;
  const taxableGain = taxableAmount * (1 - discount);
  const base = Math.max(0, agiExcl - brackets.stdDed);
  const incomeTax = taxIncrement(
    brackets.ordinary.uppers,
    brackets.ordinary.rates,
    base,
    taxableGain
  );
  const levy = (brackets.medicareLevyRate ?? 0) * taxableGain;
  const tax = incomeTax + levy;
  return { tax, niit: 0 };
}

function computeDeferredFull(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = p;
  const base = Math.max(0, agiExcl - brackets.stdDed);
  const tax = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, base, taxableAmount);
  return { tax, niit: 0 };
}

export const australia: any = {
  key: 'australia' as const,
  name: 'Australia',
  currency: 'AUD',
  statuses,
  getBrackets,
  setups,
  cryptoNote: 'Individuals get 50% CGT discount >12 months.',
  computeTaxable,
  computeDeferredFull,
  computeSetupTax: (setup: any, params: any) => {
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
    } = params;
    const withdrawn = initial + gain;

    let tax = 0;
    let niit = 0;
    let penalty = 0;
    let taxOnGainOnly = 0;

    if (setup.type === 'super') {
      // Superannuation - special tax treatment
      // Earnings taxed at fund level (15%, or 10% for CGT >12 months)
      // Withdrawals after preservation age are tax-free
      const isQualified = currentAge + years >= setup.thresholdAge;

      if (isQualified) {
        // Qualified withdrawal - tax-free
        tax = 0;
        niit = 0;
      } else {
        // Early access only in hardship/compassionate circumstances
        // For modeling purposes, assume not available (very high penalty)
        tax = 0;
        penalty = withdrawn * 0.5; // 50% penalty to model unavailability
      }

      penalty += additionalPenalty * withdrawn;
      taxOnGainOnly = tax + niit + penalty;
    } else {
      // Taxable accounts
      const taxableParams = {
        country: 'australia' as const,
        status,
        agiExcl,
        taxableAmount: gain,
        isLong: years > 1,
        brackets,
        isCrypto,
        years,
      };
      const result = computeTaxable(taxableParams);
      tax = result.tax;
      niit = result.niit;
      penalty = additionalPenalty * withdrawn;
      taxOnGainOnly = tax + niit + penalty;
    }

    const totalReported = tax + niit + penalty;

    // For super accounts, tax calculation is different - show as percentage of withdrawal
    let taxPct = 0;
    if (setup.type === 'super') {
      // For super accounts, show tax as percentage of total withdrawal
      taxPct = withdrawn > 0 ? (taxOnGainOnly / withdrawn) * 100 : 0;
    } else {
      // For taxable accounts, show tax as percentage of gains
      taxPct = gain > 0 ? (taxOnGainOnly / gain) * 100 : 0;
    }

    return {
      tax: totalReported,
      niit,
      penalty,
      taxPct,
    };
  },
};
