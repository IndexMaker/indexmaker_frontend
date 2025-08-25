// app/page.tsx
'use client';

import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Removed unused Select imports - using NativeSelect instead
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CountryContext } from 'react-svg-worldmap';
import WorldMap from 'react-svg-worldmap';

import { AdvancedDefiYieldConfigurator } from '@/components/defi';
import { CalculatorErrorBoundary } from '@/components/error/calculator-error-boundary';
import {
    type Brackets,
    type CalcOut,
    type CountryModule,
    type Setup,
    countryModules,
    pickDefaultRetirementSetup,
} from '@/lib/tax';
import { CurrencyFormatter } from '@/lib/tax/utils/currency-formatter';
import { getCurrencyInfo } from '@/lib/tax/utils/currency-mapping';
import { UnifiedTaxEngine } from '@/lib/tax/engines/unified-tax-engine';
import { log } from '@/lib/utils/client-logger';
// Removed branded types - using plain numbers instead

// Removed unused type TaxableResult

const countryMapping: Record<string, keyof typeof countryModules> = {
  US: 'usa',
  CA: 'canada',
  GB: 'uk',
  AU: 'australia',
  DE: 'germany',
  FR: 'france',
  JP: 'japan',
  IN: 'india',
  IT: 'italy',
  BR: 'brazil',
};

// Comprehensive country colors for world map - each country gets a distinct color
const countryColors: Record<string, string> = {
  // Currently implemented countries
  usa: '#1e40af',      // Blue
  canada: '#dc2626',   // Red
  uk: '#7c3aed',       // Purple
  australia: '#059669', // Green
  germany: '#ea580c',  // Orange
  france: '#0891b2',   // Cyan
  japan: '#be185d',    // Pink
  india: '#65a30d',    // Lime
  italy: '#c2410c',    // Orange-red
  brazil: '#0d9488',   // Teal

  // Additional countries from data.json - distinct colors
  china: '#ef4444',        // Red-500
  russia: '#8b5cf6',       // Violet-500
  southkorea: '#10b981',   // Emerald-500
  spain: '#f59e0b',        // Amber-500
  mexico: '#06b6d4',       // Cyan-500
  indonesia: '#ec4899',    // Pink-500
  turkey: '#84cc16',       // Lime-500
  netherlands: '#f97316',  // Orange-500
  saudiarabia: '#3b82f6',  // Blue-500
  switzerland: '#6366f1',  // Indigo-500
  poland: '#14b8a6',       // Teal-500
  taiwan: '#f43f5e',       // Rose-500
  belgium: '#a855f7',      // Purple-500
  sweden: '#22c55e',       // Green-500
  ireland: '#eab308',      // Yellow-500
  argentina: '#0ea5e9',    // Sky-500
  uae: '#d946ef',          // Fuchsia-500
  singapore: '#65a30d',    // Lime-600
  austria: '#dc2626',      // Red-600
  israel: '#7c3aed',       // Violet-600
  thailand: '#059669',     // Emerald-600
  philippines: '#ea580c',  // Orange-600
  norway: '#0891b2',       // Cyan-600
  vietnam: '#be185d',      // Pink-600
  malaysia: '#c2410c',     // Orange-red-600
  bangladesh: '#0d9488',   // Teal-600
  iran: '#1e40af',         // Blue-600
  denmark: '#7c2d12',      // Orange-800
  hongkong: '#991b1b',     // Red-800
  colombia: '#581c87',     // Purple-800
  southafrica: '#064e3b',  // Emerald-800
  romania: '#92400e',      // Amber-800
  pakistan: '#155e75',     // Cyan-800
  chile: '#be123c',        // Rose-800
  czechrepublic: '#6b21a8', // Purple-800
  egypt: '#166534',        // Green-800
  finland: '#a16207',      // Amber-700
  portugal: '#0c4a6e',     // Sky-800
  kazakhstan: '#be185d',   // Pink-700
  peru: '#b91c1c',         // Red-700
  iraq: '#7e22ce',         // Purple-700
  greece: '#047857',       // Emerald-700
  algeria: '#c2410c',      // Orange-700
};

// Map country codes to our internal country keys (ISO country codes)
const mapCountryToKey: Record<string, string> = {
  // Currently implemented
  'us': 'usa',
  'ca': 'canada',
  'gb': 'uk',
  'au': 'australia',
  'de': 'germany',
  'fr': 'france',
  'jp': 'japan',
  'in': 'india',
  'it': 'italy',
  'br': 'brazil',

  // Additional countries from data.json
  'cn': 'china',
  'ru': 'russia',
  'kr': 'southkorea',
  'es': 'spain',
  'mx': 'mexico',
  'id': 'indonesia',
  'tr': 'turkey',
  'nl': 'netherlands',
  'sa': 'saudiarabia',
  'ch': 'switzerland',
  'pl': 'poland',
  'tw': 'taiwan',
  'be': 'belgium',
  'se': 'sweden',
  'ie': 'ireland',
  'ar': 'argentina',
  'ae': 'uae',
  'sg': 'singapore',
  'at': 'austria',
  'il': 'israel',
  'th': 'thailand',
  'ph': 'philippines',
  'no': 'norway',
  'vn': 'vietnam',
  'my': 'malaysia',
  'bd': 'bangladesh',
  'ir': 'iran',
  'dk': 'denmark',
  'hk': 'hongkong',
  'co': 'colombia',
  'za': 'southafrica',
  'ro': 'romania',
  'pk': 'pakistan',
  'cl': 'chile',
  'cz': 'czechrepublic',
  'eg': 'egypt',
  'fi': 'finland',
  'pt': 'portugal',
  'kz': 'kazakhstan',
  'pe': 'peru',
  'iq': 'iraq',
  'gr': 'greece',
  'dz': 'algeria',
};

