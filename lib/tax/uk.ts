// lib/tax/uk.ts
import type { Brackets, CalcOut, CountryModule, Setup, TaxableParams, TaxParams } from './types';

const statuses = ['single'];
function getBrackets(): any {
  return {
    ordinary: { uppers: [12570, 50270, 125140, Number.POSITIVE_INFINITY], rates: [0, 0.2, 0.4, 0.45] },
    lt: null,
    stdDed: 12570,
    niitThresh: 0,
    higherThresh: 37700,
    capGainRateBasic: 0.18,
    capGainRateHigher: 0.24,
    annualExempt: 3000,
  };
}

const setups: Setup[] = [
  {
    name: 'SIPP',
    type: 'deferred',
    fees: 'GBP 60,000 annually. Tax relief 20-45% on contributions, tax-free growth, 25% tax-free withdrawal (EET partial). From 55 (57 from 2028); early unauthorized 55% charge.',
    penaltyRate: 0.55, // 55% unauthorized payment charge
    thresholdAge: 55,
  },
  {
    name: 'ISA',
    type: 'taxfree',
    fees: 'GBP 20,000 annually. Tax-free gains/dividends (TEE). No minimum; withdrawals tax-free, no re-contribution.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'No withdrawal restrictions. Subject to capital gains tax (10-20%) with GBP 6,000 annual allowance.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
];

function computeTaxable(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = p;
  const allowance = brackets.annualExempt ?? 0;
  const gainAfterAllowance = Math.max(0, taxableAmount - allowance);
  if (gainAfterAllowance <= 0) return { tax: 0, niit: 0 };
  const base = Math.max(0, agiExcl - brackets.stdDed);
  const basicBand = brackets.higherThresh ?? 37700;
  const roomAtBasic = Math.max(0, basicBand - base);
  const atBasic = Math.min(gainAfterAllowance, roomAtBasic);
  const atHigher = Math.max(0, gainAfterAllowance - atBasic);
  const rBasic = brackets.capGainRateBasic ?? 0.18;
  const rHigher = brackets.capGainRateHigher ?? 0.24;
  const tax = atBasic * rBasic + atHigher * rHigher;
  return { tax, niit: 0 };
}

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

function computeDeferredFull(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets } = p;
  const base = Math.max(0, agiExcl - brackets.stdDed);
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
  let taxOnGainOnly = 0;

  const name = setup.name.toLowerCase();

  if (name === 'sipp') {
    if (currentAge + years < setup.thresholdAge) {
      penalty = setup.penaltyRate * withdrawn;
      taxOnGainOnly = setup.penaltyRate * gain;
    } else {
      const taxableFull = 0.75 * withdrawn;
      const taxablePrincipal = 0.75 * initial;
      const base = Math.max(0, agiExcl - brackets.stdDed);
      tax = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, base, taxableFull);
      const taxPrincipal = taxIncrement(
        brackets.ordinary.uppers,
        brackets.ordinary.rates,
        base,
        taxablePrincipal
      );
      taxOnGainOnly = Math.max(0, tax - taxPrincipal);
    }
  } else if (name === 'isa') {
    // tax-free
  } else if (name === 'taxable') {
    const { tax: taxableTax, niit: taxableNiit } = computeTaxable({
      country: 'uk',
      status,
      agiExcl,
      taxableAmount: gain,
      isLong: years > 1,
      brackets,
      isCrypto,
      years,
    });
    tax = taxableTax;
    niit = taxableNiit;
    taxOnGainOnly = tax + niit;
  }

  const taxPct = gain > 0 ? (taxOnGainOnly / gain) * 100 : 0;
  const totalReported = tax + niit + penalty;

  return { tax: totalReported, niit, penalty, taxPct };
}

export const uk: any = {
  key: 'uk',
  name: 'United Kingdom',
  currency: 'GBP',
  statuses,
  cryptoNote: 'Capital gains tax (10-20%) on disposals. Income tax (20-45%) on staking/lending rewards. GBP 6,000 CGT allowance.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
  computeSetupTax,
};
