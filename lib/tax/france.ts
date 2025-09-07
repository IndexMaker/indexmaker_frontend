// lib/tax/france.ts
import type { Brackets, CalcOut, CountryModule, Setup, TaxableParams, TaxParams } from './types';

// ---------- Helpers ----------
function calcProgressiveTax(income: number, uppers: readonly number[], rates: readonly number[]) {
  let tax = 0,
    prev = 0;
  const inc = Math.max(0, income);
  for (let i = 0; i < uppers.length; i++) {
    const upper = uppers[i],
      rate = rates[i];
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
function computeCEHR(referenceIncome: number, isMarried: boolean) {
  const t1 = isMarried ? 500_000 : 250_000;
  const t2 = isMarried ? 1_000_000 : 500_000;
  const over1 = Math.max(0, Math.min(referenceIncome, t2) - t1);
  const over2 = Math.max(0, referenceIncome - t2);
  return 0.03 * over1 + 0.04 * over2;
}

// ---------- Brackets (quotient familial: thresholds scale with parts) ----------
const STATUSES = ['single', 'married'] as const;
function getBrackets(status: string): any {
  const parts = status === 'married' ? 2 : 1;
  // 2025 IR (on 2024 income) per part
  const perPartUppers = [11_294, 28_797, 82_341, 177_106, Number.POSITIVE_INFINITY];
  const rates = [0, 0.11, 0.3, 0.41, 0.45];
  const uppers = perPartUppers.map((u) => (u === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : u * parts));
  return {
    ordinary: { uppers, rates },
    lt: null, // no LT distinction for securities
    stdDed: 0, // no US-style std deduction
    niitThresh: 0,
  };
}

// ---------- Setups ----------
const setups: Setup[] = [
  {
    name: 'PEA',
    type: 'taxfree', // model assumes ≥5y holding
    fees: 'Tax-free on gains/dividends after 5y. Early withdrawal before 5y: flat 30% on gains.',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'Assurance-Vie',
    type: 'deferred',
    fees: 'Tax on gains depending on holding time: <8y 30%, >=8y 24.7% on gains over abatement (EUR 4,600 single, EUR 9,200 couple).',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
  {
    name: 'PER (Deductible)',
    type: 'deferred',
    fees: 'Contributions deductible within caps. Lump-sum at withdrawal: principal at progressive IR (no social), gains at 30% PFU. CEHR may apply on principal.',
    penaltyRate: 0,
    thresholdAge: 62,
  },
  {
    name: 'Compte-Titres Ordinaire (CTO)',
    type: 'taxable',
    fees: 'PFU 30% on realized gains/dividends by default (12.8% IR + 17.2% social).',
    penaltyRate: 0,
    thresholdAge: Number.POSITIVE_INFINITY,
  },
];

// ---------- Tax engines ----------

/**
 * CTO and crypto => PFU 30% (2025): 12.8% IR + 17.2% social.
 * Crypto gets EUR 305 annual allowance.
 * Return the full flat tax in `tax` so UI shows total actually paid.
 */
function computeTaxable(p: TaxableParams) {
  const { taxableAmount, isCrypto } = p;
  const allowance = isCrypto ? 305 : 0;
  const gain = Math.max(0, taxableAmount - allowance);
  const totalPFU = 0.3 * gain;
  return { tax: totalPFU, niit: 0 };
}

/**
 * Deferred wrappers (Assurance-Vie simplified, PER): tax the full withdrawal amount
 * at progressive IR. CEHR applied incrementally. This matches the app’s
 * “taxFull − taxOnPrincipal” pattern to isolate tax on gains, avoiding zeros.
 *
 * Note: AV’s detailed PFU-by-holding rules and >8y abatements require gain-level
 * data inside the engine, which the current interface does not pass. Use PEA if
 * you need tax-free treatment by holding time in this UI.
 */
function computeDeferredFull(p: TaxableParams) {
  const { status, agiExcl, taxableAmount, brackets } = p;
  const isMarried = status === 'married';

  // Progressive IR on the added amount
  const baseTaxable = agiExcl;
  const ir = taxIncrement(
    brackets.ordinary.uppers,
    brackets.ordinary.rates,
    baseTaxable,
    taxableAmount
  );

  // CEHR delta
  const refBefore = Math.max(0, agiExcl);
  const refAfter = refBefore + Math.max(0, taxableAmount);
  const cehr = computeCEHR(refAfter, isMarried) - computeCEHR(refBefore, isMarried);

  // Return IR in tax; CEHR in niit bucket (surcharge-like)
  return { tax: ir, niit: Math.max(0, cehr) };
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
  const isMarried = status === 'married';
  const withdrawn = initial + gain;

  let tax = 0;
  let niit = 0;
  let penalty = 0;
  let taxOnGainOnly = 0;

  const name = setup.name.toLowerCase();

  if (name === 'pea') {
    if (years >= 5) {
      // tax-free
    } else {
      tax = 0.128 * gain;
      niit = 0.172 * gain;
    }
    taxOnGainOnly = tax + niit;
  } else if (name === 'assurance-vie') {
    const over8 = years >= 8;
    const irRate = over8 ? 0.075 : 0.128;
    const abatement = over8 ? (isMarried ? 9200 : 4600) : 0;
    const taxableGain = Math.max(0, gain - abatement);
    tax = irRate * taxableGain;
    niit = 0.172 * taxableGain;
    taxOnGainOnly = tax + niit;
  } else if (name === 'per (deductible)') {
    const added = initial;
    const baseIr = taxIncrement(brackets.ordinary.uppers, brackets.ordinary.rates, agiExcl, added);
    const baseCehr = computeCEHR(agiExcl + added, isMarried) - computeCEHR(agiExcl, isMarried);
    tax = baseIr + 0.128 * gain;
    niit = baseCehr + 0.172 * gain;
    taxOnGainOnly = 0.3 * gain;

    const retirementAge = 62;
    if (currentAge + years < retirementAge) {
      penalty = additionalPenalty * withdrawn;
    }
  } else if (name === 'compte-titres ordinaire (cto)') {
    const allowance = isCrypto ? 305 : 0;
    const taxableGain = Math.max(0, gain - allowance);
    tax = 0.128 * taxableGain;
    niit = 0.172 * taxableGain;
    taxOnGainOnly = tax + niit;
  }

  const taxPct = gain > 0 ? (taxOnGainOnly / gain) * 100 : 0;
  const totalReported = tax + niit + penalty;

  return { tax: totalReported, niit, penalty, taxPct };
}

// ---------- Module ----------
export const france: any = {
  key: 'france' as const,
  name: 'France',
  currency: 'EUR',
  statuses: Array.from(STATUSES),
  getBrackets,
  setups,
  cryptoNote:
    'CTO and crypto taxed at PFU 30% (2025). PEA tax-free after 5y. Deferred wrappers taxed at progressive IR; CEHR may add 3–4% over high thresholds.',
  computeTaxable,
  computeDeferredFull,
  computeSetupTax,
};
