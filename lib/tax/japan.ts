// Japan tax calculations
import type { Brackets, CalcOut, CountryModule, TaxableParams } from './types';

// Japan progressive tax brackets (national + local = 15-55%)
// National rates: 5%, 10%, 20%, 23%, 33%, 40%, 45%
// Local tax: 10% flat
// Combined effective rates: 15%, 20%, 30%, 33%, 43%, 50%, 55%

const japanBrackets = {
  single: {
    ordinary: {
      uppers: [1950000, 3300000, 6950000, 9000000, 18000000, 40000000, Number.POSITIVE_INFINITY], // JPY
      rates: [0.15, 0.2, 0.3, 0.33, 0.43, 0.5, 0.55], // Combined national + local
    },
    lt: {
      // Japan doesn't distinguish between short/long term - all taxed as ordinary income
      uppers: [1950000, 3300000, 6950000, 9000000, 18000000, 40000000, Number.POSITIVE_INFINITY],
      rates: [0.15, 0.2, 0.3, 0.33, 0.43, 0.5, 0.55],
    },
    stdDed: 480000, // Basic deduction in Japan
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
  married: {
    // Japan has individual taxation, so same brackets as single
    ordinary: {
      uppers: [1950000, 3300000, 6950000, 9000000, 18000000, 40000000, Number.POSITIVE_INFINITY],
      rates: [0.15, 0.2, 0.3, 0.33, 0.43, 0.5, 0.55],
    },
    lt: {
      uppers: [1950000, 3300000, 6950000, 9000000, 18000000, 40000000, Number.POSITIVE_INFINITY],
      rates: [0.15, 0.2, 0.3, 0.33, 0.43, 0.5, 0.55],
    },
    stdDed: 480000, // Basic deduction in Japan
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
};

function getBrackets(status: string): any {
  if (status === 'married') {
    return japanBrackets.married;
  }
  return japanBrackets.single;
}

function computeTaxable(params: TaxableParams): CalcOut {
  const { agiExcl, taxableAmount, isLong, brackets, isCrypto } = params;

  // Japan doesn't distinguish between crypto and traditional investments
  // All capital gains are taxed as miscellaneous income at progressive rates

  const totalIncome = agiExcl + taxableAmount;

  // Calculate tax on total income
  const totalTax = calculateProgressiveTax(totalIncome, brackets.ordinary);

  // Calculate tax on income without gains
  const baseTax = calculateProgressiveTax(agiExcl, brackets.ordinary);

  // Tax on gains is the difference
  const gainsTax = Math.max(0, totalTax - baseTax);

  return {
    tax: gainsTax,
    niit: 0, // Japan doesn't have equivalent to US NIIT
    penalty: 0, // No additional penalties for regular investments
    taxPct: taxableAmount > 0 ? gainsTax / taxableAmount : 0,
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

// Japan retirement account setups
const setups = [
  {
    name: 'Taxable',
    type: 'taxable' as const,
    fees: 'Subject to progressive income tax (15-55%)',
    penaltyRate: 0,
    thresholdAge: 0,
  },
  {
    name: 'iDeCo',
    type: 'deferred' as const,
    fees: 'Tax deduction on contributions, taxed on withdrawal',
    penaltyRate: 0, // No early withdrawal allowed
    thresholdAge: 60,
    contributionLimit: 900000, // JPY 75,000/month * 12 for self-employed
    description: 'Individual Defined Contribution pension plan',
  },
  {
    name: 'NISA (Growth)',
    type: 'taxfree' as const,
    fees: 'Tax-free growth and withdrawals',
    penaltyRate: 0, // Tax-free withdrawals
    thresholdAge: 0, // No age restriction
    contributionLimit: 1800000, // JPY 1.8M annually for growth type
    description: 'Nippon Individual Savings Account - Growth type',
  },
  {
    name: 'NISA (Tsumitate)',
    type: 'taxfree' as const,
    fees: 'Tax-free growth and withdrawals',
    penaltyRate: 0,
    thresholdAge: 0,
    contributionLimit: 1200000, // JPY 1.2M annually for accumulation type
    description: 'Nippon Individual Savings Account - Accumulation type',
  },
];

export const japan: any = {
  key: 'japan',
  name: 'Japan',
  currency: 'JPY',
  statuses: ['single', 'married'],
  cryptoNote:
    'All capital gains (including crypto) are taxed as miscellaneous income at progressive rates.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull: computeTaxable,
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

    const name = setup.name.toLowerCase();

    if (setup.type === 'deferred') {
      // iDeCo - tax entire withdrawal as ordinary income
      const taxableParams = {
        country: 'japan' as const,
        status,
        agiExcl,
        taxableAmount: withdrawn,
        isLong: years > 1,
        brackets,
        isCrypto: false, // iDeCo withdrawals taxed as ordinary income
        years,
      };
      const result = computeTaxable(taxableParams);
      tax = result.tax;
      niit = result.niit;

      // Early withdrawal penalty
      if (currentAge + years < setup.thresholdAge) {
        penalty = withdrawn * 0.2; // 20% penalty for early withdrawal
      }

      penalty += additionalPenalty * withdrawn;
      taxOnGainOnly = tax + niit + penalty;
    } else if (setup.type === 'taxfree') {
      // NISA - tax-free growth and withdrawals
      tax = 0;
      niit = 0;
      penalty = additionalPenalty * withdrawn;
      taxOnGainOnly = penalty;
    } else {
      // Taxable accounts
      const taxableParams = {
        country: 'japan' as const,
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

    // Calculate tax percentage correctly based on account type
    let taxPct = 0;
    if (setup.type === 'deferred') {
      // iDeCo: Tax is on entire withdrawal, so percentage should be against withdrawal
      taxPct = withdrawn > 0 ? (taxOnGainOnly / withdrawn) * 100 : 0;
    } else if (setup.type === 'taxfree') {
      // NISA: No tax, so 0%
      taxPct = 0;
    } else {
      // Taxable accounts: Tax is on gains only, so percentage should be against gains
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
