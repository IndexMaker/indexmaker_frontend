// lib/tax/engines/unified-tax-engine.ts
// Unified tax calculation engine that integrates all tax system types

import { TaxBracketParser } from '../parsers/bracket-parser';
import type { TaxableParams } from '../types';
import type { TaxResult } from '../types/enhanced';
import { CurrencyFormatter } from '../utils/currency-formatter';
import { getCurrencyInfo } from '../utils/currency-mapping';
import { FlatTaxEngine } from './flat-tax-engine';
import { HoldingPeriodEngine } from './holding-period-engine';
import { ProgressiveTaxEngine, type ProgressiveTaxConfig } from './progressive-tax-engine';
import { SpecialTaxEngine } from './special-tax-engine';

export interface UnifiedTaxConfig {
  countryKey: string;
  cryptoTaxText: string;
  currency: string;
  taxSystem: 'progressive' | 'flat' | 'special';
  holdingPeriodMonths?: number;
}

export interface UnifiedTaxResult extends TaxResult {
  taxSystem: string;
  countryKey: string;
  currency: string;
  formattedAmounts: {
    tax: string;
    gain: string;
    exemption?: string;
  };
  holdingPeriodInfo?: {
    treatment: string;
    description: string;
    monthsHeld: number;
  };
  additionalInfo?: {
    marginalRate?: number;
    flatRate?: number;
    regime?: string;
    exemptionReason?: string;
  };
}

export class UnifiedTaxEngine {
  private static configCache = new Map<string, any>();

  /**
   * Calculate tax for any country using the appropriate engine
   */
  static async calculateTax(
    countryKey: string,
    cryptoTaxText: string,
    params: TaxableParams & { holdingMonths?: number }
  ): Promise<UnifiedTaxResult> {
    // Get currency info
    const currencyInfo = getCurrencyInfo(countryKey);
    const currency = currencyInfo.code;

    // Parse tax system type
    const parsedTax = TaxBracketParser.parse(cryptoTaxText, currency);
    const taxSystem = parsedTax.type as 'progressive' | 'flat' | 'special' | 'exempt' | 'complex';

    // Calculate holding period treatment if applicable
    let holdingPeriodInfo: UnifiedTaxResult['holdingPeriodInfo'];
    if (params.holdingMonths !== undefined) {
      const holdingConfig = HoldingPeriodEngine.getHoldingPeriodConfigs()[countryKey];
      if (holdingConfig) {
        const holdingResult = HoldingPeriodEngine.calculateHoldingPeriod(holdingConfig, params.holdingMonths);
        holdingPeriodInfo = {
          treatment: holdingResult.taxTreatment,
          description: HoldingPeriodEngine.getTaxTreatmentDescription(holdingResult, countryKey),
          monthsHeld: params.holdingMonths
        };
        
        // Create updated params with holding period result
        params = { ...params, isLong: holdingResult.isLongTerm };
      }
    }

    // Calculate tax using appropriate engine
    let result: TaxResult;
    let additionalInfo: UnifiedTaxResult['additionalInfo'] = {};

    try {
      switch (taxSystem) {
        case 'progressive':
          result = await this.calculateProgressiveTax(countryKey, cryptoTaxText, currency, params);
          if ('marginalRate' in result) {
            additionalInfo.marginalRate = (result as any).marginalRate;
          }
          break;

        case 'flat':
          result = await this.calculateFlatTax(countryKey, cryptoTaxText, currency, params);
          if ('flatRate' in result) {
            additionalInfo.flatRate = (result as any).flatRate;
          }
          break;

        case 'special':
        case 'exempt':
        case 'complex':
          result = await this.calculateSpecialTax(countryKey, cryptoTaxText, currency, params);
          if ('regime' in result) {
            additionalInfo.regime = (result as any).regime;
            additionalInfo.exemptionReason = (result as any).exemptionReason;
          }
          break;

        default:
          throw new Error(`Unknown tax system: ${taxSystem} for country ${countryKey}`);
      }
    } catch (error) {
      console.warn(`Tax calculation failed for ${countryKey}, using fallback:`, error);
      result = this.createFallbackResult(params.taxableAmount);
      additionalInfo.exemptionReason = 'Calculation error - using fallback';
    }

    // Format amounts using currency formatter
    const formattedAmounts = {
      tax: CurrencyFormatter.formatCurrency(result.tax, countryKey),
      gain: CurrencyFormatter.formatCurrency(params.taxableAmount, countryKey),
      exemption: result.breakdown?.exemptionUsed ? 
        CurrencyFormatter.formatCurrency(result.breakdown.exemptionUsed, countryKey) : undefined
    };

    return {
      ...result,
      taxSystem,
      countryKey,
      currency,
      formattedAmounts,
      holdingPeriodInfo,
      additionalInfo
    };
  }

