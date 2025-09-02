// lib/tax/utils/currency-converter.ts
// Currency conversion framework with real-time and fixed exchange rates

import { getCurrencyInfo } from './currency-mapping';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
  source: 'api' | 'fixed' | 'cached';
}

export interface ConversionResult {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: number;
  source: string;
}

export interface ConversionOptions {
  useCache?: boolean;
  cacheMaxAge?: number; // milliseconds
  fallbackToFixed?: boolean;
  roundTo?: number; // decimal places
}

// Fixed exchange rates as fallback (approximate rates as of 2024)
const FIXED_EXCHANGE_RATES: Record<string, Record<string, number>> = {
  USD: {
    EUR: 0.85, GBP: 0.79, JPY: 150, CAD: 1.35, AUD: 1.52, CHF: 0.88,
    CNY: 7.25, INR: 83, KRW: 1320, SGD: 1.34, HKD: 7.8, TWD: 31.5,
    THB: 36, MYR: 4.7, IDR: 15800, PHP: 56, VND: 24500,
    AED: 3.67, SAR: 3.75, ILS: 3.7, TRY: 30, IRR: 42000, IQD: 1310,
    EGP: 31, ZAR: 18.5, DZD: 135, BRL: 5.0, ARS: 350, CLP: 950,
    COP: 4000, PEN: 3.7, RUB: 90, KZT: 450, BDT: 110, PKR: 280,
    NOK: 10.8, SEK: 10.4, DKK: 6.9, PLN: 4.0, CZK: 23, RON: 4.6
  }
};

export class CurrencyConverter {
  private static cache = new Map<string, ExchangeRate>();
  private static apiKey: string | null = null;
  private static apiUrl = 'https://api.exchangerate-api.com/v4/latest/';

