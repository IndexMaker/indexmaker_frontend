// lib/tax/engines/progressive-tax-engine.ts
// Progressive tax calculation engine for countries with bracket-based tax systems

import { TaxBracketParser } from '../parsers/bracket-parser';
import type { TaxableParams } from '../types';
import type { BracketStructure, TaxResult } from '../types/enhanced';

export interface ProgressiveTaxConfig {
  countryKey: string;
  cryptoTaxText: string;
  currency: string;
  holdingPeriodMonths?: number;
  exemptionThreshold?: number;
  additionalTaxes?: {
    socialSecurity?: number;
    solidarity?: number;
    local?: number;
  };
}

export interface ProgressiveTaxResult extends TaxResult {
  bracketBreakdown: {
    bracket: number;
    rate: number;
    taxableAmount: number;
    tax: number;
  }[];
  marginalRate: number;
  averageRate: number;
  holdingPeriodApplied: boolean;
}

export class ProgressiveTaxEngine {
  private static cache = new Map<string, any>();

  /**
   * Calculate progressive tax for a country using parsed tax brackets
   */
  static calculateProgressiveTax(
    config: ProgressiveTaxConfig,
    params: TaxableParams
  ): ProgressiveTaxResult {
    const { countryKey, cryptoTaxText, currency } = config;
    const { taxableAmount, isLong = false } = params;

    // Parse tax structure from crypto_tax text
    const parsedTax = TaxBracketParser.parse(cryptoTaxText, currency);
    
    if (parsedTax.type !== 'progressive' || !parsedTax.brackets) {
      throw new Error(`Country ${countryKey} does not have progressive tax structure`);
    }

    // Determine if holding period exemption applies
    const holdingPeriodApplied = this.checkHoldingPeriodExemption(parsedTax, isLong);
    
    if (holdingPeriodApplied) {
      return this.createZeroTaxResult(taxableAmount, 'Holding period exemption applied');
    }

    // Check for exemption threshold
    if (parsedTax.exemptions?.annualThreshold && taxableAmount <= parsedTax.exemptions.annualThreshold) {
      return this.createZeroTaxResult(taxableAmount, `Below exemption threshold of ${parsedTax.exemptions.annualThreshold}`);
    }

    // Calculate progressive tax
    const result = this.calculateBracketTax(parsedTax.brackets, taxableAmount);
    
    // Add additional taxes if specified
    const additionalTax = this.calculateAdditionalTaxes(config, taxableAmount);
    
    return {
      ...result,
      tax: result.tax + additionalTax.total,
      niit: additionalTax.solidarity || 0,
      effectiveRate: taxableAmount > 0 ? (result.tax + additionalTax.total) / taxableAmount : 0,
      breakdown: {
        ordinary: result.tax,
        capitalGains: 0,
        exemptionUsed: Math.max(0, (parsedTax.exemptions?.annualThreshold || 0) - taxableAmount)
      },
      holdingPeriodApplied
    } as any;
  }

  /**
   * Calculate tax using progressive brackets
   */
  private static calculateBracketTax(
    brackets: BracketStructure,
    taxableAmount: number
  ): ProgressiveTaxResult {
    const { uppers, rates } = brackets;
    const bracketBreakdown: ProgressiveTaxResult['bracketBreakdown'] = [];
    
    let totalTax = 0;
    let previousUpper = 0;
    let remainingAmount = Math.max(0, taxableAmount);

    for (let i = 0; i < uppers.length && remainingAmount > 0; i++) {
      const upper = uppers[i];
      const rate = rates[i];
      
      // Calculate taxable amount in this bracket
      const bracketLimit = upper === Number.POSITIVE_INFINITY ? remainingAmount : Math.min(upper - previousUpper, remainingAmount);
      const bracketTaxableAmount = Math.min(bracketLimit, remainingAmount);
      
      if (bracketTaxableAmount > 0) {
        const bracketTax = bracketTaxableAmount * rate;
        totalTax += bracketTax;
        
        bracketBreakdown.push({
          bracket: i + 1,
          rate,
          taxableAmount: bracketTaxableAmount,
          tax: bracketTax
        });
        
        remainingAmount -= bracketTaxableAmount;
      }
      
      previousUpper = upper;
    }

    const marginalRate = rates[Math.min(rates.length - 1, bracketBreakdown.length - 1)] || 0;
    const averageRate = taxableAmount > 0 ? totalTax / taxableAmount : 0;

    return {
      tax: totalTax,
      niit: 0,
      effectiveRate: averageRate,
      breakdown: {
        ordinary: totalTax,
        capitalGains: 0,
        exemptionUsed: 0
      },
      bracketBreakdown,
      marginalRate,
      averageRate,
      holdingPeriodApplied: false
    };
  }

