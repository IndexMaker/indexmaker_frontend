// Brazil tax calculations
import type { Brackets, CalcOut, CountryModule, TaxableParams } from './types';

// Brazil tax brackets for ordinary income
// 0% <R$28,559.70, 7.5% R$28,559.71-R$39,168.43, 15% R$39,168.44-R$50,788.28,
// 22.5% R$50,788.29-R$55,373.55, 27.5% >R$55,373.55

const brazilBrackets = {
  single: {
    ordinary: {
      uppers: [28559.7, 39168.43, 50788.28, 55373.55, Number.POSITIVE_INFINITY], // BRL
      rates: [0.0, 0.075, 0.15, 0.225, 0.275],
    },
    lt: {
      // Capital gains: Progressive 15-22.5% on monthly gains over R$35,000
      uppers: [5000000, 10000000, 30000000, Number.POSITIVE_INFINITY], // BRL
      rates: [0.15, 0.175, 0.2, 0.225],
    },
    stdDed: 0, // No standard deduction in Brazil
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
  married: {
    // Brazil has individual taxation, same brackets as single
    ordinary: {
      uppers: [28559.7, 39168.43, 50788.28, 55373.55, Number.POSITIVE_INFINITY],
      rates: [0.0, 0.075, 0.15, 0.225, 0.275],
    },
    lt: {
      uppers: [5000000, 10000000, 30000000, Number.POSITIVE_INFINITY],
      rates: [0.15, 0.175, 0.2, 0.225],
    },
    stdDed: 0, // No standard deduction in Brazil
    niitThresh: Number.POSITIVE_INFINITY, // No NIIT equivalent
  },
};

/**
 * Get Brazil tax brackets for income tax calculation
 * @param status - Filing status ('single' or 'married')
 * @returns Tax brackets with ordinary income and capital gains rates
 */
function getBrackets(status: string): any {
  if (status === 'married') {
    return brazilBrackets.married;
  }
  return brazilBrackets.single;
}

function computeTaxable(params: TaxableParams): CalcOut {
  const { agiExcl, taxableAmount, isLong, brackets, isCrypto } = params;

  let tax = 0;

  if (isCrypto) {
    // Crypto: Progressive capital gains 15-22.5% on monthly gains over R$35,000
    const exemptAmount = 35000; // Monthly exemption
    const taxableGains = Math.max(0, taxableAmount - exemptAmount);

    if (taxableGains > 0 && brackets.lt) {
      tax = calculateProgressiveCapitalGains(taxableGains, brackets.lt);
    }

    // Note: 17.5% flat rate on offshore platforms could be added as alternative
  } else {
    // Regular investments: Same capital gains treatment as crypto
    const exemptAmount = 35000;
    const taxableGains = Math.max(0, taxableAmount - exemptAmount);

    if (taxableGains > 0 && brackets.lt) {
      tax = calculateProgressiveCapitalGains(taxableGains, brackets.lt);
    }
  }

  return {
    tax,
    niit: 0, // Brazil doesn't have equivalent to US NIIT
    penalty: 0,
    taxPct: taxableAmount > 0 ? tax / taxableAmount : 0,
  };
}

function calculateProgressiveCapitalGains(
  gains: number,
  brackets: { readonly uppers: readonly number[]; readonly rates: readonly number[] }
): number {
  let tax = 0;
  let previousUpper = 0;

  for (let i = 0; i < brackets.uppers.length; i++) {
    const upper = brackets.uppers[i];
    const rate = brackets.rates[i];

    if (gains <= previousUpper) break;

    const taxableInThisBracket = Math.min(gains, upper) - previousUpper;
    tax += taxableInThisBracket * rate;

    previousUpper = upper;
    if (gains <= upper) break;
  }

  return tax;
}

function calculateProgressiveTax(
  income: number,
  brackets: { uppers: number[]; rates: number[] }
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

// Brazil retirement account setups
const setups = [
  {
    name: 'Taxable',
    type: 'taxable' as const,
    fees: 'Subject to capital gains tax (15-22.5%)',
    penaltyRate: 0,
    thresholdAge: 0,
  },
  {
    name: 'PGBL (Plano Gerador de Benefício Livre)',
    type: 'deferred' as const,
    fees: 'Regression tax table (35% if withdrawn <2 years)',
    penaltyRate: 0.35, // Regression table: 35% if withdrawn <2 years
    thresholdAge: 0, // No specific age, but regression table applies
    contributionLimit: 0, // 12% of income (calculated dynamically)
    description: 'Tax-deductible contributions, regression tax table on withdrawals',
  },
  {
    name: 'VGBL (Vida Gerador de Benefício Livre)',
    type: 'taxfree' as const, // Tax on gains only
    fees: 'Tax on gains only with regression table',
    penaltyRate: 0.35, // Same regression table as PGBL
    thresholdAge: 0,
    contributionLimit: Number.POSITIVE_INFINITY, // No contribution limit
    description: 'After-tax contributions, tax on gains only with regression table',
  },
];

export const brazil: any = {
  key: 'brazil' as const,
  name: 'Brazil',
  currency: 'BRL',
  statuses: ['single', 'married'],
  cryptoNote:
    'Crypto gains over R$35,000/month are subject to progressive capital gains tax (15-22.5%).',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull: computeTaxable,
  /**
   * Calculate taxes for Brazil-specific retirement setups (PGBL/VGBL)
   * @param setup - The retirement setup configuration
   * @param params - Tax calculation parameters
   * @returns Tax calculation results including tax amount and percentage
   */
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

    if (name.includes('pgbl')) {
      // PGBL - deductible contributions, taxed on withdrawal (EET)
      // Use regression tax table based on years
      const regressionRate =
        years < 2
          ? 0.35
          : years < 4
            ? 0.3
            : years < 6
              ? 0.25
              : years < 8
                ? 0.2
                : years < 10
                  ? 0.15
                  : 0.1;
      tax = withdrawn * regressionRate;

      // Early withdrawal penalty
      const isQualified = currentAge + years >= setup.thresholdAge && years >= 10;
      if (!isQualified) {
        penalty = withdrawn * setup.penaltyRate; // 10% penalty
      }

      penalty += additionalPenalty * withdrawn;
      taxOnGainOnly = tax + penalty;
    } else if (name.includes('vgbl')) {
      // VGBL - no deduction, gains tax-free (TEE)
      // Use regression tax table on gains only
      const regressionRate =
        years < 2
          ? 0.35
          : years < 4
            ? 0.3
            : years < 6
              ? 0.25
              : years < 8
                ? 0.2
                : years < 10
                  ? 0.15
                  : 0.1;
      tax = gain * regressionRate;

      // Early withdrawal penalty
      const isQualified = currentAge + years >= setup.thresholdAge && years >= 10;
      if (!isQualified) {
        penalty = withdrawn * setup.penaltyRate; // 10% penalty
      }

      penalty += additionalPenalty * withdrawn;
      taxOnGainOnly = tax + penalty;
    } else {
      // Taxable accounts
      const taxableParams = {
        country: 'brazil' as const,
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
    return {
      tax: totalReported,
      niit,
      penalty,
      taxPct: gain > 0 ? (taxOnGainOnly / gain) * 100 : 0,
    };
  },
};
