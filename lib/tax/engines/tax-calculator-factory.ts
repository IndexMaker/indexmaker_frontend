// lib/tax/engines/tax-calculator-factory.ts
import { log } from '@/lib/utils/logger';
import type { CountryCode } from '../../types/currency';
import { countryModules } from '../index';
import type { CountryModule, TaxableParams } from '../types';

/**
 * Interface for tax calculation engines
 */
export interface TaxCalculationEngine {
  readonly countryCode: CountryCode;
  readonly countryName: string;
  readonly currency: string;
  
  /**
   * Calculate tax for taxable accounts
   */
  computeTaxable(params: TaxableParams): { readonly tax: number; readonly niit: number };
  
  /**
   * Calculate tax for deferred accounts (401k, IRA, etc.)
   */
  computeDeferredFull(params: TaxableParams): { readonly tax: number; readonly niit: number };
  
  /**
   * Get available tax statuses for this country
   */
  getStatuses(): readonly string[];
  
  /**
   * Get tax brackets for a given status
   */
  getBrackets(status: string): any;
  
  /**
   * Get available account setups for this country
   */
  getSetups(): readonly any[];
}

/**
 * Standard tax calculation engine that wraps a CountryModule
 */
class StandardTaxEngine implements TaxCalculationEngine {
  constructor(private readonly module: CountryModule) {}

  get countryCode(): CountryCode {
    return this.module.key;
  }

  get countryName(): string {
    return this.module.name;
  }

  get currency(): string {
    return this.module.currency;
  }

  computeTaxable(params: TaxableParams): { readonly tax: number; readonly niit: number } {
    return this.module.computeTaxable(params);
  }

  computeDeferredFull(params: TaxableParams): { readonly tax: number; readonly niit: number } {
    return this.module.computeDeferredFull(params);
  }

  getStatuses(): readonly string[] {
    return this.module.statuses;
  }

  getBrackets(status: string) {
    return this.module.getBrackets(status);
  }

  getSetups(): readonly any[] {
    return this.module.setups;
  }
}

/**
 * Enhanced tax calculation engine for countries with advanced features
 */
class EnhancedTaxEngine implements TaxCalculationEngine {
  constructor(
    private readonly module: CountryModule,
    private readonly enhancedFeatures: {
      supportsCrypto?: boolean;
      supportsLongTermGains?: boolean;
      customComputations?: boolean;
    } = {}
  ) {}

  get countryCode(): CountryCode {
    return this.module.key;
  }

  get countryName(): string {
    return this.module.name;
  }

  get currency(): string {
    return this.module.currency;
  }

  computeTaxable(params: TaxableParams): { readonly tax: number; readonly niit: number } {
    // Enhanced engines can have custom logic here
    if (this.enhancedFeatures.customComputations) {
      log.info('Using enhanced tax computation', { country: this.countryCode });
    }
    
    return this.module.computeTaxable(params);
  }

  computeDeferredFull(params: TaxableParams): { readonly tax: number; readonly niit: number } {
    return this.module.computeDeferredFull(params);
  }

  getStatuses(): readonly string[] {
    return this.module.statuses;
  }

  getBrackets(status: string) {
    return this.module.getBrackets(status);
  }

  getSetups(): readonly any[] {
    return this.module.setups;
  }

  /**
   * Enhanced features specific to this engine
   */
  getEnhancedFeatures() {
    return this.enhancedFeatures;
  }
}

/**
 * Factory for creating tax calculation engines
 */
export class TaxCalculatorFactory {
  private static readonly ENHANCED_COUNTRIES: Set<CountryCode> = new Set([
    'usa', 'australia', 'canada', 'uk', 'germany', 'france'
  ]);

  private static readonly DEFAULT_COUNTRY: CountryCode = 'usa';

  /**
   * Create a tax calculation engine for the specified country
   */
  static createEngine(countryCode: CountryCode): TaxCalculationEngine {
    try {
      const module = countryModules[countryCode];
      
      if (!module) {
        log.warn('Country module not found, falling back to default', { 
          requestedCountry: countryCode, 
          fallbackCountry: this.DEFAULT_COUNTRY 
        });
        return this.createEngine(this.DEFAULT_COUNTRY);
      }

      // Determine if this country should use enhanced features
      if (this.ENHANCED_COUNTRIES.has(countryCode)) {
        return new EnhancedTaxEngine(module, {
          supportsCrypto: true,
          supportsLongTermGains: true,
          customComputations: true
        });
      }

      return new StandardTaxEngine(module);
    } catch (error) {
      log.error('Failed to create tax engine', { 
        countryCode, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Fallback to default country
      if (countryCode !== this.DEFAULT_COUNTRY) {
        return this.createEngine(this.DEFAULT_COUNTRY);
      }
      
      throw new Error(`Failed to create tax engine for ${countryCode}`);
    }
  }

  /**
   * Get all available country codes
   */
  static getAvailableCountries(): CountryCode[] {
    return Object.keys(countryModules) as CountryCode[];
  }

  /**
   * Check if a country is supported
   */
  static isCountrySupported(countryCode: string): countryCode is CountryCode {
    return countryCode in countryModules;
  }

  /**
   * Get country information without creating a full engine
   */
  static getCountryInfo(countryCode: CountryCode): {
    name: string;
    currency: string;
    isEnhanced: boolean;
  } | null {
    const module = countryModules[countryCode];
    if (!module) return null;

    return {
      name: module.name,
      currency: module.currency,
      isEnhanced: this.ENHANCED_COUNTRIES.has(countryCode)
    };
  }

  /**
   * Create multiple engines for comparison
   */
  static createMultipleEngines(countryCodes: CountryCode[]): Map<CountryCode, TaxCalculationEngine> {
    const engines = new Map<CountryCode, TaxCalculationEngine>();
    
    for (const countryCode of countryCodes) {
      try {
        engines.set(countryCode, this.createEngine(countryCode));
      } catch (error) {
        log.error('Failed to create engine in batch', { countryCode, error });
      }
    }
    
    return engines;
  }
}

/**
 * Utility function for backward compatibility
 */
export function createTaxEngine(countryCode: CountryCode): TaxCalculationEngine {
  return TaxCalculatorFactory.createEngine(countryCode);
}

/**
 * Type guard to check if an engine is enhanced
 */
export function isEnhancedEngine(engine: TaxCalculationEngine): engine is EnhancedTaxEngine {
  return engine instanceof EnhancedTaxEngine;
}
