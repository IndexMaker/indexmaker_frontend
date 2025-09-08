// lib/tax/germany.ts
import type { Setup, TaxableParams } from './types';

function calcProgressiveTax(income: number, uppers: readonly number[], rates: readonly number[]) {
  let tax = 0,
    prev = 0;
  for (let i = 0; i < uppers.length; i++) {
    const upper = uppers[i],
      rate = rates[i];
    const seg = Math.min(income, upper) - prev;
    if (seg > 0) tax += seg * rate;
    prev = upper;
    if (income <= upper) break;
  }
  return tax;
}
function taxIncrement(
  uppers: readonly number[],
  rates: readonly number[],
  baseTaxable: number,
  delta: number
) {
  const base = Math.max(0, baseTaxable);
  const d = Math.max(0, delta);
  return calcProgressiveTax(base + d, uppers, rates) - calcProgressiveTax(base, uppers, rates);
}

const statuses = ['single', 'married'];
function getBrackets(status: string): any {
  const isSingle = status === 'single';
  return {
    ordinary: { uppers: [12096, 68429, 277825, Number.POSITIVE_INFINITY], rates: [0, 0.14, 0.42, 0.45] },
    lt: null,
    stdDed: isSingle ? 12096 : 24192,
    niitThresh: 0,
    capGainRate: 0.25,
    solidarity: 0.055,
    annualExempt: 1000,
    cryptoHoldFree: 1,
    cryptoSmallExempt: 600,
  };
}

const setups: Setup[] = [
  {
    name: 'Riester pension',
    type: 'deferred',
    fees: 'EUR 2,100 deductible, government subsidy EUR 175 + child bonuses. Contributions deductible, subsidies, benefits taxed (EET). Until 62 or 60 if started before 2012; early withdrawal repays subsidies + tax.',
    penaltyRate: 1.0, // Repay subsidies + tax penalty
    thresholdAge: 62,
  },
  {
    name: 'Rürup pension',
    type: 'deferred',
    fees: 'EUR 29,344 single, EUR 58,688 couple (100% deductible). 100% deductible, benefits partially taxed. Lifelong annuity from 62; early not allowed.',
    penaltyRate: 0, // Early withdrawal not allowed
    thresholdAge: 62,
  },
  {
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'Tax-free after 1-year holding period. Otherwise taxed as private sale (up to 42%). No withdrawal restrictions.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
];

function computeTaxable(p: TaxableParams) {
  const { status, agiExcl, taxableAmount, isLong, brackets, isCrypto, years } = p;
  if (isCrypto) {
    const holdFreeYears = brackets.cryptoHoldFree ?? 1;
    if (isLong && years >= holdFreeYears) return { tax: 0, niit: 0 };
    const small = brackets.cryptoSmallExempt ?? 600;
    if (taxableAmount <= small) return { tax: 0, niit: 0 };
    const base = Math.max(0, agiExcl - brackets.stdDed);
    const t = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, base, taxableAmount);
    const soli = t * (brackets.solidarity ?? 0);
    return { tax: t + soli, niit: soli };
  } else {
    let exempt = brackets.annualExempt ?? 0;
    if (status === 'married') exempt *= 2;
    const afterExempt = Math.max(0, taxableAmount - exempt);
    const baseTax = afterExempt * (brackets.capGainRate ?? 0.25);
    const soli = baseTax * (brackets.solidarity ?? 0.055);
    return { tax: baseTax + soli, niit: soli };
  }
}

function computeDeferredFull(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = p;
  const base = Math.max(0, agiExcl - brackets.stdDed);
  const t = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, base, taxableAmount);
  const soli = t * (brackets.solidarity ?? 0.055);
  return { tax: t, niit: soli };
}

export const germany: any = {
  key: 'germany' as const,
  name: 'Germany',
  currency: 'EUR',
  statuses,
  getBrackets,
  setups,
  cryptoNote: 'Crypto tax-free >1y; else progressive with EUR 600 cliff.',
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

    const name = setup.name.toLowerCase();

    if (setup.type === 'deferred') {
      // Riester and Rürup pensions - tax entire withdrawal as ordinary income
      const { tax: taxFull, niit: niitFull } = computeDeferredFull({
        country: 'germany',
        status,
        agiExcl,
        taxableAmount: withdrawn,
        isLong: years > 1,
        brackets,
        isCrypto,
        years,
      });

      tax = taxFull;
      niit = niitFull;

      // Early withdrawal penalties
      if (currentAge + years < setup.thresholdAge) {
        if (name.includes('riester')) {
          // Riester early withdrawal: repay subsidies + tax penalty
          // Realistic penalty: ~20-30% of withdrawal (subsidies + tax clawback)
          penalty = withdrawn * 0.25; // 25% penalty for early withdrawal
        }
        // Rürup doesn't allow early withdrawal
      }

      penalty += additionalPenalty * withdrawn;
      taxOnGainOnly = tax + niit + penalty;
    } else {
      // Taxable accounts
      const taxableParams = {
        country: 'germany' as const,
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

    // For deferred accounts (Riester/Rürup), tax is on entire withdrawal, so calculate percentage differently
    let taxPct = 0;
    if (setup.type === 'deferred') {
      // For deferred accounts, show tax as percentage of total withdrawal, not just gains
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
