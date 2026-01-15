// lib/tax/southkorea.ts
import type { Brackets, Setup, TaxableParams, CalcOut, TaxParams } from './types';
import { createCountryBrackets, taxIncrement } from './utils/tax-calculations';

// South Korea tax brackets (from data.json: No capital gains tax until 2028; 6-45% progressive if over KRW 2.5M threshold starting 2028)
function getBrackets(status: string): Brackets {
  return createCountryBrackets({
    ordinary: {
      uppers: [14000000, 50000000, 88000000, 150000000, 300000000, 500000000, 1000000000, Number.POSITIVE_INFINITY],
      rates: [0.06, 0.15, 0.24, 0.35, 0.38, 0.40, 0.42, 0.45], // Progressive rates for staking/mining as income in KRW
    },
    lt: {
      uppers: [2500000, 14000000, 50000000, 88000000, 150000000, 300000000, 500000000, 1000000000, Number.POSITIVE_INFINITY],
      rates: [0, 0.06, 0.15, 0.24, 0.35, 0.38, 0.40, 0.42, 0.45], // No tax until 2028, then progressive if over KRW 2.5M
    },
    stdDed: 0, // No standard deduction mentioned
    niitThresh: 0, // No NIIT in South Korea
    exemptThreshold: 2500000, // KRW 2.5M threshold
    postponedUntil: '2026-01-01', // Capital gains tax postponed to 2026
    irpBenefits: true, // Individual Retirement Pension (IRP) benefits
    isaBenefits: true, // Individual Savings Account (ISA) benefits
  });
}

const statuses = ['single'];

const setups: Setup[] = [
  {
    name: 'IRP',
    type: 'taxfree',
    fees: 'Tax credits on contributions, tax-free if annuity after 55.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'ISA',
    type: 'taxfree',
    fees: 'Tax-free gains up to KRW 200 million lifetime.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Taxable Account',
    type: 'taxable',
    fees: 'No withdrawal restrictions',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  }
];

// Custom computation functions for South Korea's unique crypto tax rules
function computeTaxable(p: TaxableParams) {
  const { agiExcl, taxableAmount, brackets, isCrypto } = p;

  let tax = 0;

  if (isCrypto) {
    // South Korea crypto rules:
    // - Tax postponed until 2026 (currently 0%)
    // - After 2026: 20% on gains over KRW 2.5M exemption
    const postponedUntil = (brackets as any).postponedUntil ?? '2026-01-01';
    const currentDate = new Date();
    const postponedDate = new Date(postponedUntil);

    if (currentDate < postponedDate) {
      // Tax is postponed - 0% tax
      tax = 0;
    } else {
      // After postponement: 20% tax on gains over KRW 2.5M exemption
      const exemptThreshold = (brackets as any).exemptThreshold ?? 2500000;
      const taxableGains = Math.max(0, taxableAmount - exemptThreshold);
      tax = taxableGains * 0.20; // 20% flat rate
    }
  } else {
    // Regular investments - progressive tax
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
    // IRP - tax on withdrawal as ordinary income
    const result = computeDeferredFull({
      country: 'southkorea',
      status,
      agiExcl,
      taxableAmount: withdrawn,
      isLong: years > 1,
      brackets,
      isCrypto: false,
      years,
    });
    tax = result.tax;
    niit = result.niit;
  } else if (setup.type === 'taxfree') {
    // IRP (annuity after 55) or ISA - tax-free
    tax = 0;
    niit = 0;
  } else {
    // Taxable accounts
    const taxableParams = {
      country: 'southkorea' as const,
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
  }

  // Add any additional penalty
  penalty += withdrawn * additionalPenalty;

  const totalTax = tax + niit + penalty;

  // Calculate tax percentage
  let taxPct = 0;
  if (setup.type === 'deferred') {
    taxPct = withdrawn > 0 ? (totalTax / withdrawn) * 100 : 0;
  } else if (setup.type === 'taxfree') {
    taxPct = 0;
  } else {
    // For crypto (after 2026): Use taxable gain after KRW 2.5M exemption
    // For non-crypto: Use full gain (no exemption)
    let taxableGain = gain;
    if (isCrypto) {
      const exemptThreshold = (brackets as any).exemptThreshold ?? 2500000;
      taxableGain = Math.max(0, gain - exemptThreshold);
    }
    taxPct = taxableGain > 0 ? (totalTax / taxableGain) * 100 : 0;
  }

  return {
    tax: totalTax,
    niit,
    penalty,
    taxPct,
  };
}

export const southkorea: any = {
  key: 'southkorea',
  name: 'South Korea',
  currency: 'KRW', // South Korean Won
  statuses,
  cryptoNote: '20% tax on gains over KRW 2.5M (postponed to 2026 from original 2022 implementation). Staking/mining taxed as income at progressive rates 6-45%.',
  setups,
  getBrackets,
  computeTaxable,
  computeDeferredFull,
  computeSetupTax,
};
