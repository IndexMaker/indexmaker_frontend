// components/defi/index.ts
// DeFi-related components

export { default as AdvancedDefiYieldConfigurator } from './advanced-defi-yield-configurator';
export { default as DefiYieldConfigurator } from './defi-yield-configurator';

// Types for DeFi components
export interface DeFiStrategy {
  name: string;
  baseYield: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
  description: string;
  protocols: string[];
  impermanentLossRisk: boolean;
  liquidationRisk: boolean;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  minimumInvestment: number;
  lockupPeriod?: string;
  autoCompounding: boolean;
  gasOptimized: boolean;
}

export interface DefiYieldConfig {
  enabled: boolean;
  baseYield: number;
  volatility: number;
  compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  riskAdjustment: number;
  strategy?: DeFiStrategy;
  customParameters?: Record<string, number>;
}

export interface Asset {
  key: string;
  name: string;
  defaultRate: number; // decimal, e.g. 0.0074 = 0.74%
  notes: string;
}

// Common DeFi constants
export const COMPOUNDING_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'annually',
] as const;

export const RISK_LEVELS = ['Low', 'Medium', 'High', 'Extreme'] as const;

export const COMPLEXITY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

// Utility functions for DeFi calculations
export function calculateCompoundedYield(
  principal: number,
  rate: number,
  frequency: (typeof COMPOUNDING_FREQUENCIES)[number],
  years: number
): number {
  const frequencyMap = {
    daily: 365,
    weekly: 52,
    monthly: 12,
    quarterly: 4,
    annually: 1,
  };

  const n = frequencyMap[frequency];
  return principal * Math.pow(1 + rate / n, n * years) - principal;
}

export function calculateRiskAdjustedYield(
  baseYield: number,
  riskAdjustment: number,
  volatility: number
): number {
  // Simple risk adjustment formula
  const riskPenalty = (volatility / 100) * (riskAdjustment / 100);
  return Math.max(0, baseYield - riskPenalty);
}

