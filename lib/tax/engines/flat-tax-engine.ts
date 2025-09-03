// lib/tax/engines/flat-tax-engine.ts
// Flat tax calculation engine for countries with single-rate tax systems

import { TaxBracketParser } from '../parsers/bracket-parser';
import type { TaxableParams } from '../types';
import type { TaxResult } from '../types/enhanced';

export interface FlatTaxConfig {
  countryKey: string;
  cryptoTaxText: string;
  currency: string;
  flatRate: number;
  exemptionThreshold?: number;
  holdingPeriodMonths?: number;
  additionalTaxes?: {
    cess?: number;           // India: 4% cess
    socialCharges?: number;  // France: 17.2% social charges
    withholding?: number;    // Various countries
  };
  specialRules?: string[];
}

export interface FlatTaxResult extends TaxResult {
  flatRate: number;
  exemptionApplied: number;
  holdingPeriodApplied: boolean;
  additionalTaxBreakdown?: {
    cess?: number;
    socialCharges?: number;
    withholding?: number;
  };
}

export class FlatTaxEngine {
  /**
   * Calculate flat tax for a country
   */
  static calculateFlatTax(
    config: FlatTaxConfig,
    params: TaxableParams
  ): FlatTaxResult {
    const { countryKey, flatRate, exemptionThreshold = 0, holdingPeriodMonths } = config;
    const { taxableAmount, isLong = false } = params;

    // Check holding period exemption
    const holdingPeriodApplied = this.checkHoldingPeriodExemption(config, isLong);
    
    if (holdingPeriodApplied) {
      return this.createZeroTaxResult(taxableAmount, flatRate, 'Holding period exemption');
    }

    // Apply exemption threshold
    const exemptionApplied = Math.min(exemptionThreshold, taxableAmount);
    const taxableAfterExemption = Math.max(0, taxableAmount - exemptionThreshold);

    // Calculate base flat tax
    const baseTax = taxableAfterExemption * flatRate;

    // Calculate additional taxes
    const additionalTaxes = this.calculateAdditionalTaxes(config, taxableAfterExemption);
    const totalTax = baseTax + additionalTaxes.total;

    return {
      tax: totalTax,
      niit: additionalTaxes.cess || 0,
      effectiveRate: taxableAmount > 0 ? totalTax / taxableAmount : 0,
      breakdown: {
        ordinary: baseTax,
        capitalGains: 0,
        exemptionUsed: exemptionApplied
      },
      flatRate,
      exemptionApplied,
      holdingPeriodApplied,
      additionalTaxBreakdown: additionalTaxes.breakdown
    } as any;
  }

  /**
   * Parse flat tax configuration from crypto_tax text
   */
  static parseFromCryptoTax(countryKey: string, cryptoTaxText: string, currency: string): FlatTaxConfig {
    const parsed = TaxBracketParser.parse(cryptoTaxText, currency);
    
    if (parsed.type !== 'flat') {
      throw new Error(`Country ${countryKey} does not have flat tax structure`);
    }

    const config: FlatTaxConfig = {
      countryKey,
      cryptoTaxText,
      currency,
      flatRate: parsed.flatRate || 0,
      exemptionThreshold: parsed.exemptions?.annualThreshold,
      holdingPeriodMonths: parsed.holdingPeriodMonths,
      specialRules: parsed.specialRules || []
    };

    // Parse additional taxes from text
    const text = cryptoTaxText.toLowerCase();
    
    if (text.includes('cess')) {
      const cessMatch = text.match(/(\d+(?:\.\d+)?)%\s*cess/);
      if (cessMatch) {
        config.additionalTaxes = { cess: parseFloat(cessMatch[1]) / 100 };
      }
    }

    if (text.includes('social charges')) {
      const socialMatch = text.match(/(\d+(?:\.\d+)?)%\s*social charges/);
      if (socialMatch) {
        config.additionalTaxes = { 
          ...config.additionalTaxes,
          socialCharges: parseFloat(socialMatch[1]) / 100 
        };
      }
    }

    return config;
  }

  /**
   * Check if holding period exemption applies
   */
  private static checkHoldingPeriodExemption(config: FlatTaxConfig, isLong: boolean): boolean {
    if (!config.holdingPeriodMonths || !isLong) {
      return false;
    }

    // Check for full exemption rules
    const exemptionRules = [
      'tax-free if held',
      'exempt if held',
      'no tax if held'
    ];

    return config.specialRules?.some(rule => 
      exemptionRules.some(exemption => rule.includes(exemption))
    ) || false;
  }

