// lib/tax/engines/special-tax-engine.ts
// Special tax regime engine for exempt, banned, and complex tax systems

import { TaxBracketParser } from '../parsers/bracket-parser';
import { getCurrencyInfo } from '../utils/currency-mapping';
import type { TaxResult } from '../types/enhanced';
import type { TaxableParams } from '../types';

export interface SpecialTaxConfig {
  countryKey: string;
  cryptoTaxText: string;
  currency: string;
  regime: 'exempt' | 'banned' | 'threshold' | 'complex' | 'conditional';
  thresholdAmount?: number;
  baseRate?: number;
  alternativeRate?: number;
  holdingPeriodMonths?: number;
  conditions?: string[];
  specialRules?: string[];
}

export interface SpecialTaxResult extends TaxResult {
  regime: string;
  conditionsMet: string[];
  exemptionReason?: string;
  thresholdApplied?: boolean;
}

export class SpecialTaxEngine {
  /**
   * Calculate tax for special regime countries
   */
  static calculateSpecialTax(
    config: SpecialTaxConfig,
    params: TaxableParams
  ): SpecialTaxResult {
    const { regime, countryKey } = config;
    const { taxableAmount, isLong = false } = params;

    switch (regime) {
      case 'exempt':
        return this.calculateExemptTax(config, params);
      
      case 'banned':
        return this.calculateBannedTax(config, params);
      
      case 'threshold':
        return this.calculateThresholdTax(config, params);
      
      case 'conditional':
        return this.calculateConditionalTax(config, params);
      
      case 'complex':
        return this.calculateComplexTax(config, params);
      
      default:
        throw new Error(`Unknown special tax regime: ${regime} for country ${countryKey}`);
    }
  }

  /**
   * Calculate tax for exempt jurisdictions
   */
  private static calculateExemptTax(config: SpecialTaxConfig, params: TaxableParams): SpecialTaxResult {
    return {
      tax: 0,
      niit: 0,
      effectiveRate: 0,
      breakdown: {
        ordinary: 0,
        capitalGains: 0,
        exemptionUsed: params.taxableAmount
      },
      regime: 'exempt',
      conditionsMet: ['Tax-free jurisdiction'],
      exemptionReason: 'No capital gains tax for individuals'
    };
  }

  /**
   * Calculate tax for banned jurisdictions
   */
  private static calculateBannedTax(config: SpecialTaxConfig, params: TaxableParams): SpecialTaxResult {
    return {
      tax: 0,
      niit: 0,
      effectiveRate: 0,
      breakdown: {
        ordinary: 0,
        capitalGains: 0,
        exemptionUsed: 0
      },
      regime: 'banned',
      conditionsMet: ['Cryptocurrency banned'],
      exemptionReason: 'Cryptocurrency trading is prohibited'
    };
  }

  /**
   * Calculate tax for threshold-based systems (e.g., Italy €2,000 threshold)
   */
  private static calculateThresholdTax(config: SpecialTaxConfig, params: TaxableParams): SpecialTaxResult {
    const { thresholdAmount = 0, baseRate = 0 } = config;
    const { taxableAmount } = params;

    if (taxableAmount <= thresholdAmount) {
      return {
        tax: 0,
        niit: 0,
        effectiveRate: 0,
        breakdown: {
          ordinary: 0,
          capitalGains: 0,
          exemptionUsed: taxableAmount
        },
        regime: 'threshold',
        conditionsMet: [`Below threshold of ${thresholdAmount}`],
        thresholdApplied: true
      };
    }

    // Tax only on amount above threshold
    const taxableAboveThreshold = taxableAmount - thresholdAmount;
    const tax = taxableAboveThreshold * baseRate;

    return {
      tax,
      niit: 0,
      effectiveRate: taxableAmount > 0 ? tax / taxableAmount : 0,
      breakdown: {
        ordinary: tax,
        capitalGains: 0,
        exemptionUsed: thresholdAmount
      },
      regime: 'threshold',
      conditionsMet: [`Above threshold of ${thresholdAmount}`],
      thresholdApplied: true
    };
  }

  /**
   * Calculate tax for conditional systems (e.g., Portugal short-term vs long-term)
   */
  private static calculateConditionalTax(config: SpecialTaxConfig, params: TaxableParams): SpecialTaxResult {
    const { baseRate = 0, alternativeRate = 0, holdingPeriodMonths = 12 } = config;
    const { taxableAmount, isLong = false } = params;

    // Determine which rate applies
    const rateToUse = isLong ? (alternativeRate || 0) : baseRate;
    const tax = taxableAmount * rateToUse;

    const conditionsMet = isLong ? 
      [`Long-term holding (≥${holdingPeriodMonths} months)`] : 
      [`Short-term holding (<${holdingPeriodMonths} months)`];

    return {
      tax,
      niit: 0,
      effectiveRate: taxableAmount > 0 ? tax / taxableAmount : 0,
      breakdown: {
        ordinary: tax,
        capitalGains: 0,
        exemptionUsed: 0
      },
      regime: 'conditional',
      conditionsMet
    };
  }

  /**
   * Calculate tax for complex systems (e.g., Denmark progressive based on income)
   */
  private static calculateComplexTax(config: SpecialTaxConfig, params: TaxableParams): SpecialTaxResult {
    const { baseRate = 0 } = config;
    const { taxableAmount } = params;

    // For complex systems, use base rate as approximation
    // In real implementation, would need additional parameters
    const tax = taxableAmount * baseRate;

    return {
      tax,
      niit: 0,
      effectiveRate: taxableAmount > 0 ? tax / taxableAmount : 0,
      breakdown: {
        ordinary: tax,
        capitalGains: 0,
        exemptionUsed: 0
      },
      regime: 'complex',
      conditionsMet: ['Complex tax calculation applied']
    };
  }

