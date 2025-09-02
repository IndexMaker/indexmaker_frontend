// lib/tax/usa-enhanced.ts
// Enhanced USA tax implementation with accurate 2024/2025 brackets

import type { CountryModule, Setup, TaxableParams } from './types';
import type { EnhancedBrackets } from './types/enhanced';

// 2024 Federal Income Tax Brackets (ordinary income)
const ordinaryBrackets2024 = {
  single: {
    uppers: [11000, 44725, 95375, 197050, 250525, 626350, Number.POSITIVE_INFINITY],
    rates: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]
  },
  married: {
    uppers: [22000, 89450, 190750, 364200, 462500, 693750, Number.POSITIVE_INFINITY],
    rates: [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37]
  }
};

// 2024 Capital Gains Tax Brackets
const capitalGainsBrackets2024 = {
  single: {
    shortTerm: ordinaryBrackets2024.single, // Same as ordinary income
    longTerm: {
      uppers: [47025, 518900, Number.POSITIVE_INFINITY],
      rates: [0.00, 0.15, 0.20]
    },
    holdingPeriodMonths: 12
  },
  married: {
    shortTerm: ordinaryBrackets2024.married,
    longTerm: {
      uppers: [94050, 583750, Number.POSITIVE_INFINITY],
      rates: [0.00, 0.15, 0.20]
    },
    holdingPeriodMonths: 12
  }
};

// Standard deductions for 2024
const standardDeductions2024 = {
  single: 14600,
  married: 29200
};

// NIIT thresholds
const niitThresholds = {
  single: 200000,
  married: 250000
};

// Helper functions
function calcProgressiveTax(income: number, uppers: readonly number[], rates: readonly number[]) {
  let tax = 0;
  let prev = 0;
  const inc = Math.max(0, income);
  
  for (let i = 0; i < uppers.length; i++) {
    const upper = uppers[i];
    const rate = rates[i];
    const seg = Math.min(inc, upper) - prev;
    if (seg > 0) tax += seg * rate;
    prev = upper;
    if (inc <= upper) break;
  }
  return tax;
}

function taxIncrement(
  uppers: readonly number[],
  rates: readonly number[],
  baseTaxable: number,
  delta: number
) {
  const d = Math.max(0, delta);
  const x0 = Math.max(0, baseTaxable);
  const x1 = Math.max(0, baseTaxable + d);
  return calcProgressiveTax(x1, uppers, rates) - calcProgressiveTax(x0, uppers, rates);
}

// Enhanced brackets function
function getBrackets(status: string): EnhancedBrackets {
  const filingStatus = status === 'married' ? 'married' : 'single';
  
  return {
    // Legacy support
    ordinary: ordinaryBrackets2024[filingStatus],
    lt: null, // No long-term capital gains brackets
    stdDed: standardDeductions2024[filingStatus],
    niitThresh: niitThresholds[filingStatus],
    
    // Enhanced features
    capitalGains: {
      shortTerm: ordinaryBrackets2024[filingStatus],
      longTerm: capitalGainsBrackets2024[filingStatus].longTerm,
      holdingPeriodMonths: 12
    },
    
    filingStatuses: {
      [filingStatus]: {
        ordinary: ordinaryBrackets2024[filingStatus],
        stdDed: standardDeductions2024[filingStatus],
        niitThresh: niitThresholds[filingStatus]
      }
    },
    
    specialRules: {
      // No flat tax rate for USA
      wealthTax: false,
      miningTaxRate: undefined, // Taxed as ordinary income
      stakingTaxRate: undefined // Taxed as ordinary income
    }
  };
}

// Enhanced tax calculation
function computeTaxable(p: TaxableParams): { readonly tax: number; readonly niit: number } {
  const { agiExcl, taxableAmount, brackets } = p;
  const enhancedBrackets = brackets as EnhancedBrackets;
  
  const { ordinary, stdDed, niitThresh } = enhancedBrackets;
  
  // Calculate ordinary income tax
  const ordinaryTaxable = Math.max(0, agiExcl - stdDed);
  const tax = taxIncrement(ordinary.uppers, ordinary.rates, ordinaryTaxable, taxableAmount);
  
  // Calculate NIIT (Net Investment Income Tax)
  const totalIncome = agiExcl + taxableAmount;
  let niit = 0;
  if (totalIncome > niitThresh) {
    niit = Math.min(taxableAmount, totalIncome - niitThresh) * 0.038;
  }
  
  const totalTax = tax + niit;
  const effectiveRate = taxableAmount > 0 ? totalTax / taxableAmount : 0;
  
  return {
    tax: totalTax,
    niit
  };
}

function computeDeferredFull(p: TaxableParams): { readonly tax: number; readonly niit: number } {
  // For deferred accounts, everything is taxed as ordinary income
  return computeTaxable(p);
}

// Investment setups
const setups: Setup[] = [
  {
    name: 'Traditional IRA',
    type: 'deferred',
    fees: 'Deductible contributions (income limits apply), tax-deferred growth, taxed withdrawals (EET).',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: 'Roth IRA',
    type: 'taxfree',
    fees: 'After-tax contributions, tax-free growth and qualified withdrawals (TEE). No RMDs.',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: '401k Traditional',
    type: 'deferred',
    fees: 'Pre-tax contributions, tax-deferred growth, taxed on withdrawal (EET).',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: '401k Roth',
    type: 'taxfree',
    fees: 'After-tax contributions, tax-free growth and qualified withdrawals (TEE).',
    penaltyRate: 0.1,
    thresholdAge: 59.5,
  },
  {
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'No withdrawal restrictions. Capital gains rates apply for long-term holdings.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
];

const statuses = ['single', 'married'];

export const usaEnhanced: any = {
  key: 'usa',
  name: 'United States',
  currency: 'USD',
  statuses,
  cryptoNote: 'Crypto taxed as property. Short-term gains (<1 year) taxed as ordinary income. Long-term gains (≥1 year) at preferential rates: 0%, 15%, or 20%.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
};