  /**
   * Calculate additional taxes
   */
  private static calculateAdditionalTaxes(
    config: FlatTaxConfig,
    taxableAmount: number
  ): { total: number; cess?: number; socialCharges?: number; withholding?: number; breakdown?: any } {
    const additional = config.additionalTaxes || {};
    const result: any = { total: 0, breakdown: {} };

    if (additional.cess) {
      result.cess = taxableAmount * additional.cess;
      result.total += result.cess;
      result.breakdown.cess = result.cess;
    }

    if (additional.socialCharges) {
      result.socialCharges = taxableAmount * additional.socialCharges;
      result.total += result.socialCharges;
      result.breakdown.socialCharges = result.socialCharges;
    }

    if (additional.withholding) {
      result.withholding = taxableAmount * additional.withholding;
      result.total += result.withholding;
      result.breakdown.withholding = result.withholding;
    }

    return result;
  }

  /**
   * Create zero tax result for exemptions
   */
  private static createZeroTaxResult(
    taxableAmount: number, 
    flatRate: number, 
    reason: string
  ): FlatTaxResult {
    return {
      tax: 0,
      niit: 0,
      effectiveRate: 0,
      breakdown: {
        ordinary: 0,
        capitalGains: 0,
        exemptionUsed: taxableAmount
      },
      flatRate,
      exemptionApplied: taxableAmount,
      holdingPeriodApplied: reason.includes('holding period')
    };
  }

  /**
   * Get flat tax countries configuration
   */
  static getFlatTaxCountries(): Record<string, FlatTaxConfig> {
    return {
      poland: {
        countryKey: 'poland',
        cryptoTaxText: "Flat 19% on gains; no distinction for holding periods. Mining/staking taxed as other income at 19%.",
        currency: 'PLN',
        flatRate: 0.19
      },
      austria: {
        countryKey: 'austria',
        cryptoTaxText: "Flat 27.5% on capital income from cryptocurrencies; no distinction for holding periods.",
        currency: 'EUR',
        flatRate: 0.275
      },
      norway: {
        countryKey: 'norway',
        cryptoTaxText: "Flat 22% on capital gains; no distinction for holding periods.",
        currency: 'NOK',
        flatRate: 0.22
      },
      ireland: {
        countryKey: 'ireland',
        cryptoTaxText: "Flat 33% on capital gains; no exemptions or distinction for holding periods.",
        currency: 'EUR',
        flatRate: 0.33
      },
      greece: {
        countryKey: 'greece',
        cryptoTaxText: "Flat 15% on capital gains; no exemptions or distinction for holding periods.",
        currency: 'EUR',
        flatRate: 0.15
      },
      france: {
        countryKey: 'france',
        cryptoTaxText: "Flat 30% (12.8% income tax + 17.2% social charges); tax-free if held more than 8 years with annual allowance.",
        currency: 'EUR',
        flatRate: 0.128,
        holdingPeriodMonths: 96, // 8 years
        additionalTaxes: {
          socialCharges: 0.172
        }
      },
      russia: {
        countryKey: 'russia',
        cryptoTaxText: "13% on gains up to 2.4 million RUB; 15% above. No distinction for holding periods.",
        currency: 'RUB',
        flatRate: 0.13 // Base rate, would need progressive logic for amounts above threshold
      },
      india: {
        countryKey: 'india',
        cryptoTaxText: "Flat 30% on gains (plus 4% cess), no deductions allowed; 1% TDS on transactions over ₹50,000.",
        currency: 'INR',
        flatRate: 0.30,
        additionalTaxes: {
          cess: 0.04
        }
      },
      sweden: {
        countryKey: 'sweden',
        cryptoTaxText: "Flat 30% on capital gains; no distinction for holding periods.",
        currency: 'SEK',
        flatRate: 0.30
      }
    };
  }

  /**
   * Validate flat tax configuration
   */
  static validateConfig(config: FlatTaxConfig): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!config.countryKey) {
      issues.push('Country key is required');
    }

    if (!config.currency) {
      issues.push('Currency is required');
    }

    if (config.flatRate === undefined || config.flatRate < 0 || config.flatRate > 1) {
      issues.push('Flat rate must be between 0 and 1');
    }

    if (config.exemptionThreshold && config.exemptionThreshold < 0) {
      issues.push('Exemption threshold cannot be negative');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get effective tax rate including all additional taxes
   */
  static getEffectiveRate(config: FlatTaxConfig): number {
    let effectiveRate = config.flatRate;
    
    if (config.additionalTaxes) {
      effectiveRate += config.additionalTaxes.cess || 0;
      effectiveRate += config.additionalTaxes.socialCharges || 0;
      effectiveRate += config.additionalTaxes.withholding || 0;
    }

    return effectiveRate;
  }
}
