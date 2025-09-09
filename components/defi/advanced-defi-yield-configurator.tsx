'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, TrendingUp, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { CurrencyFormatter } from '@/lib/tax/utils/currency-formatter';

interface CryptoInvestmentOption {
  name: string;
  baseYield: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Extreme';
  description: string;
  taxTreatment: 'Capital Gains' | 'Income' | 'Mixed';
  platforms: string[];
  liquidityRisk: boolean;
  regulatoryRisk: boolean;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  minimumInvestment: number;
  lockupPeriod?: string;
  compounding: boolean;
  gasEfficient: boolean;
}

interface CountryDeFiConfig {
  country: string;
  currency: string;
  regulatoryEnvironment: 'Friendly' | 'Neutral' | 'Restrictive' | 'Hostile';
  availableProtocols: string[];
  taxImplications: string;
  preferredStrategies: string[];
  riskAdjustments: {
    regulatory: number; // Additional risk due to regulatory uncertainty
    liquidity: number; // Liquidity risk adjustment
    currency: number; // Currency/exchange rate risk
  };
}

interface AdvancedDefiYieldConfiguratorProps {
  country?: string; // Add country prop
  onConfigChange: (config: {
    enabled: boolean;
    baseYield: number;
    volatility: number;
    compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    riskAdjustment: number;
    strategy?: CryptoInvestmentOption;
    customParameters?: Record<string, number>;
  }) => void;
  initialConfig?: {
    enabled: boolean;
    baseYield: number;
    volatility: number;
    compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
    riskAdjustment: number;
  };
}

// Country-specific crypto investment configurations based on regulatory environment and tax treatment
const COUNTRY_DEFI_CONFIGS: Record<string, CountryDeFiConfig> = {
  usa: {
    country: 'United States',
    currency: 'USD',
    regulatoryEnvironment: 'Neutral',
    availableProtocols: ['Coinbase', 'Kraken', 'Aave', 'Compound', 'Uniswap'],
    taxImplications:
      'Crypto gains taxed as capital gains (0-20%) or ordinary income (up to 37%). Complex reporting requirements for DeFi activities.',
    preferredStrategies: ['Tokenized ITP DeFi Yield', 'Crypto Index ETF'],
    riskAdjustments: { regulatory: 1.0, liquidity: 1.0, currency: 1.0 },
  },
  canada: {
    country: 'Canada',
    currency: 'CAD',
    regulatoryEnvironment: 'Friendly',
    availableProtocols: ['Coinbase', 'Kraken', 'Bitbuy', 'Aave', 'Compound'],
    taxImplications:
      'Crypto treated as commodity. 50% of capital gains taxable. Business income taxed at marginal rates (up to 53.5%).',
    preferredStrategies: ['Tokenized ITP DeFi Yield', 'Stablecoin Yield'],
    riskAdjustments: { regulatory: 0.9, liquidity: 1.0, currency: 1.1 },
  },
  uk: {
    country: 'United Kingdom',
    currency: 'GBP',
    regulatoryEnvironment: 'Neutral',
    availableProtocols: ['Coinbase', 'Kraken', 'Binance', 'Aave'],
    taxImplications:
      'Capital gains tax (10-20%) on disposals. Income tax (20-45%) on staking/lending rewards. £6,000 CGT allowance.',
    preferredStrategies: ['Tokenized ITP DeFi Yield', 'Stablecoin Yield'],
    riskAdjustments: { regulatory: 1.1, liquidity: 1.0, currency: 1.2 },
  },
  germany: {
    country: 'Germany',
    currency: 'EUR',
    regulatoryEnvironment: 'Restrictive',
    availableProtocols: ['Coinbase', 'Kraken', 'Bitpanda', 'Aave'],
    taxImplications:
      'Tax-free after 1-year holding period. Otherwise taxed as private sale (up to 42%). Staking extends holding period to 10 years.',
    preferredStrategies: ['Tokenized ITP DeFi Yield'],
    riskAdjustments: { regulatory: 1.3, liquidity: 1.1, currency: 1.1 },
  },
  france: {
    country: 'France',
    currency: 'EUR',
    regulatoryEnvironment: 'Restrictive',
    availableProtocols: ['Coinbase', 'Kraken', 'Binance'],
    taxImplications:
      'Flat tax rate of 30% on crypto gains. Professional traders taxed at progressive rates (up to 45%). Complex DeFi reporting.',
    preferredStrategies: ['Tokenized ITP DeFi Yield', 'Crypto Index ETF'],
    riskAdjustments: { regulatory: 1.2, liquidity: 1.1, currency: 1.1 },
  },
  australia: {
    country: 'Australia',
    currency: 'AUD',
    regulatoryEnvironment: 'Friendly',
    availableProtocols: ['Coinbase', 'Kraken', 'Swyftx', 'Aave', 'Compound'],
    taxImplications:
      'Capital gains tax (0-45%) with 50% discount after 12 months. DeFi yields taxed as assessable income.',
    preferredStrategies: ['Tokenized ITP DeFi Yield', 'Stablecoin Yield'],
    riskAdjustments: { regulatory: 0.9, liquidity: 1.0, currency: 1.2 },
  },
  india: {
    country: 'India',
    currency: 'INR',
    regulatoryEnvironment: 'Hostile',
    availableProtocols: ['WazirX', 'CoinDCX', 'Binance'],
    taxImplications:
      'Flat 30% tax on crypto gains with no deductions. 1% TDS on all transactions. No set-off of losses allowed.',
    preferredStrategies: ['Tokenized ITP DeFi Yield'],
    riskAdjustments: { regulatory: 1.5, liquidity: 1.3, currency: 1.2 },
  },
  egypt: {
    country: 'Egypt',
    currency: 'EGP',
    regulatoryEnvironment: 'Hostile',
    availableProtocols: ['Binance'], // Limited options due to crypto ban
    taxImplications:
      'Cryptocurrency is banned; no legal tax rate applies. Trading crypto is prohibited by law.',
    preferredStrategies: [], // No strategies available due to ban
    riskAdjustments: { regulatory: 2.0, liquidity: 2.0, currency: 1.3 }, // Very high risk due to ban
  },
};