  /**
   * Set API key for real-time exchange rates
   */
  static setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Convert amount between currencies
   */
  static async convert(
    amount: number,
    fromCountry: string,
    toCountry: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    const {
      useCache = true,
      cacheMaxAge = 3600000, // 1 hour
      fallbackToFixed = true,
      roundTo = 2
    } = options;

    const fromCurrency = getCurrencyInfo(fromCountry).code;
    const toCurrency = getCurrencyInfo(toCountry).code;

    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        timestamp: Date.now(),
        source: 'same-currency'
      };
    }

    try {
      // Try to get exchange rate
      const exchangeRate = await this.getExchangeRate(
        fromCurrency,
        toCurrency,
        { useCache, cacheMaxAge, fallbackToFixed }
      );

      const convertedAmount = this.roundTo(amount * exchangeRate.rate, roundTo);

      return {
        originalAmount: amount,
        convertedAmount,
        fromCurrency,
        toCurrency,
        exchangeRate: exchangeRate.rate,
        timestamp: exchangeRate.timestamp,
        source: exchangeRate.source
      };

    } catch (error) {
      console.error('Currency conversion failed:', error);
      throw new Error(`Failed to convert ${fromCurrency} to ${toCurrency}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  static async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    options: ConversionOptions = {}
  ): Promise<ExchangeRate> {
    const {
      useCache = true,
      cacheMaxAge = 3600000,
      fallbackToFixed = true
    } = options;

    const cacheKey = `${fromCurrency}-${toCurrency}`;

    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheMaxAge) {
        return cached;
      }
    }

    try {
      // Try API first if available
      if (this.apiKey) {
        const apiRate = await this.fetchFromApi(fromCurrency, toCurrency);
        this.cache.set(cacheKey, apiRate);
        return apiRate;
      }

      // Fallback to fixed rates
      if (fallbackToFixed) {
        const fixedRate = this.getFixedRate(fromCurrency, toCurrency);
        this.cache.set(cacheKey, fixedRate);
        return fixedRate;
      }

      throw new Error('No exchange rate source available');

    } catch (error) {
      // Last resort: try fixed rates even if not requested
      if (!fallbackToFixed) {
        console.warn('API failed, falling back to fixed rates:', error);
        const fixedRate = this.getFixedRate(fromCurrency, toCurrency);
        this.cache.set(cacheKey, fixedRate);
        return fixedRate;
      }
      throw error;
    }
  }

  /**
   * Fetch exchange rate from API
   */
  private static async fetchFromApi(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate> {
    try {
      const response = await fetch(`${this.apiUrl}${fromCurrency}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.rates || !data.rates[toCurrency]) {
        throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
      }

      return {
        from: fromCurrency,
        to: toCurrency,
        rate: data.rates[toCurrency],
        timestamp: Date.now(),
        source: 'api'
      };

    } catch (error) {
      throw new Error(`API fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get fixed exchange rate
   */
  private static getFixedRate(fromCurrency: string, toCurrency: string): ExchangeRate {
    // Direct rate
    if (FIXED_EXCHANGE_RATES[fromCurrency]?.[toCurrency]) {
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: FIXED_EXCHANGE_RATES[fromCurrency][toCurrency],
        timestamp: Date.now(),
        source: 'fixed'
      };
    }

    // Inverse rate
    if (FIXED_EXCHANGE_RATES[toCurrency]?.[fromCurrency]) {
      return {
        from: fromCurrency,
        to: toCurrency,
        rate: 1 / FIXED_EXCHANGE_RATES[toCurrency][fromCurrency],
        timestamp: Date.now(),
        source: 'fixed'
      };
    }

    // Cross rate via USD
    if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const fromToUsd = FIXED_EXCHANGE_RATES[fromCurrency]?.USD || 
                       (FIXED_EXCHANGE_RATES.USD[fromCurrency] ? 1 / FIXED_EXCHANGE_RATES.USD[fromCurrency] : null);
      const usdToTo = FIXED_EXCHANGE_RATES.USD[toCurrency] || 
                     (FIXED_EXCHANGE_RATES[toCurrency]?.USD ? 1 / FIXED_EXCHANGE_RATES[toCurrency].USD : null);

      if (fromToUsd && usdToTo) {
        return {
          from: fromCurrency,
          to: toCurrency,
          rate: fromToUsd * usdToTo,
          timestamp: Date.now(),
          source: 'fixed'
        };
      }
    }

    throw new Error(`No fixed exchange rate available for ${fromCurrency} to ${toCurrency}`);
  }

  /**
   * Convert tax results between currencies for comparison
   */
  static async convertTaxResult(
    taxResult: { tax: number; niit?: number; total?: number },
    fromCountry: string,
    toCountry: string,
    options: ConversionOptions = {}
  ): Promise<{ tax: number; niit?: number; total?: number; exchangeRate: number; source: string }> {
    const taxConversion = await this.convert(taxResult.tax, fromCountry, toCountry, options);
    
    const result: any = {
      tax: taxConversion.convertedAmount,
      exchangeRate: taxConversion.exchangeRate,
      source: taxConversion.source
    };

    if (taxResult.niit !== undefined) {
      const niitConversion = await this.convert(taxResult.niit, fromCountry, toCountry, options);
      result.niit = niitConversion.convertedAmount;
    }

    if (taxResult.total !== undefined) {
      const totalConversion = await this.convert(taxResult.total, fromCountry, toCountry, options);
      result.total = totalConversion.convertedAmount;
    } else if (result.niit !== undefined) {
      result.total = result.tax + result.niit;
    }

    return result;
  }

  /**
   * Get all supported currencies
   */
  static getSupportedCurrencies(): string[] {
    const currencies = new Set<string>();
    
    // Add all currencies from fixed rates
    Object.keys(FIXED_EXCHANGE_RATES).forEach(from => {
      currencies.add(from);
      Object.keys(FIXED_EXCHANGE_RATES[from]).forEach(to => {
        currencies.add(to);
      });
    });

    return Array.from(currencies).sort();
  }

  /**
   * Clear exchange rate cache
   */
  static clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Round number to specified decimal places
   */
  private static roundTo(num: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  /**
   * Validate conversion setup
   */
  static validateSetup(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if we have any exchange rate source
    if (!this.apiKey && Object.keys(FIXED_EXCHANGE_RATES).length === 0) {
      issues.push('No exchange rate source available (no API key or fixed rates)');
    }

    // Test a few conversions
    try {
      this.getFixedRate('USD', 'EUR');
    } catch (error) {
      issues.push('Fixed rate conversion test failed');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