  /**
   * Calculate progressive tax
   */
  private static async calculateProgressiveTax(
    countryKey: string,
    cryptoTaxText: string,
    currency: string,
    params: TaxableParams
  ): Promise<TaxResult> {
    const config: ProgressiveTaxConfig = {
      countryKey,
      cryptoTaxText,
      currency
    };

    // Add country-specific configurations
    const progressiveCountries = ProgressiveTaxEngine.getProgressiveCountries();
    if (progressiveCountries[countryKey]) {
      Object.assign(config, progressiveCountries[countryKey]);
    }

    return ProgressiveTaxEngine.calculateProgressiveTax(config, params);
  }

  /**
   * Calculate flat tax
   */
  private static async calculateFlatTax(
    countryKey: string,
    cryptoTaxText: string,
    currency: string,
    params: TaxableParams
  ): Promise<TaxResult> {
    try {
      const config = FlatTaxEngine.parseFromCryptoTax(countryKey, cryptoTaxText, currency);
      return FlatTaxEngine.calculateFlatTax(config, params);
    } catch (error) {
      // Fallback to predefined configurations
      const flatCountries = FlatTaxEngine.getFlatTaxCountries();
      if (flatCountries[countryKey]) {
        return FlatTaxEngine.calculateFlatTax(flatCountries[countryKey], params);
      }
      throw error;
    }
  }

  /**
   * Calculate special tax
   */
  private static async calculateSpecialTax(
    countryKey: string,
    cryptoTaxText: string,
    currency: string,
    params: TaxableParams
  ): Promise<TaxResult> {
    try {
      const config = SpecialTaxEngine.parseFromCryptoTax(countryKey, cryptoTaxText, currency);
      return SpecialTaxEngine.calculateSpecialTax(config, params);
    } catch (error) {
      // Fallback to predefined configurations
      const specialCountries = SpecialTaxEngine.getSpecialTaxCountries();
      if (specialCountries[countryKey]) {
        return SpecialTaxEngine.calculateSpecialTax(specialCountries[countryKey], params);
      }
      throw error;
    }
  }

  /**
   * Create fallback result when calculation fails
   */
  private static createFallbackResult(taxableAmount: number): TaxResult {
    return {
      tax: 0,
      niit: 0,
      effectiveRate: 0,
      breakdown: {
        ordinary: 0,
        capitalGains: 0,
        exemptionUsed: taxableAmount
      }
    };
  }