const yearsRange = [1, 3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const returnsRange = [0.01, 0.03, 0.05, 0.07, 0.1, 0.12, 0.15, 0.2];

const scenarios: { name: string; annualRate: number }[] = [
  { name: 'Stock Market', annualRate: 0.07 },
  { name: 'Crypto Market', annualRate: 0.2 },
  { name: '60/40 Portfolio', annualRate: 0.06 },
  { name: 'Bonds', annualRate: 0.04 },
  { name: 'Real Estate', annualRate: 0.05 },
  { name: 'Tech Stocks', annualRate: 0.12 },
  { name: 'Conservative', annualRate: 0.03 },
  { name: 'Aggressive Growth', annualRate: 0.15 },
  { name: 'Custom', annualRate: 0 },
];

// ---------- generic helpers local to page ----------
function computeAfterTax(
  rate: number,
  years: number,
  isCrypto: boolean,
  setup: Setup | null,
  mod: CountryModule,
  brackets: Brackets,
  status: string,
  agiExcl: number,
  initial: number,
  currentAge: number,
  additionalPenalty: number
) {
  const final = initial * Math.pow(1 + rate, years);
  const { tax: totalTax } = calculateTaxes(
    mod.key,
    status,
    agiExcl,
    initial,
    years,
    rate,
    years > 1,
    setup,
    brackets,
    currentAge,
    isCrypto,
    additionalPenalty,
    mod
  );
  return final - totalTax;
}

// Helper functions for crypto parameter adjustments
/**
 * Calculate compounding frequency bonus for crypto investments
 * @param frequency - Compounding frequency ('daily', 'weekly', 'monthly', 'quarterly', 'annually')
 * @returns Bonus percentage as decimal (e.g., 0.005 = 0.5%)
 */
function getCompoundingBonus(frequency: string): number {
  switch (frequency) {
    case 'daily':
      return 0.005; // 0.5% benefit for daily compounding
    case 'weekly':
      return 0.003; // 0.3% benefit for weekly compounding
    case 'monthly':
      return 0.002; // 0.2% benefit for monthly compounding
    case 'quarterly':
      return 0.001; // 0.1% benefit for quarterly compounding
    case 'annually':
      return 0; // no benefit for annual compounding
    default:
      return 0.002;
  }
}

/**
 * Calculate risk adjustment based on crypto investment strategy
 * @param strategyName - Name of the crypto investment strategy
 * @returns Risk adjustment as decimal (e.g., 0.02 = 2% additional risk premium)
 */
function getStrategyRiskAdjustment(strategyName: string): number {
  switch (strategyName) {
    case 'Bitcoin/Ethereum Hold':
      return 0.02; // 2% risk premium for volatility
    case 'Stablecoin Yield':
      return -0.01; // -1% for lower risk (easier to beat traditional)
    case 'Crypto Index ETF':
      return 0.005; // 0.5% for diversification benefit
    case 'DeFi Liquidity Providing':
      return 0.03; // 3% for IL risk
    case 'Crypto Staking':
      return 0.015; // 1.5% for staking risk
    case 'High-Risk DeFi':
      return 0.05; // 5% for high risk strategies
    default:
      return 0.02; // default risk adjustment
  }
}

// Advanced DeFi parameter adjustments
function getSlippageImpact(slippageTolerance: number): number {
  // Higher slippage tolerance = less impact on yield (more flexibility)
  // Lower slippage tolerance = more impact (frequent failed transactions)
  const baseSlippage = 0.5; // 0.5% baseline
  return Math.max(0, (baseSlippage - slippageTolerance) * 0.002); // 0.2% penalty per 0.1% below baseline
}

function getGasPriceImpact(gasPrice: number): number {
  // Higher gas price = higher costs = lower effective yield
  const baseGasPrice = 20; // 20 gwei baseline
  return Math.max(0, (gasPrice - baseGasPrice) * 0.0005); // 0.05% penalty per gwei above baseline
}

function getRebalanceImpact(rebalanceThreshold: number): number {
  // Higher rebalance threshold = less frequent rebalancing = higher drift risk
  // Lower rebalance threshold = more frequent rebalancing = higher gas costs
  const optimalThreshold = 2.0; // 2% optimal threshold
  const deviation = Math.abs(rebalanceThreshold - optimalThreshold);
  return deviation * 0.001; // 0.1% penalty per 1% deviation from optimal
}

function getMaxDrawdownImpact(maxDrawdown: number): number {
  // Higher max drawdown = higher risk tolerance = potential for better returns
  // Lower max drawdown = more conservative = lower potential returns
  const baseDrawdown = 10.0; // 10% baseline
  return (baseDrawdown - maxDrawdown) * 0.002; // 0.2% penalty per 1% below baseline (being too conservative)
}

function findBreakEvenDelta(
  baseRate: number,
  years: number,
  cryptoSetup: Setup,
  setup: Setup | null,
  mod: CountryModule,
  brackets: Brackets,
  status: string,
  agiExcl: number,
  initial: number,
  currentAge: number,
  additionalPenalty: number
) {
  if (!setup) return 0;

  const target = computeAfterTax(
    baseRate,
    years,
    false,
    setup,
    mod,
    brackets,
    status,
    agiExcl,
    initial,
    currentAge,
    additionalPenalty
  );

  // Check if crypto already beats traditional at the same rate
  const cryptoAtSameRate = computeAfterTax(
    baseRate,
    years,
    true,
    cryptoSetup,
    mod,
    brackets,
    status,
    agiExcl,
    initial,
    currentAge,
    additionalPenalty
  );

  // If crypto already wins at same rate, find how much LOWER crypto can be and still win
  if (cryptoAtSameRate >= target) {
    let low = -baseRate; // Can't go below -100% return
    let high = 0;
    const eps = 1e-4;
    let iterations = 80;

    while (high - low > eps && iterations-- > 0) {
      const mid = (low + high) / 2;
      const v = computeAfterTax(
        baseRate + mid,
        years,
        true,
        cryptoSetup,
        mod,
        brackets,
        status,
        agiExcl,
        initial,
        currentAge,
        additionalPenalty
      );
      if (v >= target)
        high = mid; // Crypto still wins, can go lower
      else low = mid; // Crypto loses, need higher rate
    }
    return (low + high) / 2; // This will be negative, showing crypto's advantage
  }

  // Original logic for when crypto needs higher yield to compete
  let low = 0;
  let high = 0.5;
  let afterCrypto = computeAfterTax(
    baseRate + high,
    years,
    true,
    cryptoSetup,
    mod,
    brackets,
    status,
    agiExcl,
    initial,
    currentAge,
    additionalPenalty
  );
  let guard = 0;
  while (afterCrypto < target && high < 5 && guard < 20) {
    high *= 2;
    afterCrypto = computeAfterTax(
      baseRate + high,
      years,
      true,
      cryptoSetup,
      mod,
      brackets,
      status,
      agiExcl,
      initial,
      currentAge,
      additionalPenalty
    );
    guard++;
  }
  if (afterCrypto < target) return high;

  const eps = 1e-4;
  let iterations = 80;
  while (high - low > eps && iterations-- > 0) {
    const mid = (low + high) / 2;
    const v = computeAfterTax(
      baseRate + mid,
      years,
      true,
      cryptoSetup,
      mod,
      brackets,
      status,
      agiExcl,
      initial,
      currentAge,
      additionalPenalty
    );
    if (v < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

function calculateTaxes(
  countryKey: string,
  status: string,
  agiExcl: number,
  initial: number,
  years: number,
  annualRate: number,
  isLong: boolean,
  setup: Setup | null,
  brackets: Brackets,
  currentAge: number,
  isCrypto: boolean,
  additionalPenalty: number,
  mod: CountryModule
): CalcOut {
  if (!setup)
    return {
      tax: 0,
      niit: 0,
      penalty: 0,
      taxPct: 0,
    };

  const finalValue = initial * Math.pow(1 + annualRate, years);
  const gain = Math.max(0, finalValue - initial);
  const withdrawn = initial + gain;

  if (mod.computeSetupTax) {
    const result = mod.computeSetupTax(setup, {
      status,
      agiExcl: agiExcl,
      initial: initial,
      gain: gain,
      years: years,
      isLong,
      currentAge: currentAge,
      isCrypto,
      additionalPenalty: additionalPenalty,
      brackets,
    });
    return result;
  }

  // Tax-free wrappers
  if (setup.type === 'taxfree') {
    return {
      tax: 0,
      niit: 0,
      penalty: 0,
      taxPct: 0,
    };
  }

  // AU Super fund-level
  if (setup.type === 'super') {
    const fundRate = isLong ? 0.1 : 0.15;
    const tax = gain * fundRate;
    const taxPct = gain > 0 ? (tax / gain) * 100 : 0;
    return {
      tax: tax,
      niit: 0,
      penalty: 0,
      taxPct: taxPct,
    };
  }

  // Taxable accounts use country module
  if (setup.type === 'taxable') {
    const result = mod.computeTaxable({
      country: countryKey as keyof typeof countryModules,
      status,
      agiExcl: agiExcl,
      taxableAmount: gain,
      isLong,
      brackets,
      isCrypto,
      years: years,
    });
    const { tax, niit } = result;
    const taxPct = gain > 0 ? tax / gain : 0;
    return { tax, niit, penalty: 0, taxPct };
  }

  // Default deferred = progressive ordinary via country module (difference-of-cumulative)
  const resultFull = mod.computeDeferredFull({
    country: countryKey as keyof typeof countryModules,
    status,
    agiExcl: agiExcl,
    taxableAmount: withdrawn,
    isLong,
    brackets,
    isCrypto,
    years: years,
  });
  const { tax: taxFull, niit: surFull } = resultFull;

  const resultPrincipal = mod.computeDeferredFull({
    country: countryKey as keyof typeof countryModules,
    status,
    agiExcl: agiExcl,
    taxableAmount: initial,
    isLong,
    brackets,
    isCrypto,
    years: years,
  });
  const { tax: taxOnPrincipal, niit: surOnPrincipal } = resultPrincipal;

  const penalty = 0;
  const taxOnGainOnly = Math.max(0, taxFull + surFull - (taxOnPrincipal + surOnPrincipal));
  const totalReported = taxFull + surFull + penalty;
  const taxPct = gain > 0 ? (taxOnGainOnly / gain) * 100 : 0;

  return {
    tax: totalReported,
    niit: surFull,
    penalty,
    taxPct: taxPct,
  };
}

function CalculatorContent() {
  const [country, setCountry] = useState<keyof typeof countryModules>('usa');
  const [status, setStatus] = useState<string>('single');
  const [agiExcl, setAgiExcl] = useState<number>(50000);
  const [initial, setInitial] = useState<number>(250000);
  const [scenario, setScenario] = useState<string>('Stock Market');
  const [customRate, setCustomRate] = useState<number>(0.07);
  const [years, setYears] = useState<number>(5);
  const [currentAge, setCurrentAge] = useState<number>(40);
  const [setupName, setSetupName] = useState<string>('Roth IRA'); // default USA Roth IRA
  const [divorce, setDivorce] = useState<boolean>(false);
  const [additionalPenalty, setAdditionalPenalty] = useState<number>(0);
  // values fed by DefiYieldConfigurator
  const [expectedDeFiExtra, setExpectedDeFiExtra] = useState<number>(0.0074); // defaults to Lending large-cap 0.74%
  const [cryptoVolatility, setCryptoVolatility] = useState<number>(15.0); // crypto price volatility
  const [taxDragAdjustment, setTaxDragAdjustment] = useState<number>(5.0); // additional tax drag
  const [selectedCryptoStrategy, setSelectedCryptoStrategy] = useState<string>(''); // selected strategy name
  const [cryptoCompoundingFreq, setCryptoCompoundingFreq] = useState<string>('daily'); // compounding frequency

  // Advanced DeFi parameters
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5); // slippage tolerance %
  const [gasPrice, setGasPrice] = useState<number>(20); // gas price in gwei
  const [rebalanceThreshold, setRebalanceThreshold] = useState<number>(2.0); // rebalance threshold %
  const [maxDrawdown, setMaxDrawdown] = useState<number>(10.0); // max drawdown %

  // Validation errors state
  // const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  // const [calculationError, setCalculationError] = useState<string | null>(null);

  // Results computed with useMemo to prevent infinite loops
  const [changed, setChanged] = useState<{ agiExcl: boolean; status: boolean }>({
    agiExcl: false,
    status: false,
  });

  const mod = useMemo(() => countryModules[country], [country]);

  // Safety check: if module doesn't exist, fall back to USA
  const safeCountry = useMemo(() => {
    if (!mod) {
      console.warn(`Country module not found for: ${country}, falling back to USA`);
      return 'usa';
    }
    return country;
  }, [mod, country]);

  const safeMod = useMemo(() => mod || countryModules.usa, [mod]);

  const brackets = useMemo(() => safeMod.getBrackets(status), [safeMod, status]);
  const setup = useMemo(
    () => (setupName ? safeMod.setups.find((s) => s.name === setupName) || null : null),
    [safeMod.setups, setupName]
  );

  // Currency formatting helper
  const formatCurrency = useCallback((amount: number, options?: { compact?: boolean; showCode?: boolean }) => {
    const { compact = false, showCode = false } = options || {};

    if (compact && Math.abs(amount) >= 1000) {
      return CurrencyFormatter.formatCompact(amount, safeCountry);
    }

    return CurrencyFormatter.formatCurrency(amount, safeCountry, { showCode });
  }, [safeCountry]);

  // Auto-update setup when country changes if current setup doesn't exist in new country
  useEffect(() => {
    if (setupName && !safeMod.setups.find((s) => s.name === setupName)) {
      const defaultSetup = pickDefaultRetirementSetup(safeCountry);
      setSetupName(defaultSetup);
    }
  }, [safeCountry, setupName, safeMod.setups]);

  // Validation functions
  // const validateInput = (field: string, value: any) => {
  //   const rules = calculatorValidation[field as keyof typeof calculatorValidation];
  //   if (!rules) return;

  //   const result = validateField(value, rules as any);
  //   // setValidationErrors(prev => ({
  //   //   ...prev,
  //   //   [field]: result.isValid ? '' : (result.error || 'Invalid input')
  //   // }));

  //   return result;
  // };

  // const handleNumericInput = (field: string, value: string, setter: (val: number) => void) => {
  //   const sanitized = sanitizeNumericInput(value);
  //   const validation = validateInput(field, sanitized);

  //   if (validation?.isValid) {
  //     setter(validation.sanitizedValue || sanitized);
  //     // setCalculationError(null);
  //   } else {
  //     setter(sanitized); // Still update the value for user feedback
  //   }
  // };

  const mapData = useMemo(
    () => Object.entries(mapCountryToKey).map(([countryCode, countryKey]) => ({
      country: countryCode,
      value: 1,
      color: countryColors[countryKey]
    })),
    []
  );

  useEffect(() => {
    const preferred = pickDefaultRetirementSetup(safeCountry);
    if (preferred && preferred !== setupName) setSetupName(preferred);
    if (!changed.status && safeMod.statuses[0]) setStatus(safeMod.statuses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeCountry, safeMod]);

  const getAnnualRate = useMemo(
    () =>
      scenario === 'Custom'
        ? customRate
        : scenarios.find((s) => s.name === scenario)?.annualRate || 0,
    [scenario, customRate]
  );

  // Calculate adjusted crypto yield based on configurator parameters
  const adjustedCryptoYield = useMemo(() => {
    const volatilityPenalty = cryptoVolatility ? Math.max(0, (cryptoVolatility - 15) * 0.001) : 0; // 0.1% per 1% volatility above 15%
    const taxDragPenalty = taxDragAdjustment ? taxDragAdjustment * 0.01 : 0.05; // tax drag as penalty
    const compoundingBenefit = getCompoundingBonus(cryptoCompoundingFreq || 'daily');
    const strategyRiskPenalty = getStrategyRiskAdjustment(selectedCryptoStrategy || '');

    // Advanced DeFi parameter impacts
    const slippageImpact = getSlippageImpact(slippageTolerance);
    const gasPriceImpact = getGasPriceImpact(gasPrice);
    const rebalanceImpact = getRebalanceImpact(rebalanceThreshold);
    const maxDrawdownImpact = getMaxDrawdownImpact(maxDrawdown);

    // Adjust the expected crypto yield based on strategy and parameters
    // Negative adjustments mean crypto needs MORE yield to be competitive
    const totalAdjustment =
      -volatilityPenalty -
      taxDragPenalty -
      strategyRiskPenalty +
      compoundingBenefit -
      slippageImpact -
      gasPriceImpact -
      rebalanceImpact -
      maxDrawdownImpact;

    return expectedDeFiExtra + totalAdjustment;
  }, [
    expectedDeFiExtra,
    cryptoVolatility,
    taxDragAdjustment,
    cryptoCompoundingFreq,
    selectedCryptoStrategy,
    slippageTolerance,
    gasPrice,
    rebalanceThreshold,
    maxDrawdown,
  ]);

  const results = useMemo(() => {
    const annualRate = getAnnualRate;
    const cryptoSetup = safeMod.setups.find((s) => s.type === 'taxable') || safeMod.setups[0] || null;

    const etfTaxes = setup
      ? calculateTaxes(
          safeMod.key,
          status,
          agiExcl,
          initial,
          years,
          annualRate,
          years > 1,
          setup,
          brackets,
          currentAge,
          false,
          additionalPenalty,
          mod
        )
      : undefined;

    const cryptoTaxes = calculateTaxes(
      safeMod.key,
      status,
      agiExcl,
      initial,
      years,
      annualRate + expectedDeFiExtra,
      years > 1, // add DeFi extra to crypto baseline
      cryptoSetup,
      brackets,
      currentAge,
      true,
      additionalPenalty,
      mod
    );

    let divorcedEtf, divorcedCrypto;
    const maritalFeature = safeMod.statuses.includes('married');
    if (maritalFeature && divorce && status === 'married') {
      const divorcedBracketsResult = safeMod.getBrackets('single');
      const divorcedBrackets = divorcedBracketsResult;
      divorcedEtf = setup
        ? calculateTaxes(
            safeMod.key,
            'single',
            agiExcl,
            initial,
            years,
            annualRate,
            years > 1,
            setup,
            divorcedBrackets,
            currentAge,
            false,
            additionalPenalty,
            mod
          )
        : undefined;
      divorcedCrypto = calculateTaxes(
        safeMod.key,
        'single',
        agiExcl,
        initial,
        years,
        annualRate + expectedDeFiExtra,
        years > 1,
        cryptoSetup,
        divorcedBrackets,
        currentAge,
        true,
        additionalPenalty,
        mod
      );
    }

    let matrix: number[][] | undefined;
    // Calculate matrix for the best available tax-advantaged setup vs crypto taxable
    const matrixSetup = setup || safeMod.setups.find((s) => s.type !== 'taxable') || safeMod.setups[0];
    if (matrixSetup && cryptoSetup) {
      matrix = [];
      for (const y of yearsRange) {
        const row: number[] = [];
        for (const r of returnsRange) {
          const delta = findBreakEvenDelta(
            r,
            y,
            cryptoSetup,
            matrixSetup,
            mod,
            brackets,
            status,
            agiExcl,
            initial,
            currentAge,
            additionalPenalty
          );
          row.push(delta);
        }
        matrix.push(row);
      }
    }

    const resultsObj: {
      gain: number;
      etf?: { tax: number; niit: number; penalty: number; taxPct: number; fees: string };
      crypto: { tax: number; niit: number; penalty: number; taxPct: number; fees: string };
      divorcedEtf?: { tax: number; niit: number; penalty: number; taxPct: number; fees: string };
      divorcedCrypto?: { tax: number; niit: number; penalty: number; taxPct: number; fees: string };
      matrix?: number[][];
    } = {
      gain: initial * Math.pow(1 + annualRate, years) - initial,
      crypto: {
        tax: cryptoTaxes.tax,
        niit: cryptoTaxes.niit,
        penalty: cryptoTaxes.penalty,
        taxPct: cryptoTaxes.taxPct,
        fees: 'No specific fees for crypto in taxable accounts.',
      },
      ...(matrix && { matrix }),
    };

    if (etfTaxes) {
      resultsObj.etf = {
        tax: etfTaxes.tax,
        niit: etfTaxes.niit,
        penalty: etfTaxes.penalty,
        taxPct: etfTaxes.taxPct,
        fees: setup?.fees || '',
      };
    }

    if (divorcedEtf) {
      resultsObj.divorcedEtf = {
        tax: divorcedEtf.tax,
        niit: divorcedEtf.niit,
        penalty: divorcedEtf.penalty,
        taxPct: divorcedEtf.taxPct,
        fees: setup?.fees || '',
      };
    }

    if (divorcedCrypto) {
      resultsObj.divorcedCrypto = {
        tax: divorcedCrypto.tax,
        niit: divorcedCrypto.niit,
        penalty: divorcedCrypto.penalty,
        taxPct: divorcedCrypto.taxPct,
        fees: 'No specific fees for crypto in taxable accounts.',
      };
    }

    return resultsObj;
  }, [
    country,
    status,
    agiExcl,
    initial,
    scenario,
    customRate,
    years,
    currentAge,
    setupName,
    divorce,
    additionalPenalty,
    expectedDeFiExtra,
    cryptoVolatility,
    taxDragAdjustment,
    selectedCryptoStrategy,
    cryptoCompoundingFreq,
    brackets,
    getAnnualRate,
    safeMod,
    setup,
  ]);

  const handleMapClick = ({ countryCode }: CountryContext) => {
    // First try the old mapping for supported countries
    const mapped = countryMapping[countryCode.toUpperCase()];
    if (mapped) {
      setCountry(mapped);
      return;
    }

    // Then check if it's in our comprehensive mapping
    const countryKey = mapCountryToKey[countryCode.toLowerCase()];
    if (countryKey) {
      // Show info for countries with data but no calculator yet
      const countryName = countryKey.charAt(0).toUpperCase() + countryKey.slice(1).replace(/([A-Z])/g, ' $1');
      alert(`${countryName}: Full tax calculator coming soon! This country has crypto tax data available in our database. Click on a highlighted country in the dropdown for full calculator support.`);
    }
  };

  // Move hooks outside conditional rendering
  const onConfigChange = useCallback(
    (config: {
      enabled: boolean;
      baseYield: number;
      volatility: number;
      compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
      riskAdjustment: number;
      strategy?: { name: string; baseYield: number; riskLevel: string };
      customParameters?: Record<string, number>;
    }) => {
      setExpectedDeFiExtra(config.baseYield / 100);
      setCryptoVolatility(config.volatility);
      setTaxDragAdjustment(config.riskAdjustment);
      setSelectedCryptoStrategy(config.strategy?.name || '');
      setCryptoCompoundingFreq(config.compoundingFrequency);

      // Update advanced parameters if provided
      if (config.customParameters) {
        setSlippageTolerance(config.customParameters.slippageTolerance || 0.5);
        setGasPrice(config.customParameters.gasPrice || 20);
        setRebalanceThreshold(config.customParameters.rebalanceThreshold || 2.0);
        setMaxDrawdown(config.customParameters.maxDrawdown || 10.0);
      }
    },
    []
  );

  const initialConfig = useMemo(
    () => ({
      enabled: expectedDeFiExtra > 0,
      baseYield: expectedDeFiExtra * 100,
      volatility: cryptoVolatility,
      compoundingFrequency: cryptoCompoundingFreq as
        | 'daily'
        | 'weekly'
        | 'monthly'
        | 'quarterly'
        | 'annually',
      riskAdjustment: taxDragAdjustment,
      strategy: selectedCryptoStrategy ? { name: selectedCryptoStrategy, baseYield: expectedDeFiExtra * 100, riskLevel: 'medium' } : undefined,
      customParameters: {
        slippageTolerance,
        gasPrice,
        rebalanceThreshold,
        maxDrawdown,
      },
    }),
    [
      expectedDeFiExtra,
      cryptoVolatility,
      cryptoCompoundingFreq,
      taxDragAdjustment,
      selectedCryptoStrategy,
      slippageTolerance,
      gasPrice,
      rebalanceThreshold,
      maxDrawdown,
    ]
  );

  const maritalFeature = safeMod.statuses.includes('married');

  const nearestReturnIdx = useMemo(() => {
    const ar = getAnnualRate;
    let idx = 0;
    let best = Number.POSITIVE_INFINITY;
    returnsRange.forEach((r, i) => {
      const diff = Math.abs(r - ar);
      if (diff < best) {
        best = diff;
        idx = i;
      }
    });
    return idx;
  }, [getAnnualRate]);

  const selectedYearIdx = useMemo(() => {
    const y = Math.max(1, Math.round(years));
    let idx = 0;
    let best = Number.POSITIVE_INFINITY;
    yearsRange.forEach((val, i) => {
      const diff = Math.abs(val - y);
      if (diff < best) {
        best = diff;
        idx = i;
      }
    });
    return idx;
  }, [years]);

  const cellClass = (i: number, j: number) => {
    const isRow = i === selectedYearIdx;
    const isCol = j === nearestReturnIdx;
    if (isRow && isCol) return 'bg-red-600 text-white font-semibold';
    if (isRow || isCol) return 'bg-red-50 border border-red-200';
    return '';
  };

  // Helper function for color-coded percentages with accessibility considerations
  const getPercentageColor = (value: number, isHighlighted: boolean = false) => {
    if (isHighlighted) {
      // Use white text for highlighted cells with dark background
      return 'text-white';
    }
    // Use high-contrast colors for better accessibility
    if (value > 0) return 'text-green-700 font-medium';
    if (value < 0) return 'text-red-700 font-medium';
    return 'text-gray-800 font-medium';
  };

  const formatPercentage = (value: number) => {
    const formatted = Math.abs(value) < 0.005 ? '0.00' : value.toFixed(2);
    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(Number.parseFloat(formatted))}%`;
  };

  return (
    <div className="calculator-container container mx-auto p-4 bg-white min-h-screen">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="bg-white border-b border-gray-200">
          <CardTitle className="text-gray-900 text-2xl font-bold">Multi-Country Tax Calculator: ETFs vs Crypto</CardTitle>
          <CardDescription className="text-gray-600">
            Roth IRA selected by default for USA. Preset years for break-even matrix.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 bg-white text-gray-900">
          {/* Map */}
          <div className="w-full flex justify-center items-center">
            <div className="w-full max-w-[900px] mb-6 bg-white p-4 rounded-lg border border-gray-200">
              <WorldMap
                color="#f9fafb"
                size="xl"
                data={mapData}
                onClickFunction={handleMapClick}
                styleFunction={(context) => {
                  const countryKey = mapCountryToKey[context.countryCode];
                  const isSelected = country === countryKey;

                  if (countryKey) {
                    // Supported country - show in full color if selected, light gray if not
                    return {
                      fill: isSelected ? countryColors[countryKey] : '#e5e7eb',
                      stroke: '#374151', // Dark gray border for all supported countries
                      strokeWidth: isSelected ? 4 : 2.5, // Bold borders - thicker for selected
                      cursor: 'pointer',
                      opacity: 1
                    };
                  }

                  // Unsupported country - show in very light gray with bold border
                  return {
                    fill: '#f9fafb',
                    stroke: '#d1d5db',
                    strokeWidth: 1.5, // Bold border for unsupported countries too
                    cursor: 'default',
                    opacity: 0.7
                  };
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-6 rounded-lg border border-gray-200">
            <div>
              <Label className="text-gray-900 font-medium">Country</Label>
              <NativeSelect
                value={country}
                onChange={(e) => setCountry(e.target.value as keyof typeof countryModules)}
                placeholder="Select country"
                className="mt-1 bg-white border-gray-300 text-gray-900"
              >
                {/* All supported countries */}
                <NativeSelectOption value="algeria">🇩🇿 Algeria</NativeSelectOption>
                <NativeSelectOption value="argentina">🇦🇷 Argentina</NativeSelectOption>
                <NativeSelectOption value="australia">🇦🇺 Australia</NativeSelectOption>
                <NativeSelectOption value="austria">🇦🇹 Austria</NativeSelectOption>
                <NativeSelectOption value="bangladesh">🇧🇩 Bangladesh</NativeSelectOption>
                <NativeSelectOption value="belgium">🇧🇪 Belgium</NativeSelectOption>
                <NativeSelectOption value="brazil">🇧🇷 Brazil</NativeSelectOption>
                <NativeSelectOption value="canada">🇨🇦 Canada</NativeSelectOption>
                <NativeSelectOption value="chile">🇨🇱 Chile</NativeSelectOption>
                <NativeSelectOption value="china">🇨🇳 China</NativeSelectOption>
                <NativeSelectOption value="colombia">🇨🇴 Colombia</NativeSelectOption>
                <NativeSelectOption value="czechrepublic">🇨🇿 Czech Republic</NativeSelectOption>
                <NativeSelectOption value="denmark">🇩🇰 Denmark</NativeSelectOption>
                <NativeSelectOption value="egypt">🇪🇬 Egypt</NativeSelectOption>
                <NativeSelectOption value="finland">🇫🇮 Finland</NativeSelectOption>
                <NativeSelectOption value="france">🇫🇷 France</NativeSelectOption>
                <NativeSelectOption value="germany">🇩🇪 Germany</NativeSelectOption>
                <NativeSelectOption value="greece">🇬🇷 Greece</NativeSelectOption>
                <NativeSelectOption value="hongkong">🇭🇰 Hong Kong</NativeSelectOption>
                <NativeSelectOption value="india">🇮🇳 India</NativeSelectOption>
                <NativeSelectOption value="indonesia">🇮🇩 Indonesia</NativeSelectOption>
                <NativeSelectOption value="iran">🇮🇷 Iran</NativeSelectOption>
                <NativeSelectOption value="iraq">🇮🇶 Iraq</NativeSelectOption>
                <NativeSelectOption value="ireland">🇮🇪 Ireland</NativeSelectOption>
                <NativeSelectOption value="israel">🇮🇱 Israel</NativeSelectOption>
                <NativeSelectOption value="italy">🇮🇹 Italy</NativeSelectOption>
                <NativeSelectOption value="japan">🇯🇵 Japan</NativeSelectOption>
                <NativeSelectOption value="kazakhstan">🇰🇿 Kazakhstan</NativeSelectOption>
                <NativeSelectOption value="malaysia">🇲🇾 Malaysia</NativeSelectOption>
                <NativeSelectOption value="mexico">🇲🇽 Mexico</NativeSelectOption>
                <NativeSelectOption value="netherlands">🇳🇱 Netherlands</NativeSelectOption>
                <NativeSelectOption value="norway">🇳🇴 Norway</NativeSelectOption>
                <NativeSelectOption value="pakistan">🇵🇰 Pakistan</NativeSelectOption>
                <NativeSelectOption value="peru">🇵🇪 Peru</NativeSelectOption>
                <NativeSelectOption value="philippines">🇵🇭 Philippines</NativeSelectOption>
                <NativeSelectOption value="poland">🇵🇱 Poland</NativeSelectOption>
                <NativeSelectOption value="portugal">🇵🇹 Portugal</NativeSelectOption>
                <NativeSelectOption value="romania">🇷🇴 Romania</NativeSelectOption>
                <NativeSelectOption value="russia">🇷🇺 Russia</NativeSelectOption>
                <NativeSelectOption value="saudiarabia">🇸🇦 Saudi Arabia</NativeSelectOption>
                <NativeSelectOption value="singapore">🇸🇬 Singapore</NativeSelectOption>
                <NativeSelectOption value="southafrica">🇿🇦 South Africa</NativeSelectOption>
                <NativeSelectOption value="southkorea">🇰🇷 South Korea</NativeSelectOption>
                <NativeSelectOption value="spain">🇪🇸 Spain</NativeSelectOption>
                <NativeSelectOption value="sweden">🇸🇪 Sweden</NativeSelectOption>
                <NativeSelectOption value="switzerland">🇨🇭 Switzerland</NativeSelectOption>
                <NativeSelectOption value="taiwan">🇹🇼 Taiwan</NativeSelectOption>
                <NativeSelectOption value="thailand">🇹🇭 Thailand</NativeSelectOption>
                <NativeSelectOption value="turkey">🇹🇷 Turkey</NativeSelectOption>
                <NativeSelectOption value="uae">🇦🇪 UAE</NativeSelectOption>
                <NativeSelectOption value="uk">🇬🇧 United Kingdom</NativeSelectOption>
                <NativeSelectOption value="usa">🇺🇸 United States</NativeSelectOption>
                <NativeSelectOption value="vietnam">🇻🇳 Vietnam</NativeSelectOption>
              </NativeSelect>
              <p className="text-xs text-gray-500 mt-1">
                🌍 All 53 countries with crypto tax data are now available! Click on any country in the world map above or select from the dropdown.
              </p>
              <div className="mt-2 p-2 bg-red-50 rounded-md border border-red-200">
                <p className="text-sm text-red-800">
                  💰 <strong>Currency:</strong> {getCurrencyInfo(safeCountry).name} ({getCurrencyInfo(safeCountry).code}) {getCurrencyInfo(safeCountry).symbol}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  All amounts will be displayed in {getCurrencyInfo(safeCountry).code} using local formatting conventions.
                </p>
              </div>

              {/* Tax System Information */}
              <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                <p className="text-sm text-green-800">
                  📊 <strong>Tax System:</strong> {safeMod.cryptoNote ?
                    (safeMod.cryptoNote.includes('Progressive') || safeMod.cryptoNote.includes('brackets') ? 'Progressive' :
                     safeMod.cryptoNote.includes('Flat') || safeMod.cryptoNote.includes('flat') ? 'Flat Tax' :
                     safeMod.cryptoNote.includes('0%') || safeMod.cryptoNote.includes('exempt') ? 'Tax-Free' :
                     'Complex') : 'Standard'}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {safeMod.cryptoNote ? safeMod.cryptoNote.substring(0, 120) + (safeMod.cryptoNote.length > 120 ? '...' : '') : 'Tax calculations based on local regulations'}
                </p>
              </div>
            </div>

            {maritalFeature && (
              <div>
                <Label className="text-gray-900 font-medium">Filing Status</Label>
                <NativeSelect
                  value={status}
                  onChange={(e) => {
                    setChanged({ ...changed, status: true });
                    setStatus(e.target.value);
                  }}
                  placeholder="Select status"
                  className="mt-1 bg-white border-gray-300 text-gray-900"
                >
                  {safeMod.statuses.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div>
              <Label className="text-gray-900 font-medium">AGI / Income (excl. this gain)</Label>
              <Input
                type="number"
                value={agiExcl}
                onChange={(e) => {
                  const val = Number.parseFloat(e.target.value);
                  setChanged({ ...changed, agiExcl: true });
                  setAgiExcl(isNaN(val) ? 0 : val);
                }}
                className="mt-1 bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div>
              <Label className="text-gray-900 font-medium">Initial Investment</Label>
              <Input
                type="number"
                value={initial}
                onChange={(e) => setInitial(Number.parseFloat(e.target.value) || 0)}
                className="mt-1 bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div>
              <Label className="text-gray-900 font-medium">Current Age</Label>
              <Input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number.parseInt(e.target.value) || 0)}
                className="mt-1 bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div>
              <Label>Investment Scenario</Label>
              <NativeSelect
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Select scenario"
              >
                {scenarios.map((s) => (
                  <NativeSelectOption key={s.name} value={s.name}>
                    {s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            {scenario === 'Custom' && (
              <div>
                <Label>Custom Annual Rate (%)</Label>
                <Input
                  type="number"
                  value={Number.isFinite(customRate) ? customRate * 100 : 0}
                  onChange={(e) => setCustomRate((Number.parseFloat(e.target.value) || 0) / 100)}
                />
              </div>
            )}

            <div>
              <Label>Holding Years</Label>
              <Input
                type="number"
                value={years}
                onChange={(e) => setYears(Number.parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Additional Penalty if Early (%)</Label>
              <Input
                type="number"
                value={additionalPenalty * 100}
                onChange={(e) =>
                  setAdditionalPenalty((Number.parseFloat(e.target.value) || 0) / 100)
                }
              />
            </div>

            <div className="md:col-span-2">
              <Label>ETF Holding Setup</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {safeMod.setups.map((s) => (
                  <Button
                    key={s.name}
                    variant={setupName === s.name ? 'default' : 'outline'}
                    onClick={() => setSetupName(s.name)}
                  >
                    {s.name}
                  </Button>
                ))}
              </div>
            </div>

            {maritalFeature && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="divorce"
                  checked={divorce}
                  onCheckedChange={(v) => setDivorce(Boolean(v))}
                />
                <Label htmlFor="divorce">Consider Divorce Scenario (adds Single results)</Label>
              </div>
            )}
          </div>

          {/* Results */}
          {results && (
            <>
              <Table className="bg-white">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="text-gray-900 font-semibold">Metric</TableHead>
                    {results.etf && <TableHead className="text-gray-900 font-semibold">ETF in {setupName}</TableHead>}
                    <TableHead className="text-gray-900 font-semibold">Crypto Taxable</TableHead>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableHead className="text-gray-900 font-semibold">ETF in {setupName} (Divorced)</TableHead>
                        <TableHead className="text-gray-900 font-semibold">Crypto Taxable (Divorced)</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  <TableRow className="border-b border-gray-200">
                    <TableCell className="text-gray-900 font-medium">Total Gain</TableCell>
                    {results.etf && <TableCell className="text-gray-900">{formatCurrency(results.gain)}</TableCell>}
                    <TableCell className="text-gray-900">{formatCurrency(results.gain)}</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell className="text-gray-900">{formatCurrency(results.gain)}</TableCell>
                        <TableCell className="text-gray-900">{formatCurrency(results.gain)}</TableCell>
                      </>
                    )}
                  </TableRow>
                  <TableRow className="border-b border-gray-200">
                    <TableCell className="text-gray-900 font-medium">Tax Paid</TableCell>
                    {results.etf && <TableCell className="text-gray-900">{formatCurrency(results.etf.tax)}</TableCell>}
                    <TableCell className="text-gray-900">{formatCurrency(results.crypto.tax)}</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell className="text-gray-900">{formatCurrency(results.divorcedEtf.tax)}</TableCell>
                        <TableCell className="text-gray-900">{formatCurrency(results.divorcedCrypto?.tax || 0)}</TableCell>
                      </>
                    )}
                  </TableRow>
                  <TableRow className="border-b border-gray-200">
                    <TableCell className="text-gray-900 font-medium">Penalty (if early)</TableCell>
                    {results.etf && <TableCell className="text-gray-900">{formatCurrency(results.etf.penalty)}</TableCell>}
                    <TableCell className="text-gray-900">{formatCurrency(results.crypto.penalty)}</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell className="text-gray-900">{formatCurrency(results.divorcedEtf.penalty)}</TableCell>
                        <TableCell className="text-gray-900">{formatCurrency(results.divorcedCrypto?.penalty || 0)}</TableCell>
                      </>
                    )}
                  </TableRow>
                  <TableRow className="border-b border-gray-200">
                    <TableCell className="text-gray-900 font-medium">Tax % of Gain</TableCell>
                    {results.etf && <TableCell className={`font-medium ${getPercentageColor(results.etf.taxPct)}`}>{formatPercentage(results.etf.taxPct)}</TableCell>}
                    <TableCell className={`font-medium ${getPercentageColor(results.crypto.taxPct)}`}>{formatPercentage(results.crypto.taxPct)}</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell className={`font-medium ${getPercentageColor(results.divorcedEtf.taxPct)}`}>{formatPercentage(results.divorcedEtf.taxPct)}</TableCell>
                        <TableCell className={`font-medium ${getPercentageColor(results.divorcedCrypto?.taxPct || 0)}`}>{formatPercentage(results.divorcedCrypto?.taxPct || 0)}</TableCell>
                      </>
                    )}
                  </TableRow>

                  <TableRow className="border-b border-gray-200">
                    <TableCell className="text-gray-900 font-medium">Fees/Notes</TableCell>
                    {results.etf && <TableCell className="text-gray-700 text-sm">{results.etf.fees}</TableCell>}
                    <TableCell className="text-gray-700 text-sm">
                      {'No specific fees for crypto in taxable accounts. '} {safeMod.cryptoNote}
                    </TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell className="text-gray-700 text-sm">{results.divorcedEtf.fees}</TableCell>
                        <TableCell className="text-gray-700 text-sm">
                          {'No specific fees for crypto in taxable accounts. '} {safeMod.cryptoNote}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableBody>
              </Table>



              {/* Break-even matrix */}
              {results.matrix && (
                <Card className="mt-8 bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="bg-white border-b border-gray-200">
                    <CardTitle className="text-gray-900 text-xl font-bold">Break-Even Extra Annual Yield for Crypto (%)</CardTitle>
                    <CardDescription className="text-gray-600">
                      Calculate the extra crypto yield needed to break-even with tax-advantaged
                      traditional investments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto bg-white">
                    <Table className="bg-white">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-gray-900 font-semibold">Years \\ Return</TableHead>
                          {returnsRange.map((r) => (
                            <TableHead key={r} className="text-gray-900 font-semibold text-center">{(r * 100).toFixed(0)}%</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white">
                        {yearsRange.map((y, i) => (
                          <TableRow key={y} className="border-b border-gray-200">
                            <TableCell className={`text-gray-900 font-medium ${i === selectedYearIdx ? 'bg-gray-100' : ''}`}>
                              {y}
                            </TableCell>
                            {results.matrix?.[i]?.map((d, j) => {
                              const percentage = d * 100;
                              const isHighlighted = (i === selectedYearIdx && j === nearestReturnIdx);
                              const cellClasses = cellClass(i, j);
                              const textColor = getPercentageColor(percentage, isHighlighted);
                              return (
                                <TableCell key={j} className={`text-center ${cellClasses} ${textColor}`}>
                                  {formatPercentage(percentage)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* DeFi builder + surplus/deficit */}
              <AdvancedDefiYieldConfigurator
                country={country}
                onConfigChange={onConfigChange}
                initialConfig={initialConfig}
              />

              {results.matrix && (
                <Card className="mt-4 bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="bg-white border-b border-gray-200">
                    <CardTitle className="text-gray-900 text-xl font-bold">Surplus vs Break-Even (pp)</CardTitle>
                    <CardDescription className="text-gray-600">
                      Computed DeFi extra minus required break-even. Positive favors crypto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto bg-white">
                    <Table className="bg-white">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-gray-900 font-semibold">Years \\ Return</TableHead>
                          {returnsRange.map((r) => (
                            <TableHead key={r} className="text-gray-900 font-semibold text-center">{(r * 100).toFixed(0)}%</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white">
                        {yearsRange.map((y, i) => (
                          <TableRow key={`sur-${y}`} className="border-b border-gray-200">
                            <TableCell className={`text-gray-900 font-medium ${i === selectedYearIdx ? 'bg-gray-100' : ''}`}>
                              {y}
                            </TableCell>
                            {results.matrix?.[i]?.map((requiredExtra, j) => {
                              const surplus = (adjustedCryptoYield - requiredExtra) * 100;
                              const cls = cellClass(i, j);
                              return (
                                <TableCell
                                  key={j}
                                  className={`text-center font-medium ${cls} ${getPercentageColor(surplus, (i === selectedYearIdx && j === nearestReturnIdx))}`}
                                >
                                  {formatPercentage(surplus)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <CalculatorErrorBoundary
      onError={(error, errorInfo) => {
        log.error('Calculator Error', {
          error: error.message,
          stack: error.stack,
          errorInfo: errorInfo.componentStack,
        });
        // Additional error reporting can be added here
      }}
    >
      <CalculatorContent />
    </CalculatorErrorBoundary>
  );
}