export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'Low':
      return 'bg-green-100 text-green-800';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'High':
      return 'bg-orange-100 text-orange-800';
    case 'Extreme':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getComplexityColor(complexity: string): string {
  switch (complexity) {
    case 'Beginner':
      return 'bg-blue-100 text-blue-800';
    case 'Intermediate':
      return 'bg-purple-100 text-purple-800';
    case 'Advanced':
      return 'bg-orange-100 text-orange-800';
    case 'Expert':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// Validation functions
export function validateDefiConfig(config: Partial<DefiYieldConfig>): boolean {
  if (config.baseYield !== undefined && (config.baseYield < 0 || config.baseYield > 100)) {
    return false;
  }

  if (config.volatility !== undefined && (config.volatility < 0 || config.volatility > 200)) {
    return false;
  }

  if (
    config.riskAdjustment !== undefined &&
    (config.riskAdjustment < 0 || config.riskAdjustment > 50)
  ) {
    return false;
  }

  if (
    config.compoundingFrequency !== undefined &&
    !COMPOUNDING_FREQUENCIES.includes(config.compoundingFrequency)
  ) {
    return false;
  }

  return true;
}

export function validateStrategy(strategy: Partial<DeFiStrategy>): boolean {
  if (strategy.baseYield !== undefined && (strategy.baseYield < 0 || strategy.baseYield > 1000)) {
    return false;
  }

  if (strategy.riskLevel !== undefined && !RISK_LEVELS.includes(strategy.riskLevel)) {
    return false;
  }

  if (strategy.complexity !== undefined && !COMPLEXITY_LEVELS.includes(strategy.complexity)) {
    return false;
  }

  if (strategy.minimumInvestment !== undefined && strategy.minimumInvestment < 0) {
    return false;
  }

  return true;
}

// Default configurations
export const DEFAULT_DEFI_CONFIG: DefiYieldConfig = {
  enabled: false,
  baseYield: 12.0,
  volatility: 15.0,
  compoundingFrequency: 'daily',
  riskAdjustment: 5.0,
};

export const DEFAULT_STRATEGIES: DeFiStrategy[] = [
  {
    name: 'Stablecoin Farming',
    baseYield: 8.5,
    riskLevel: 'Low',
    description: 'Low-risk yield farming with stablecoins on established protocols',
    protocols: ['Aave', 'Compound', 'Curve'],
    impermanentLossRisk: false,
    liquidationRisk: false,
    complexity: 'Beginner',
    minimumInvestment: 100,
    autoCompounding: true,
    gasOptimized: true,
  },
  {
    name: 'LP Token Staking',
    baseYield: 15.2,
    riskLevel: 'Medium',
    description: 'Provide liquidity and stake LP tokens for additional rewards',
    protocols: ['Uniswap V3', 'SushiSwap', 'PancakeSwap'],
    impermanentLossRisk: true,
    liquidationRisk: false,
    complexity: 'Intermediate',
    minimumInvestment: 500,
    autoCompounding: false,
    gasOptimized: false,
  },
  {
    name: 'Leveraged Yield Farming',
    baseYield: 25.8,
    riskLevel: 'High',
    description: 'Use leverage to amplify yields with borrowed capital',
    protocols: ['Alpha Homora', 'Yearn Finance', 'Convex'],
    impermanentLossRisk: true,
    liquidationRisk: true,
    complexity: 'Advanced',
    minimumInvestment: 1000,
    lockupPeriod: '30 days',
    autoCompounding: true,
    gasOptimized: true,
  },
  {
    name: 'Options Strategies',
    baseYield: 35.4,
    riskLevel: 'Extreme',
    description: 'Complex options strategies for maximum yield potential',
    protocols: ['Ribbon Finance', 'Opyn', 'Hegic'],
    impermanentLossRisk: false,
    liquidationRisk: true,
    complexity: 'Expert',
    minimumInvestment: 5000,
    lockupPeriod: '7 days',
    autoCompounding: false,
    gasOptimized: false,
  },
];

// Asset definitions
export const DEFAULT_ASSETS: Asset[] = [
  {
    key: 'stocks_large',
    name: 'Stocks - Large Cap',
    defaultRate: 0.0074,
    notes:
      'Avg securities lending income on large-cap funds (ex-Vanguard). Typical 0.2–5% depending on borrow demand.',
  },
  {
    key: 'stocks_mid',
    name: 'Stocks - Mid Cap',
    defaultRate: 0.0063,
    notes: 'Industry averages suggest slightly below large-cap; depends on utilization.',
  },
  {
    key: 'stocks_small',
    name: 'Stocks - Small Cap',
    defaultRate: 0.015,
    notes: 'Often 1–2%+ due to higher shorting demand and lower float.',
  },
  {
    key: 'etfs',
    name: 'ETFs',
    defaultRate: 0.0067,
    notes: 'Global avg ~0.67%; can be as low as ~0.11% on some small-cap ETFs.',
  },
  {
    key: 'crypto_large',
    name: 'Crypto - Large Cap (ETH)',
    defaultRate: 0.045,
    notes: 'Common 5–10% band across major platforms; volatile.',
  },
  {
    key: 'crypto_mid',
    name: 'Crypto - Mid Cap',
    defaultRate: 0.035,
    notes: 'Similar to large-cap, sometimes higher depending on borrow demand.',
  },
  {
    key: 'crypto_stables',
    name: 'Crypto - Stablecoins (USDT/USDC)',
    defaultRate: 0.047,
    notes: 'Often 4–8% on reputable venues; higher on riskier platforms.',
  },
  {
    key: 'bonds',
    name: 'Bonds',
    defaultRate: 0.035,
    notes: 'Proxy using cash/sovereign yields; lending premia limited.',
  },
  {
    key: 'commodities',
    name: 'Commodities',
    defaultRate: 0.002,
    notes: 'Direct lending not standard; proxy near zero. Indirect via derivatives programs.',
  },
  {
    key: 'real_estate',
    name: 'Real Estate',
    defaultRate: 0.06,
    notes: 'Cap-rate style yield proxy; varies by market.',
  },
  {
    key: 'fx_cash',
    name: 'Forex / Cash',
    defaultRate: 0.04,
    notes: 'Money-market style rates; carry depends on currency pair.',
  },
];
