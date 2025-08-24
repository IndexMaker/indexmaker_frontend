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
import { log } from '@/lib/utils/logger';
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
  const brackets = useMemo(() => mod.getBrackets(status), [mod, status]);
  const setup = useMemo(
    () => (setupName ? mod.setups.find((s) => s.name === setupName) || null : null),
    [mod.setups, setupName]
  );

  // Auto-update setup when country changes if current setup doesn't exist in new country
  useEffect(() => {
    if (setupName && !mod.setups.find((s) => s.name === setupName)) {
      const defaultSetup = pickDefaultRetirementSetup(country);
      setSetupName(defaultSetup);
    }
  }, [country, setupName, mod.setups]);

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
    () => [
      { country: 'us', value: country === 'usa' ? 1 : 0 },
      { country: 'ca', value: country === 'canada' ? 1 : 0 },
      { country: 'gb', value: country === 'uk' ? 1 : 0 },
      { country: 'au', value: country === 'australia' ? 1 : 0 },
      { country: 'de', value: country === 'germany' ? 1 : 0 },
      { country: 'fr', value: country === 'france' ? 1 : 0 },
      { country: 'jp', value: country === 'japan' ? 1 : 0 },
      { country: 'in', value: country === 'india' ? 1 : 0 },
      { country: 'it', value: country === 'italy' ? 1 : 0 },
      { country: 'br', value: country === 'brazil' ? 1 : 0 },
    ],
    [country]
  );

  useEffect(() => {
    const preferred = pickDefaultRetirementSetup(country);
    if (preferred && preferred !== setupName) setSetupName(preferred);
    if (!changed.status && mod.statuses[0]) setStatus(mod.statuses[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

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
    const cryptoSetup = mod.setups.find((s) => s.type === 'taxable') || mod.setups[0] || null;

    const etfTaxes = setup
      ? calculateTaxes(
          mod.key,
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
      mod.key,
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
    const maritalFeature = mod.statuses.includes('married');
    if (maritalFeature && divorce && status === 'married') {
      const divorcedBracketsResult = mod.getBrackets('single');
      const divorcedBrackets = divorcedBracketsResult;
      divorcedEtf = setup
        ? calculateTaxes(
            mod.key,
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
        mod.key,
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
    const matrixSetup = setup || mod.setups.find((s) => s.type !== 'taxable') || mod.setups[0];
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
    mod,
    setup,
  ]);

  const handleMapClick = ({ countryCode }: CountryContext) => {
    const mapped = countryMapping[countryCode.toUpperCase()];
    if (mapped) setCountry(mapped);
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

  const maritalFeature = mod.statuses.includes('married');

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
    if (isRow && isCol) return 'bg-gray-400 text-white';
    if (isRow || isCol) return 'bg-gray-100';
    return '';
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Multi-Country Tax Calculator: ETFs vs Crypto</CardTitle>
          <CardDescription>
            Roth IRA selected by default for USA. Preset years for break-even matrix.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Map */}
          <div className="w-full flex justify-center items-center">
            <div className="w-full max-w-[900px] mb-6">
              <WorldMap color="#D6D6DA" size="xl" data={mapData} onClickFunction={handleMapClick} />
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <NativeSelect
                value={country}
                onChange={(e) => setCountry(e.target.value as keyof typeof countryModules)}
                placeholder="Select country"
              >
                <NativeSelectOption value="usa">USA</NativeSelectOption>
                <NativeSelectOption value="canada">Canada</NativeSelectOption>
                <NativeSelectOption value="uk">UK</NativeSelectOption>
                <NativeSelectOption value="australia">Australia</NativeSelectOption>
                <NativeSelectOption value="germany">Germany</NativeSelectOption>
                <NativeSelectOption value="france">France</NativeSelectOption>
                <NativeSelectOption value="japan">Japan</NativeSelectOption>
                <NativeSelectOption value="india">India</NativeSelectOption>
                <NativeSelectOption value="italy">Italy</NativeSelectOption>
                <NativeSelectOption value="brazil">Brazil</NativeSelectOption>
              </NativeSelect>
            </div>

            {maritalFeature && (
              <div>
                <Label>Filing Status</Label>
                <NativeSelect
                  value={status}
                  onChange={(e) => {
                    setChanged({ ...changed, status: true });
                    setStatus(e.target.value);
                  }}
                  placeholder="Select status"
                >
                  {mod.statuses.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            )}

            <div>
              <Label>AGI / Income (excl. this gain)</Label>
              <Input
                type="number"
                value={agiExcl}
                onChange={(e) => {
                  const val = Number.parseFloat(e.target.value);
                  setChanged({ ...changed, agiExcl: true });
                  setAgiExcl(isNaN(val) ? 0 : val);
                }}
              />
            </div>

            <div>
              <Label>Initial Investment</Label>
              <Input
                type="number"
                value={initial}
                onChange={(e) => setInitial(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Current Age</Label>
              <Input
                type="number"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number.parseInt(e.target.value) || 0)}
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
                {mod.setups.map((s) => (
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {results.etf && <TableHead>ETF in {setupName}</TableHead>}
                    <TableHead>Crypto Taxable</TableHead>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableHead>ETF in {setupName} (Divorced)</TableHead>
                        <TableHead>Crypto Taxable (Divorced)</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Gain</TableCell>
                    {results.etf && <TableCell>{results.gain.toFixed(2)}</TableCell>}
                    <TableCell>{results.gain.toFixed(2)}</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell>{results.gain.toFixed(2)}</TableCell>
                        <TableCell>{results.gain.toFixed(2)}</TableCell>
                      </>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell>Tax Paid</TableCell>
                    {results.etf && <TableCell>{results.etf.tax.toFixed(2)}</TableCell>}
                    <TableCell>{results.crypto.tax.toFixed(2)}</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell>{results.divorcedEtf.tax.toFixed(2)}</TableCell>
                        <TableCell>{results.divorcedCrypto?.tax.toFixed(2)}</TableCell>
                      </>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell>Penalty (if early)</TableCell>
                    {results.etf && <TableCell>{results.etf.penalty.toFixed(2)}</TableCell>}
                    <TableCell>{results.crypto.penalty.toFixed(2)}</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell>{results.divorcedEtf.penalty.toFixed(2)}</TableCell>
                        <TableCell>{results.divorcedCrypto?.penalty.toFixed(2)}</TableCell>
                      </>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell>Tax % of Gain</TableCell>
                    {results.etf && <TableCell>{results.etf.taxPct.toFixed(2)}%</TableCell>}
                    <TableCell>{results.crypto.taxPct.toFixed(2)}%</TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell>{results.divorcedEtf.taxPct.toFixed(2)}%</TableCell>
                        <TableCell>{results.divorcedCrypto?.taxPct.toFixed(2)}%</TableCell>
                      </>
                    )}
                  </TableRow>

                  <TableRow>
                    <TableCell>Fees/Notes</TableCell>
                    {results.etf && <TableCell>{results.etf.fees}</TableCell>}
                    <TableCell>
                      {'No specific fees for crypto in taxable accounts. '} {mod.cryptoNote}
                    </TableCell>
                    {maritalFeature && divorce && status === 'married' && results.divorcedEtf && (
                      <>
                        <TableCell>{results.divorcedEtf.fees}</TableCell>
                        <TableCell>
                          {'No specific fees for crypto in taxable accounts. '} {mod.cryptoNote}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                </TableBody>
              </Table>



              {/* Break-even matrix */}
              {results.matrix && (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Break-Even Extra Annual Yield for Crypto (%)</CardTitle>
                    <CardDescription>
                      Calculate the extra crypto yield needed to break-even with tax-advantaged
                      traditional investments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Years \\ Return</TableHead>
                          {returnsRange.map((r) => (
                            <TableHead key={r}>{(r * 100).toFixed(0)}%</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearsRange.map((y, i) => (
                          <TableRow key={y}>
                            <TableCell className={i === selectedYearIdx ? 'bg-gray-100' : ''}>
                              {y}
                            </TableCell>
                            {results.matrix?.[i]?.map((d, j) => {
                              const percentage = d * 100;
                              const formattedValue =
                                Math.abs(percentage) < 0.005 ? '0.00' : percentage.toFixed(2);
                              return (
                                <TableCell key={j} className={cellClass(i, j)}>
                                  {formattedValue}%
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
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Surplus vs Break-Even (pp)</CardTitle>
                    <CardDescription>
                      Computed DeFi extra minus required break-even. Positive favors crypto.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Years \\ Return</TableHead>
                          {returnsRange.map((r) => (
                            <TableHead key={r} className="text-center">{(r * 100).toFixed(0)}%</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearsRange.map((y, i) => (
                          <TableRow key={`sur-${y}`}>
                            <TableCell className={`font-medium ${i === selectedYearIdx ? 'bg-gray-100' : ''}`}>
                              {y}
                            </TableCell>
                            {results.matrix?.[i]?.map((requiredExtra, j) => {
                              const surplus = (adjustedCryptoYield - requiredExtra) * 100;
                              const cls = cellClass(i, j);
                              const isPositive = surplus > 0;
                              const isNegative = surplus < 0;
                              return (
                                <TableCell
                                  key={j}
                                  className={`text-center ${cls} ${
                                    isPositive ? 'text-green-600 font-medium' :
                                    isNegative ? 'text-red-600' : 'text-gray-600'
                                  }`}
                                >
                                  {surplus > 0 ? '+' : surplus < 0 ? '-' : ''}
                                  {Math.abs(surplus) < 0.005 ? '0.00' : Math.abs(surplus).toFixed(2)}%
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