  /**
   * Get special tax countries configuration
   */
  static getSpecialTaxCountries(): Record<string, SpecialTaxConfig> {
    return {
      // Banned jurisdictions
      china: {
        countryKey: 'china',
        cryptoTaxText: "Cryptocurrency is banned; no legal tax rate applies.",
        currency: 'CNY',
        regime: 'banned'
      },
      bangladesh: {
        countryKey: 'bangladesh',
        cryptoTaxText: "Cryptocurrency is banned; no legal tax rate applies.",
        currency: 'BDT',
        regime: 'banned'
      },
      egypt: {
        countryKey: 'egypt',
        cryptoTaxText: "Cryptocurrency is banned; no legal tax rate applies.",
        currency: 'EGP',
        regime: 'banned'
      },
      iraq: {
        countryKey: 'iraq',
        cryptoTaxText: "Cryptocurrency is banned; no legal tax rate applies.",
        currency: 'IQD',
        regime: 'banned'
      },
      algeria: {
        countryKey: 'algeria',
        cryptoTaxText: "Cryptocurrency is banned; no legal tax rate applies.",
        currency: 'DZD',
        regime: 'banned'
      },

      // Exempt jurisdictions
      uae: {
        countryKey: 'uae',
        cryptoTaxText: "0%; no personal income or capital gains tax. 5% VAT may apply to services.",
        currency: 'AED',
        regime: 'exempt'
      },
      saudiarabia: {
        countryKey: 'saudiarabia',
        cryptoTaxText: "Exempt from taxation; no income or capital gains tax on crypto for individuals.",
        currency: 'SAR',
        regime: 'exempt'
      },
      singapore: {
        countryKey: 'singapore',
        cryptoTaxText: "0% capital gains tax for individual investors; income tax up to 24% for trading businesses.",
        currency: 'SGD',
        regime: 'exempt'
      },

      // Threshold-based systems
      italy: {
        countryKey: 'italy',
        cryptoTaxText: "26% on gains over €2,000; planned increase to 42% (subject to change).",
        currency: 'EUR',
        regime: 'threshold',
        thresholdAmount: 2000,
        baseRate: 0.26
      },

      // Conditional systems
      portugal: {
        countryKey: 'portugal',
        cryptoTaxText: "28% on short-term gains (held less than 1 year); tax-free if held more than 1 year for personal investment.",
        currency: 'EUR',
        regime: 'conditional',
        baseRate: 0.28,
        alternativeRate: 0.0,
        holdingPeriodMonths: 12
      },
      czechrepublic: {
        countryKey: 'czechrepublic',
        cryptoTaxText: "Tax-free if held more than 3 years; otherwise progressive 15-23% based on total income.",
        currency: 'CZK',
        regime: 'conditional',
        baseRate: 0.15,
        alternativeRate: 0.0,
        holdingPeriodMonths: 36
      },

      // Complex systems
      denmark: {
        countryKey: 'denmark',
        cryptoTaxText: "Progressive 37-52% depending on income bracket (bottom 37% up to DKK 552,500, top 15% above DKK 552,500).",
        currency: 'DKK',
        regime: 'complex',
        baseRate: 0.37 // Simplified - would need income-based calculation
      },
      netherlands: {
        countryKey: 'netherlands',
        cryptoTaxText: "Wealth tax under Box 3 at up to 36% on deemed yield (assumed 5.53% return on crypto assets above €57,000 exemption).",
        currency: 'EUR',
        regime: 'complex',
        baseRate: 0.36,
        thresholdAmount: 57000
      }
    };
  }

  /**
   * Parse special tax configuration from crypto_tax text
   */
  static parseFromCryptoTax(countryKey: string, cryptoTaxText: string, currency: string): SpecialTaxConfig {
    const text = cryptoTaxText.toLowerCase();
    
    // Determine regime type
    let regime: SpecialTaxConfig['regime'] = 'complex';
    
    if (text.includes('banned') || text.includes('prohibited')) {
      regime = 'banned';
    } else if (text.includes('0%') || text.includes('exempt') || text.includes('no tax')) {
      regime = 'exempt';
    } else if (text.includes('over') && text.match(/€\d+|£\d+|\$\d+/)) {
      regime = 'threshold';
    } else if (text.includes('short-term') && text.includes('long-term')) {
      regime = 'conditional';
    }

    const config: SpecialTaxConfig = {
      countryKey,
      cryptoTaxText,
      currency,
      regime
    };

    // Extract threshold amount
    const thresholdMatch = text.match(/over\s*[€£$¥₹]?([\d,]+)/);
    if (thresholdMatch) {
      config.thresholdAmount = parseFloat(thresholdMatch[1].replace(/,/g, ''));
    }

    // Extract base rate
    const rateMatch = text.match(/(\d+(?:\.\d+)?)%/);
    if (rateMatch) {
      config.baseRate = parseFloat(rateMatch[1]) / 100;
    }

    return config;
  }

  /**
   * Validate special tax configuration
   */
  static validateConfig(config: SpecialTaxConfig): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!config.countryKey) {
      issues.push('Country key is required');
    }

    if (!config.currency) {
      issues.push('Currency is required');
    }

    if (!['exempt', 'banned', 'threshold', 'complex', 'conditional'].includes(config.regime)) {
      issues.push('Invalid regime type');
    }

    if (config.regime === 'threshold' && !config.thresholdAmount) {
      issues.push('Threshold amount required for threshold regime');
    }

    if (config.baseRate !== undefined && (config.baseRate < 0 || config.baseRate > 1)) {
      issues.push('Base rate must be between 0 and 1');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