  /**
   * Get tax system summary for a country
   */
  static getTaxSystemSummary(countryKey: string, cryptoTaxText: string): {
    system: string;
    description: string;
    keyFeatures: string[];
    holdingPeriodBenefits?: string;
  } {
    const currencyInfo = getCurrencyInfo(countryKey);
    const parsed = TaxBracketParser.parse(cryptoTaxText, currencyInfo.code);

    const summary = {
      system: parsed.type,
      description: '',
      keyFeatures: [] as string[],
      holdingPeriodBenefits: undefined as string | undefined
    };

    switch (parsed.type) {
      case 'progressive':
        summary.description = 'Progressive tax system with multiple brackets';
        if (parsed.brackets) {
          summary.keyFeatures.push(`${parsed.brackets.rates.length} tax brackets`);
          const maxRate = Math.max(...parsed.brackets.rates) * 100;
          summary.keyFeatures.push(`Up to ${maxRate.toFixed(1)}% tax rate`);
        }
        break;

      case 'flat':
        summary.description = 'Flat tax system with single rate';
        if (parsed.flatRate) {
          summary.keyFeatures.push(`${(parsed.flatRate * 100).toFixed(1)}% flat rate`);
        }
        break;

      case 'exempt':
        summary.description = 'Tax-free or banned jurisdiction';
        summary.keyFeatures.push('No capital gains tax');
        break;

      case 'complex':
        summary.description = 'Complex tax system requiring detailed analysis';
        summary.keyFeatures.push('Multiple conditions apply');
        break;
    }

    // Add exemption info
    if (parsed.exemptions?.annualThreshold) {
      const formatted = CurrencyFormatter.formatCurrency(parsed.exemptions.annualThreshold, countryKey);
      summary.keyFeatures.push(`${formatted} annual exemption`);
    }

    // Add holding period info
    if (parsed.holdingPeriodMonths) {
      const years = parsed.holdingPeriodMonths / 12;
      summary.holdingPeriodBenefits = `Tax benefits after ${years} year${years !== 1 ? 's' : ''}`;
    }

    return summary;
  }

  /**
   * Compare tax burden across countries
   */
  static async compareTaxBurden(
    gainAmount: number,
    countries: string[],
    holdingMonths?: number
  ): Promise<Array<{
    country: string;
    tax: number;
    effectiveRate: number;
    formattedTax: string;
    system: string;
    currency: string;
  }>> {
    const results = [];

    for (const countryKey of countries) {
      try {
        // This would need access to crypto_tax data - simplified for now
        const mockCryptoTax = "Progressive tax system"; // Would get from data source
        
        const result = await this.calculateTax(countryKey, mockCryptoTax, {
          country: countryKey,
          status: 'single', // Default status
          taxableAmount: gainAmount,
          agiExcl: 50000, // Mock AGI
          isLong: holdingMonths ? holdingMonths >= 12 : false,
          brackets: { ordinary: { uppers: [], rates: [] }, lt: null, stdDed: 0, niitThresh: 0 }, // Mock brackets
          isCrypto: true,
          years: 1,
          holdingMonths
        } as any);

        results.push({
          country: countryKey,
          tax: result.tax,
          effectiveRate: result.effectiveRate,
          formattedTax: result.formattedAmounts.tax,
          system: result.taxSystem,
          currency: result.currency
        });
      } catch (error) {
        console.warn(`Failed to calculate tax for ${countryKey}:`, error);
      }
    }

    return results.sort((a, b) => a.tax - b.tax);
  }

  /**
   * Get optimal holding period for tax minimization
   */
  static getOptimalHoldingStrategy(countryKey: string): {
    recommended: number;
    description: string;
    benefits: string[];
  } {
    const optimal = HoldingPeriodEngine.getOptimalHoldingPeriods(countryKey);
    
    return {
      recommended: optimal.optimal || optimal.longTerm,
      description: optimal.description,
      benefits: [
        optimal.description,
        'Minimize tax burden',
        'Comply with local tax regulations'
      ]
    };
  }

  /**
   * Validate unified tax configuration
   */
  static validateConfiguration(countryKey: string, cryptoTaxText: string): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const currencyInfo = getCurrencyInfo(countryKey);
      const parsed = TaxBracketParser.parse(cryptoTaxText, currencyInfo.code);
      
      if (parsed.type === 'complex') {
        recommendations.push('Consider implementing specific calculation logic for this country');
      }

      if (!parsed.brackets && !parsed.flatRate && parsed.type !== 'exempt') {
        issues.push('Unable to extract tax rates from crypto_tax text');
      }

    } catch (error) {
      issues.push(`Tax parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }
}
