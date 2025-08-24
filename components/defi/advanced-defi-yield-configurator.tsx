'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Shield, TrendingUp, Zap } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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
    preferredStrategies: ['Bitcoin/Ethereum Hold', 'Crypto Index ETF'],
    riskAdjustments: { regulatory: 1.0, liquidity: 1.0, currency: 1.0 },
  },
  canada: {
    country: 'Canada',
    currency: 'CAD',
    regulatoryEnvironment: 'Friendly',
    availableProtocols: ['Coinbase', 'Kraken', 'Bitbuy', 'Aave', 'Compound'],
    taxImplications:
      'Crypto treated as commodity. 50% of capital gains taxable. Business income taxed at marginal rates (up to 53.5%).',
    preferredStrategies: ['Bitcoin/Ethereum Hold', 'Stablecoin Yield'],
    riskAdjustments: { regulatory: 0.9, liquidity: 1.0, currency: 1.1 },
  },
  uk: {
    country: 'United Kingdom',
    currency: 'GBP',
    regulatoryEnvironment: 'Neutral',
    availableProtocols: ['Coinbase', 'Kraken', 'Binance', 'Aave'],
    taxImplications:
      'Capital gains tax (10-20%) on disposals. Income tax (20-45%) on staking/lending rewards. £6,000 CGT allowance.',
    preferredStrategies: ['Bitcoin/Ethereum Hold', 'Stablecoin Yield'],
    riskAdjustments: { regulatory: 1.1, liquidity: 1.0, currency: 1.2 },
  },
  germany: {
    country: 'Germany',
    currency: 'EUR',
    regulatoryEnvironment: 'Restrictive',
    availableProtocols: ['Coinbase', 'Kraken', 'Bitpanda', 'Aave'],
    taxImplications:
      'Tax-free after 1-year holding period. Otherwise taxed as private sale (up to 42%). Staking extends holding period to 10 years.',
    preferredStrategies: ['Bitcoin/Ethereum Hold'],
    riskAdjustments: { regulatory: 1.3, liquidity: 1.1, currency: 1.1 },
  },
  france: {
    country: 'France',
    currency: 'EUR',
    regulatoryEnvironment: 'Restrictive',
    availableProtocols: ['Coinbase', 'Kraken', 'Binance'],
    taxImplications:
      'Flat tax rate of 30% on crypto gains. Professional traders taxed at progressive rates (up to 45%). Complex DeFi reporting.',
    preferredStrategies: ['Bitcoin/Ethereum Hold', 'Crypto Index ETF'],
    riskAdjustments: { regulatory: 1.2, liquidity: 1.1, currency: 1.1 },
  },
  australia: {
    country: 'Australia',
    currency: 'AUD',
    regulatoryEnvironment: 'Friendly',
    availableProtocols: ['Coinbase', 'Kraken', 'Swyftx', 'Aave', 'Compound'],
    taxImplications:
      'Capital gains tax (0-45%) with 50% discount after 12 months. DeFi yields taxed as assessable income.',
    preferredStrategies: ['Bitcoin/Ethereum Hold', 'Stablecoin Yield'],
    riskAdjustments: { regulatory: 0.9, liquidity: 1.0, currency: 1.2 },
  },
  india: {
    country: 'India',
    currency: 'INR',
    regulatoryEnvironment: 'Hostile',
    availableProtocols: ['WazirX', 'CoinDCX', 'Binance'],
    taxImplications:
      'Flat 30% tax on crypto gains with no deductions. 1% TDS on all transactions. No set-off of losses allowed.',
    preferredStrategies: ['Bitcoin/Ethereum Hold'],
    riskAdjustments: { regulatory: 1.5, liquidity: 1.3, currency: 1.2 },
  },
};