// Crypto investment options for tax comparison analysis (January 2025)
const CRYPTO_INVESTMENT_OPTIONS: CryptoInvestmentOption[] = [
  {
    name: 'Tokenized ITP DeFi Yield',
    baseYield: 8.5, // Expected yield from tokenized Index Token Protocol in DeFi
    riskLevel: 'Medium',
    description: 'Tokenized Index Token Protocol yielding in DeFi protocols for enhanced returns',
    taxTreatment: 'Mixed',
    platforms: ['Aave', 'Compound', 'Morpho'],
    liquidityRisk: true,
    regulatoryRisk: false,
    complexity: 'Intermediate',
    minimumInvestment: 500,
    lockupPeriod: '7-14 days',
    compounding: true,
    gasEfficient: true,
  },
  {
    name: 'Stablecoin Yield',
    baseYield: 4.8, // Current USDC/USDT lending rates
    riskLevel: 'Low',
    description: 'Earn yield on stablecoins through lending protocols (taxed as income)',
    taxTreatment: 'Income',
    platforms: ['Aave', 'Compound', 'Morpho'],
    liquidityRisk: false,
    regulatoryRisk: false,
    complexity: 'Beginner',
    minimumInvestment: 100,
    compounding: true,
    gasEfficient: true,
  },
  {
    name: 'Crypto Index ETF',
    baseYield: 0.0, // Pure capital appreciation, management fees ~0.75%
    riskLevel: 'Medium',
    description: 'Diversified crypto exposure through regulated ETFs (capital gains treatment)',
    taxTreatment: 'Capital Gains',
    platforms: ['Traditional Brokers', 'ETF Providers'],
    liquidityRisk: false,
    regulatoryRisk: false,
    complexity: 'Beginner',
    minimumInvestment: 50,
    compounding: false,
    gasEfficient: true,
  },
  {
    name: 'DeFi Liquidity Providing',
    baseYield: 8.5, // LP rewards + trading fees
    riskLevel: 'Medium',
    description: 'Provide liquidity to DEXs for trading fees and rewards (mixed tax treatment)',
    taxTreatment: 'Mixed',
    platforms: ['Uniswap', 'Curve', 'SushiSwap'],
    liquidityRisk: true,
    regulatoryRisk: false,
    complexity: 'Intermediate',
    minimumInvestment: 1000,
    compounding: false,
    gasEfficient: false,
  },
  {
    name: 'Crypto Staking',
    baseYield: 5.2, // ETH staking, SOL staking, etc.
    riskLevel: 'Medium',
    description: 'Stake proof-of-stake cryptocurrencies for rewards (income tax treatment)',
    taxTreatment: 'Income',
    platforms: ['Lido', 'Coinbase', 'Native Staking'],
    liquidityRisk: true,
    regulatoryRisk: false,
    complexity: 'Intermediate',
    minimumInvestment: 500,
    lockupPeriod: '1-30 days',
    compounding: true,
    gasEfficient: true,
  },
  {
    name: 'High-Risk DeFi',
    baseYield: 15.3, // Leveraged strategies, exotic protocols
    riskLevel: 'High',
    description: 'High-yield DeFi strategies with significant smart contract and liquidation risks',
    taxTreatment: 'Mixed',
    platforms: ['GMX', 'Convex', 'Yearn'],
    liquidityRisk: true,
    regulatoryRisk: true,
    complexity: 'Advanced',
    minimumInvestment: 2000,
    lockupPeriod: '7-30 days',
    compounding: true,
    gasEfficient: false,
  },
];

