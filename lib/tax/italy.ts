// Italy tax calculations
import type { CalcOut, TaxableParams } from './types';

// Italy tax brackets for ordinary income
// 23% €0-€28,000, 25% €28,001-€50,000, 35% €50,001-€75,000, 43% >€75,000

const italyBrackets = {
  single: {
    ordinary: {
      uppers: [28000, 50000, 75000, Number.POSITIVE_INFINITY], // EUR
      rates: [0.23, 0.25, 0.35, 0.43],
    },
    lt: {
      // Capital gains: 26% flat rate (increasing to 42%)
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.26], // Will be 0.42 in future
    },
    stdDed: 8000, // Basic personal allowance
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
  married: {
    // Italy has individual taxation, same brackets as single
    ordinary: {
      uppers: [28000, 50000, 75000, Number.POSITIVE_INFINITY],
      rates: [0.23, 0.25, 0.35, 0.43],
    },
    lt: {
      uppers: [Number.POSITIVE_INFINITY],
      rates: [0.26],
    },
    stdDed: 8000, // Basic personal allowance
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
};

function getBrackets(status: string): any {
  if (status === 'married') {
    return italyBrackets.married;
  }
  return italyBrackets.single;
}

function computeTaxable(params: TaxableParams): CalcOut {
  const { taxableAmount, brackets, isCrypto } = params;

  let tax = 0;

  if (isCrypto) {
    // Crypto: 26% on gains over €2,000 exemption (increasing to 42%)
    const exemptAmount = 2000;
    const taxableGains = Math.max(0, taxableAmount - exemptAmount);

    // Using current rate of 26%, but noting future increase to 42%
    tax = taxableGains * 0.26;

    // For future implementation, could add a parameter for the new rate:
    // tax = taxableGains * 0.42; // Future rate
  } else {
    // Regular investments: 26% capital gains tax (no holding period distinction)
    tax = taxableAmount * 0.26;
  }

  return {
    tax,
    niit: 0, // Italy doesn't have equivalent to US NIIT
    penalty: 0,
    taxPct: taxableAmount > 0 ? (tax / taxableAmount) * 100 : 0,
  };
}



// Italy retirement account setups
const setups = [
  {
    name: 'Taxable',
    type: 'taxable' as const,
    fees: 'Subject to 26% capital gains tax',
    penaltyRate: 0,
    thresholdAge: 0,
  },
  {
    name: 'PIR (Individual Savings Plan)',
    type: 'taxfree' as const,
    fees: 'Tax-free if held for 5 years',
    penaltyRate: 0.26, // Standard capital gains tax + repayment of benefits if withdrawn early
    thresholdAge: 0, // 5-year holding period required
    contributionLimit: 40000, // €40,000 per year
    description: 'Tax-free if held for 5 years, must invest 70% in Italian/EU SMEs',
  },
  {
    name: 'Pension Fund',
    type: 'deferred' as const,
    fees: 'Reduced tax rate on withdrawal (23%)',
    penaltyRate: 0.23, // Reduced tax rate on early withdrawal
    thresholdAge: 67, // Standard retirement age in Italy
    contributionLimit: 5164, // €5,164 deductible contribution
    description: 'Occupational pension with tax deduction and reduced withdrawal tax',
  },
];

export const italy: any = {
  key: 'italy' as const,
  name: 'Italy',
  currency: 'EUR',
  statuses: ['single', 'married'],
  cryptoNote: 'Capital gains are subject to 26% flat tax.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull: computeTaxable,
  computeSetupTax: (setup: any, params: any) => {
    const { initial, gain, years, currentAge, additionalPenalty } = params;
    const withdrawn = initial + gain;

    let tax = 0;
    let niit = 0;
    let penalty = 0;

    if (setup.type === 'deferred') {
      // Pension Fund - tax on entire withdrawal at reduced rate (23%)
      tax = withdrawn * 0.23;

      // Early withdrawal penalty
      if (currentAge + years < setup.thresholdAge) {
        penalty = withdrawn * setup.penaltyRate;
      }
    } else if (setup.type === 'taxfree') {
      // PIR - tax-free if held for 5 years, otherwise standard capital gains tax
      if (years < 5) {
        tax = gain * 0.26; // Standard capital gains tax
        penalty = gain * setup.penaltyRate; // Repayment of benefits
      } else {
        tax = 0; // Tax-free
      }
    } else {
      // Taxable accounts - standard capital gains tax
      const taxableParams = {
        country: 'italy' as const,
        status: params.status,
        agiExcl: params.agiExcl,
        taxableAmount: gain,
        isLong: params.isLong,
        brackets: params.brackets,
        isCrypto: params.isCrypto,
        years: params.years,
      };
      const result = computeTaxable(taxableParams);
      tax = result.tax;
      niit = result.niit;
    }

    // Add any additional penalty
    penalty += withdrawn * additionalPenalty;

    const totalTax = tax + niit + penalty;

    // Calculate tax percentage correctly based on account type
    let taxPct = 0;
    if (setup.type === 'deferred') {
      // Pension Fund: Tax is on entire withdrawal, so percentage should be against withdrawal
      taxPct = withdrawn > 0 ? (totalTax / withdrawn) * 100 : 0;
    } else if (setup.type === 'taxfree') {
      // PIR: Tax-free if held for 5+ years, otherwise tax on gains
      if (years >= 5) {
        taxPct = 0; // Tax-free
      } else {
        taxPct = gain > 0 ? (totalTax / gain) * 100 : 0;
      }
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
  },
};