// Crypto investment options for tax comparison analysis (January 2025)
const CRYPTO_INVESTMENT_OPTIONS: CryptoInvestmentOption[] = [
  {
    name: 'Bitcoin/Ethereum Hold',
    baseYield: 0.0, // Pure capital appreciation, no yield
    riskLevel: 'Medium',
    description: 'Buy and hold major cryptocurrencies for long-term capital gains',
    taxTreatment: 'Capital Gains',
    platforms: ['Coinbase', 'Kraken', 'Binance'],
    liquidityRisk: false,
    regulatoryRisk: false,
    complexity: 'Beginner',
    minimumInvestment: 100,
    compounding: false,
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
function formatNumber(num: number): string {
  if (typeof window === 'undefined') {
    return num.toString(); // Server-side fallback
  }
  return num.toLocaleString(); // Client-side formatting
}

function AdvancedDefiYieldConfiguratorInner({
  country = 'usa',
  onConfigChange,
  initialConfig,
}: AdvancedDefiYieldConfiguratorProps) {
  const [enabled] = useState(initialConfig?.enabled ?? false);
  const [selectedStrategy, setSelectedStrategy] = useState<CryptoInvestmentOption | null>(null);
  const [baseYield, setBaseYield] = useState(initialConfig?.baseYield ?? 4.8); // Updated default to current market rate
  const [volatility, setVolatility] = useState(initialConfig?.volatility ?? 12.0); // Reduced volatility for current market
  const [riskAdjustment, setRiskAdjustment] = useState(initialConfig?.riskAdjustment ?? 3.0); // More conservative default
  const [compoundingFrequency, setCompoundingFrequency] = useState<
    'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
  >(initialConfig?.compoundingFrequency ?? 'daily');

  // Get country-specific configuration
  const countryConfig = COUNTRY_DEFI_CONFIGS[country] || COUNTRY_DEFI_CONFIGS.usa;

  // Filter strategies based on country's regulatory environment and available platforms
  const availableStrategies = CRYPTO_INVESTMENT_OPTIONS.filter((strategy: CryptoInvestmentOption) =>
    strategy.platforms.some((platform: string) =>
      countryConfig.availableProtocols.includes(platform)
    )
  );

  // Advanced parameters
  const [customParameters, setCustomParameters] = useState<Record<string, number>>({
    slippageTolerance: 0.5,
    gasPrice: 20,
    rebalanceThreshold: 2.0,
    maxDrawdown: 10.0,
  });

  const handleConfigChange = useCallback(() => {
    const config: {
      enabled: boolean;
      baseYield: number;
      volatility: number;
      compoundingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
      riskAdjustment: number;
      strategy?: CryptoInvestmentOption;
      customParameters?: Record<string, number>;
    } = {
      enabled,
      baseYield,
      volatility,
      compoundingFrequency,
      riskAdjustment,
    };

    if (selectedStrategy) {
      config.strategy = selectedStrategy;
    }

    if (Object.keys(customParameters).length > 0) {
      config.customParameters = customParameters;
    }

    onConfigChange(config);
  }, [
    enabled,
    baseYield,
    volatility,
    compoundingFrequency,
    riskAdjustment,
    selectedStrategy,
    customParameters,
    onConfigChange,
  ]);

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

      // Set volatility based on risk level and country factors
      const baseVolatility =
        strategy.riskLevel === 'Low'
          ? 8
          : strategy.riskLevel === 'Medium'
            ? 15
            : strategy.riskLevel === 'High'
              ? 25
              : 40;

      const countryAdjustedVolatility = baseVolatility * countryConfig.riskAdjustments.regulatory;
      setVolatility(Math.round(countryAdjustedVolatility * 10) / 10);

      // Set risk adjustment with country factors
      const baseRiskAdjustment =
        strategy.riskLevel === 'Low'
          ? 2
          : strategy.riskLevel === 'Medium'
            ? 5
            : strategy.riskLevel === 'High'
              ? 10
              : 20;

      const countryAdjustedRisk =
        (baseRiskAdjustment *
          (countryConfig.riskAdjustments.regulatory + countryConfig.riskAdjustments.liquidity)) /
        2;

      setRiskAdjustment(Math.round(countryAdjustedRisk * 10) / 10);
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
    <Card className="w-full">
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
        <Tabs defaultValue="strategies" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="strategies">Crypto Options</TabsTrigger>
            <TabsTrigger value="parameters">Tax Parameters</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="strategies" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Select Crypto Investment Option</Label>
                <Badge variant="outline" className="text-xs">
                  {countryConfig.country} • {countryConfig.regulatoryEnvironment}
                </Badge>
              </div>

              {/* Country-specific tax information */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
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
                    className={`cursor-pointer transition-all hover:shadow-md ${
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
                          <p className="text-sm text-gray-600">{strategy.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {strategy.platforms.map((platform) => (
                              <Badge key={platform} variant="outline" className="text-xs">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {strategy.baseYield.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">APY</div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Complexity:</span>
                          <Badge variant="outline" className="text-xs">
                            {strategy.complexity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Min Investment:</span>
                          <span>${formatNumber(strategy.minimumInvestment)}</span>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Expected Crypto Yield: {baseYield.toFixed(1)}%</Label>
                <p className="text-xs text-gray-600">
                  Annual yield expected from crypto investment (before taxes)
                </p>
                <Slider
                  value={[baseYield]}
                  onValueChange={(value) => {
                    setBaseYield(value[0] ?? 0);
                    handleConfigChange();
                  }}
                  max={30}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Price Volatility: {volatility.toFixed(1)}%</Label>
                <p className="text-xs text-gray-600">
                  Expected annual price volatility of crypto investment
                </p>
                <Slider
                  value={[volatility]}
                  onValueChange={(value) => {
                    setVolatility(value[0] ?? 0);
                    handleConfigChange();
                  }}
                  max={80}
                  min={0}
                  step={0.5}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Tax Drag Adjustment: {riskAdjustment.toFixed(1)}%</Label>
                <p className="text-xs text-gray-600">
                  Additional yield needed to compensate for tax disadvantages vs retirement accounts
                </p>
                <Slider
                  value={[riskAdjustment]}
                  onValueChange={(value) => {
                    setRiskAdjustment(value[0] ?? 0);
                    handleConfigChange();
                  }}
                  max={30}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Compounding Frequency</Label>
                <Select
                  value={compoundingFrequency}
                  onValueChange={(value: string) => {
                    setCompoundingFrequency(
                      value as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
                    );
                    handleConfigChange();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Advanced Parameters</h3>

              {Object.entries(customParameters).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}: {value.toFixed(1)}%
                  </Label>
                  <Slider
                    value={[value]}
                    onValueChange={(newValue) => {
                      setCustomParameters((prev) => ({
                        ...prev,
                        [key]: newValue[0] ?? 0,
                      }));
                      handleConfigChange();
                    }}
                    max={key === 'gasPrice' ? 100 : 50}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              ))}
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
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Advanced DeFi Yield Configuration
          </CardTitle>
          <CardDescription>Loading DeFi configuration...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <AdvancedDefiYieldConfiguratorInner {...props} />;
}
