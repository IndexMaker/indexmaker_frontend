// India tax calculations
import type { Brackets, CalcOut, CountryModule, TaxableParams } from './types';

// India tax brackets for regular income (slab rates)
// 0% ₹0-3 lakh, 5% 3-6 lakh, 10% 6-9 lakh, 15% 9-12 lakh, 20% 12-15 lakh, 30% >15 lakh
// Plus 4% cess on total tax

const indiaBrackets = {
  single: {
    ordinary: {
      uppers: [300000, 600000, 900000, 1200000, 1500000, Number.POSITIVE_INFINITY], // INR
      rates: [0.0, 0.05, 0.1, 0.15, 0.2, 0.3], // Base rates, cess added separately
    },
    lt: {
      // Long-term capital gains: 12.5% over ₹1.25 lakh exemption
      uppers: [125000, Number.POSITIVE_INFINITY],
      rates: [0.0, 0.125], // Plus 4% cess
    },
    stdDed: 50000, // Standard deduction in India
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
  married: {
    // India has individual taxation, same brackets as single
    ordinary: {
      uppers: [300000, 600000, 900000, 1200000, 1500000, Number.POSITIVE_INFINITY],
      rates: [0.0, 0.05, 0.1, 0.15, 0.2, 0.3],
    },
    lt: {
      uppers: [125000, Number.POSITIVE_INFINITY],
      rates: [0.0, 0.125],
    },
    stdDed: 50000, // Standard deduction in India
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
};

function getBrackets(status: string): Brackets {
  if (status === 'married') {
    return indiaBrackets.married;
  }
  return indiaBrackets.single;
}

function computeTaxable(params: TaxableParams): CalcOut {
  const { agiExcl, taxableAmount, isLong, brackets, isCrypto } = params;

  let tax = 0;
  let penalty = 0;

  if (isCrypto) {
    // Crypto: Flat 30% + 4% cess = 31.2% total
    tax = taxableAmount * 0.312;

    // 1% TDS on transactions over ₹50,000 (treated as advance tax, not penalty)
    // This is more of a withholding tax, but we'll include it as additional cost
    if (taxableAmount > 50000) {
      penalty = taxableAmount * 0.01; // 1% TDS
    }
  } else {
    // Regular investments
    if (isLong) {
      // Long-term capital gains: 12.5% over ₹1.25 lakh exemption + 4% cess
      const exemptAmount = 125000;
      const taxableGains = Math.max(0, taxableAmount - exemptAmount);
      const baseTax = taxableGains * 0.125;
      const cess = baseTax * 0.04;
      tax = baseTax + cess;
    } else {
      // Short-term capital gains: taxed as ordinary income at slab rates + 4% cess
      const totalIncome = agiExcl + taxableAmount;
      const totalTax = calculateProgressiveTax(totalIncome, brackets.ordinary);
      const baseTax = calculateProgressiveTax(agiExcl, brackets.ordinary);
      const gainsTax = Math.max(0, totalTax - baseTax);

      // Add 4% cess
      const cess = gainsTax * 0.04;
      tax = gainsTax + cess;
    }
  }

  return {
    tax,
    niit: 0, // India doesn't have equivalent to US NIIT
    penalty,
    taxPct: taxableAmount > 0 ? tax / taxableAmount : 0,
  };
}

function calculateProgressiveTax(
  income: number,
  brackets: { readonly uppers: readonly number[]; readonly rates: readonly number[] }
): number {
  let tax = 0;
  let previousUpper = 0;

  for (let i = 0; i < brackets.uppers.length; i++) {
    const upper = brackets.uppers[i];
    const rate = brackets.rates[i];

    if (income <= previousUpper) break;

    const taxableInThisBracket = Math.min(income, upper) - previousUpper;
    tax += taxableInThisBracket * rate;

    previousUpper = upper;
    if (income <= upper) break;
  }

  return tax;
}

// India retirement account setups
const setups = [
  {
    name: 'Taxable',
    type: 'taxable' as const,
    fees: 'Subject to capital gains tax (12.5% LTCG)',
    penaltyRate: 0,
    thresholdAge: 0,
  },
  {
    name: 'NPS (National Pension System)',
    type: 'deferred' as const,
    fees: '40% of corpus taxed if withdrawn before 10 years',
    penaltyRate: 0.4, // 40% of corpus taxed if withdrawn before 10 years
    thresholdAge: 60,
    contributionLimit: 200000, // ₹1.5L under 80C + ₹50K under 80CCD(1B)
    description: 'National Pension System with tax deduction up to ₹2 lakh',
  },
  {
    name: 'PPF (Public Provident Fund)',
    type: 'taxfree' as const, // EEE - fully tax-free
    fees: 'Fully tax-free (EEE status)',
    penaltyRate: 0,
    thresholdAge: 0, // Can withdraw after 15 years
    contributionLimit: 150000, // ₹1.5 lakh per year
    description: '15-year lock-in with guaranteed returns, fully tax-free',
  },
  {
    name: 'ELSS (Equity Linked Savings Scheme)',
    type: 'deferred' as const,
    fees: 'Tax deduction under 80C, LTCG on withdrawal',
    penaltyRate: 0, // No early withdrawal allowed within 3 years
    thresholdAge: 0, // 3-year lock-in period
    contributionLimit: 150000, // Deduction under 80C
    description: 'Equity mutual funds with 3-year lock-in and tax deduction',
  },
];

export const india: CountryModule = {
  key: 'india' as const,
  name: 'India',
  currency: 'INR',
  statuses: ['single', 'married'],
  cryptoNote:
    'Crypto gains are generally treated as capital gains (12.5% LTCG over ₹1.25 lakh exemption) plus 4% cess.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull: computeTaxable,
  computeSetupTax: (setup, params) => {
    const taxableParams = {
      country: 'india' as const,
      status: params.status,
      agiExcl: params.agiExcl,
      taxableAmount: params.gain,
      isLong: params.isLong,
      brackets: params.brackets,
      isCrypto: params.isCrypto,
      years: params.years,
    };
    const result = computeTaxable(taxableParams);
    return {
      tax: result.tax,
      niit: result.niit,
      penalty: 0,
      taxPct: params.gain > 0 ? (result.tax / params.gain) * 100 : 0,
    };
  },
};