// Client-side only number formatter to prevent hydration mismatch
function formatNumber(num: number, countryKey: string = 'usa'): string {
  if (typeof window === 'undefined') {
    return num.toString(); // Server-side fallback
  }

  try {
    // Use the proper currency formatter to ensure Latin numerals are used
    return CurrencyFormatter.formatNumber(num, countryKey, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } catch {
    // Fallback to basic formatting with en-US locale to ensure Latin numerals
    return num.toLocaleString('en-US');
  }
}

function AdvancedDefiYieldConfiguratorInner({
  country = 'usa',
  onConfigChange,
  initialConfig,
}: AdvancedDefiYieldConfiguratorProps) {
  const [enabled] = useState(initialConfig?.enabled ?? false);
  const [selectedStrategy, setSelectedStrategy] = useState<CryptoInvestmentOption | null>(null);
  const [baseYield, setBaseYield] = useState(initialConfig?.baseYield ?? 4.8); // Updated default to current market rate

  // Get country-specific configuration
  const countryConfig = COUNTRY_DEFI_CONFIGS[country] || COUNTRY_DEFI_CONFIGS.usa;

  // Filter strategies based on country's regulatory environment and available platforms
  const availableStrategies = CRYPTO_INVESTMENT_OPTIONS.filter((strategy: CryptoInvestmentOption) =>
    strategy.platforms.some((platform: string) =>
      countryConfig.availableProtocols.includes(platform)
    )
  );

  const handleConfigChange = useCallback(() => {
    const config: {
      enabled: boolean;
      baseYield: number;
      volatility: number;
      compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
      riskAdjustment: number;
      strategy?: CryptoInvestmentOption;
    } = {
      enabled,
      baseYield,
      volatility: 12.0, // Default volatility
      compoundingFrequency: 'daily', // Default compounding
      riskAdjustment: 3.0, // Default risk adjustment
    };

    if (selectedStrategy) {
      config.strategy = selectedStrategy;
    }

    onConfigChange(config);
  }, [enabled, baseYield, selectedStrategy, onConfigChange]);

  // Advanced settings state
  // Advanced settings state - currently unused
  // const [showAdvanced, setShowAdvanced] = useState(false);

  const handleStrategySelect = (strategyName: string) => {
    const strategy = availableStrategies.find((s) => s.name === strategyName);
    if (strategy) {
      setSelectedStrategy(strategy);

      // Apply country-specific risk adjustments to base yield
      const countryAdjustedYield =
        strategy.baseYield *
        countryConfig.riskAdjustments.regulatory *
        countryConfig.riskAdjustments.liquidity *
        countryConfig.riskAdjustments.currency;

      setBaseYield(Math.round(countryAdjustedYield * 10) / 10); // Round to 1 decimal
      handleConfigChange();
    }
  };

  const getRiskColor = (riskLevel: string) => {
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
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low':
        return <Shield className="w-4 h-4" />;
      case 'Medium':
        return <TrendingUp className="w-4 h-4" />;
      case 'High':
        return <Zap className="w-4 h-4" />;
      case 'Extreme':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full bg-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Crypto Investment Tax Comparison
        </CardTitle>
        <CardDescription>
          Configure crypto investment options to compare against tax-advantaged traditional
          investments. Calculate the extra yield needed to overcome tax disadvantages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="strategies" className="w-full bg-foreground">
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger value="strategies">Crypto Options</TabsTrigger>
            <TabsTrigger value="parameters">Tax Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="strategies" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Select Crypto Investment Option</Label>
                <Badge variant="outline" className="text-xs text-secondary">
                  {countryConfig.country} • {countryConfig.regulatoryEnvironment}
                </Badge>
              </div>

              {/* Country-specific tax information */}
              <div className="p-3 bg-blue-50 rounded-lg border border-accent">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Tax Implications for {countryConfig.country}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mb-2">{countryConfig.taxImplications}</p>
                <p className="text-xs text-blue-600">
                  <strong>Regulatory Environment:</strong> {countryConfig.regulatoryEnvironment} •
                  <strong> Available Platforms:</strong>{' '}
                  {countryConfig.availableProtocols.join(', ')}
                </p>
              </div>

              <div className="grid gap-4">
                {availableStrategies.map((strategy) => (
                  <Card
                    key={strategy.name}
                    className={`bg-foreground cursor-pointer transition-all hover:shadow-md ${
                      selectedStrategy?.name === strategy.name ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => handleStrategySelect(strategy.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{strategy.name}</h3>
                            <Badge className={getRiskColor(strategy.riskLevel)}>
                              {getRiskIcon(strategy.riskLevel)}
                              {strategy.riskLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-secondary">{strategy.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {strategy.platforms.map((platform) => (
                              <Badge key={platform} variant="outline" className="text-xs text-secondary">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {strategy.baseYield.toFixed(1)}%
                          </div>
                          <div className="text-xs text-secondary">APY</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Complexity:</span>
                          <Badge variant="outline" className="text-xs text-secondary">
                            {strategy.complexity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Min Investment:</span>
                          <span>${formatNumber(strategy.minimumInvestment, country)}</span>
                        </div>
                        {strategy.lockupPeriod && (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Lockup:</span>
                            <span>{strategy.lockupPeriod}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Compounding:</span>
                          <span>{strategy.compounding ? '✓' : '✗'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Tax Treatment:</span>
                          <span className="text-xs">{strategy.taxTreatment}</span>
                        </div>
                      </div>

                      {(strategy.liquidityRisk || strategy.regulatoryRisk) && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                          <div className="flex items-center gap-1 text-xs text-yellow-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="font-medium">Risks:</span>
                          </div>
                          <div className="text-xs text-yellow-700 mt-1">
                            {strategy.liquidityRisk && <div>• Liquidity Risk</div>}
                            {strategy.regulatoryRisk && <div>• Regulatory Risk</div>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="parameters" className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Expected Crypto Yield: {baseYield.toFixed(1)}%</Label>
                <p className="text-sm text-secondary">
                  Annual yield expected from crypto investment (before taxes)
                </p>
                <div className="px-2 py-2">
                  <Slider
                    value={[baseYield]}
                    onValueChange={(value) => {
                      setBaseYield(value[0] ?? 0);
                      handleConfigChange();
                    }}
                    max={30}
                    min={0}
                    step={0.1}
                    className="w-full crypto-yield-slider"
                  />
                </div>
                <div className="flex justify-between text-xs text-secondary px-2">
                  <span>0%</span>
                  <span>15%</span>
                  <span>30%</span>
                </div>
              </div>
            </div>
          </TabsContent>


        </Tabs>
      </CardContent>
    </Card>
  );
}

// Client-side only wrapper to prevent hydration issues
export default function AdvancedDefiYieldConfigurator(props: AdvancedDefiYieldConfiguratorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Server-side fallback
    return (
      <Card className="w-full bg-foregrouind">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Advanced DeFi Yield Configuration
          </CardTitle>
          <CardDescription>Loading DeFi configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-secondary rounded w-3/4"></div>
            <div className="h-4 bg-secondary rounded w-1/2"></div>
            <div className="h-4 bg-secondary rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <AdvancedDefiYieldConfiguratorInner {...props} />;
}