  /**
   * Check if holding period exemption applies
   */
  private static checkHoldingPeriodExemption(parsedTax: any, isLong: boolean): boolean {
    if (!parsedTax.holdingPeriodMonths || !isLong) {
      return false;
    }

    // Some countries have full exemption for long-term holdings
    if (parsedTax.specialRules?.includes('tax-free if held')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate additional taxes (solidarity, social security, etc.)
   */
  private static calculateAdditionalTaxes(
    config: ProgressiveTaxConfig,
    taxableAmount: number
  ): { solidarity?: number; socialSecurity?: number; local?: number; total: number } {
    const additional = config.additionalTaxes || {};
    const result: any = { total: 0 };

    if (additional.solidarity) {
      result.solidarity = taxableAmount * additional.solidarity;
      result.total += result.solidarity;
    }

    if (additional.socialSecurity) {
      result.socialSecurity = taxableAmount * additional.socialSecurity;
      result.total += result.socialSecurity;
    }

    if (additional.local) {
      result.local = taxableAmount * additional.local;
      result.total += result.local;
    }

    return result;
  }

  /**
   * Create zero tax result for exemptions
   */
  private static createZeroTaxResult(taxableAmount: number, reason: string): ProgressiveTaxResult {
    return {
      tax: 0,
      niit: 0,
      effectiveRate: 0,
      breakdown: {
        ordinary: 0,
        capitalGains: 0,
        exemptionUsed: taxableAmount
      },
      bracketBreakdown: [],
      marginalRate: 0,
      averageRate: 0,
      holdingPeriodApplied: reason.includes('holding period')
    };
  }

  /**
   * Get progressive tax countries configuration
   */
  static getProgressiveCountries(): Record<string, ProgressiveTaxConfig> {
    return {
      usa: {
        countryKey: 'usa',
        cryptoTaxText: "Short-term capital gains (held less than 1 year, taxed as ordinary income for single filer): 10% ($0-$11,925), 12% ($11,926-$48,535), 22% ($48,536-$103,350), 24% ($103,351-$197,300), 32% ($197,301-$250,525), 35% ($250,526-$626,350), 37% (over $626,350). Long-term (held more than 1 year): 0% ($0-$48,350), 15% ($48,351-$533,400), 20% (over $533,400).",
        currency: 'USD',
        holdingPeriodMonths: 12
      },
      germany: {
        countryKey: 'germany',
        cryptoTaxText: "Tax-free if held more than 1 year or gains under €600; otherwise up to 45% plus 5.5% solidarity surcharge if sold within 1 year (treated as income, brackets for single: 0% €0-€11,604, 14-45% €11,605-€62,810, 45% over €62,810).",
        currency: 'EUR',
        holdingPeriodMonths: 12,
        exemptionThreshold: 600,
        additionalTaxes: {
          solidarity: 0.055
        }
      },
      japan: {
        countryKey: 'japan',
        cryptoTaxText: "Progressive capital gains tax from 5-45% plus local 10% (total 15-55%) depending on total income (brackets: 5% <1.95m yen, 10% 1.95-3.3m, 20% 3.3-6.95m, 23% 6.95-9m, 33% 9-18m, 40% 18-40m, 45% >40m yen).",
        currency: 'JPY',
        additionalTaxes: {
          local: 0.10
        }
      },
      canada: {
        countryKey: 'canada',
        cryptoTaxText: "50% of gains taxed at marginal income rate (federal brackets: 15% $0-$55,867, 20.5% $55,868-$111,733, 26% $111,734-$173,205, 29% $173,206-$246,752, 33% over $246,752) plus provincial taxes.",
        currency: 'CAD'
      },
      australia: {
        countryKey: 'australia',
        cryptoTaxText: "Capital gains tax at marginal rates 0-45% (brackets: 0% $0-$18,200, 19% $18,201-$45,000, 32.5% $45,001-$120,000, 37% $120,001-$180,000, 45% over $180,000) with 50% discount for assets held >12 months.",
        currency: 'AUD',
        holdingPeriodMonths: 12
      },
      spain: {
        countryKey: 'spain',
        cryptoTaxText: "Progressive 19-28% (19% up to €6,000, 21% €6,000-50,000, 23% €50,000-200,000, 26% €200,000-300,000, 28% over €300,000).",
        currency: 'EUR'
      }
    };
  }

  /**
   * Validate progressive tax configuration
   */
  static validateConfig(config: ProgressiveTaxConfig): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!config.countryKey) {
      issues.push('Country key is required');
    }

    if (!config.cryptoTaxText) {
      issues.push('Crypto tax text is required');
    }

    if (!config.currency) {
      issues.push('Currency is required');
    }

    try {
      const parsed = TaxBracketParser.parse(config.cryptoTaxText, config.currency);
      if (parsed.type !== 'progressive') {
        issues.push('Tax text does not parse as progressive tax system');
      }
    } catch (error) {
      issues.push(`Tax parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
