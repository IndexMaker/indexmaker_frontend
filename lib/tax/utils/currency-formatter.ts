// lib/tax/utils/currency-formatter.ts
// Localized number and currency formatting system

import { getCurrencyInfo, type CurrencyInfo } from './currency-mapping';

export interface FormatOptions {
  showSymbol?: boolean;
  showCode?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

export class CurrencyFormatter {
  private static formatters = new Map<string, Intl.NumberFormat>();
  
  /**
   * Format a number as currency for a specific country
   */
  static formatCurrency(
    amount: number,
    countryKey: string,
    options: FormatOptions = {}
  ): string {
    const currencyInfo = getCurrencyInfo(countryKey);
    const {
      showSymbol = true,
      showCode = false,
      minimumFractionDigits = currencyInfo.decimals,
      maximumFractionDigits = currencyInfo.decimals,
      useGrouping = true
    } = options;

    try {
      // Create formatter key for caching
      const formatterKey = `${currencyInfo.locale}-${currencyInfo.code}-${minimumFractionDigits}-${maximumFractionDigits}-${useGrouping}`;
      
      if (!this.formatters.has(formatterKey)) {
        const formatter = new Intl.NumberFormat(currencyInfo.locale, {
          style: 'currency',
          currency: currencyInfo.code,
          minimumFractionDigits,
          maximumFractionDigits,
          useGrouping
        });
        this.formatters.set(formatterKey, formatter);
      }

      const formatter = this.formatters.get(formatterKey)!;
      let formatted = formatter.format(amount);

      // Handle special cases where we want to show code instead of symbol
      if (showCode && !showSymbol) {
        // Replace symbol with code
        formatted = formatted.replace(currencyInfo.symbol, currencyInfo.code);
      } else if (showCode && showSymbol) {
        // Add code after the formatted amount
        formatted = `${formatted} (${currencyInfo.code})`;
      } else if (!showSymbol) {
        // Remove symbol entirely
        formatted = formatted.replace(currencyInfo.symbol, '').trim();
      }

      return formatted;

    } catch (error) {
      // Fallback to manual formatting if Intl.NumberFormat fails
      console.warn(`Currency formatting failed for ${countryKey}:`, error);
      return this.fallbackFormat(amount, currencyInfo, options);
    }
  }

  /**
   * Format a number without currency symbol (for calculations display)
   */
  static formatNumber(
    amount: number,
    countryKey: string,
    options: Partial<FormatOptions> = {}
  ): string {
    const currencyInfo = getCurrencyInfo(countryKey);
    const {
      minimumFractionDigits = currencyInfo.decimals,
      maximumFractionDigits = currencyInfo.decimals,
      useGrouping = true
    } = options;

    try {
      const formatter = new Intl.NumberFormat(currencyInfo.locale, {
        minimumFractionDigits,
        maximumFractionDigits,
        useGrouping
      });

      return formatter.format(amount);
    } catch (error) {
      // Fallback to basic formatting
      return amount.toLocaleString('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
        useGrouping
      });
    }
  }

  /**
   * Parse a formatted currency string back to number
   */
  static parseCurrency(formattedAmount: string, countryKey: string): number {
    const currencyInfo = getCurrencyInfo(countryKey);
    
    // Remove currency symbols and codes
    let cleanAmount = formattedAmount
      .replace(currencyInfo.symbol, '')
      .replace(currencyInfo.code, '')
      .trim();

    // Handle different decimal separators
    if (currencyInfo.locale.includes('de') || currencyInfo.locale.includes('fr')) {
      // European format: 1.234.567,89
      cleanAmount = cleanAmount.replace(/\./g, '').replace(',', '.');
    } else {
      // US/UK format: 1,234,567.89
      cleanAmount = cleanAmount.replace(/,/g, '');
    }

    const parsed = parseFloat(cleanAmount);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Get currency symbol for a country
   */
  static getCurrencySymbol(countryKey: string): string {
    return getCurrencyInfo(countryKey).symbol;
  }

  /**
   * Get currency code for a country
   */
  static getCurrencyCode(countryKey: string): string {
    return getCurrencyInfo(countryKey).code;
  }

  /**
   * Format tax rate as percentage
   */
  static formatPercentage(rate: number, countryKey: string, decimals: number = 1): string {
    const currencyInfo = getCurrencyInfo(countryKey);
    
    try {
      const formatter = new Intl.NumberFormat(currencyInfo.locale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });

      return formatter.format(rate);
    } catch (error) {
      // Fallback
      return `${(rate * 100).toFixed(decimals)}%`;
    }
  }

  /**
   * Format large numbers with appropriate suffixes (K, M, B)
   */
  static formatCompact(amount: number, countryKey: string): string {
    const currencyInfo = getCurrencyInfo(countryKey);
    
    try {
      const formatter = new Intl.NumberFormat(currencyInfo.locale, {
        notation: 'compact',
        compactDisplay: 'short',
        style: 'currency',
        currency: currencyInfo.code,
        maximumFractionDigits: 1
      });

      return formatter.format(amount);
    } catch (error) {
      // Fallback with manual compact formatting
      const absAmount = Math.abs(amount);
      const sign = amount < 0 ? '-' : '';
      
      if (absAmount >= 1e9) {
        return `${sign}${currencyInfo.symbol}${(absAmount / 1e9).toFixed(1)}B`;
      } else if (absAmount >= 1e6) {
        return `${sign}${currencyInfo.symbol}${(absAmount / 1e6).toFixed(1)}M`;
      } else if (absAmount >= 1e3) {
        return `${sign}${currencyInfo.symbol}${(absAmount / 1e3).toFixed(1)}K`;
      } else {
        return this.formatCurrency(amount, countryKey);
      }
    }
  }

  /**
   * Fallback formatting when Intl.NumberFormat fails
   */
  private static fallbackFormat(
    amount: number,
    currencyInfo: CurrencyInfo,
    options: FormatOptions
  ): string {
    const {
      showSymbol = true,
      showCode = false,
      minimumFractionDigits = currencyInfo.decimals,
      useGrouping = true
    } = options;

    // Basic number formatting
    let formatted = amount.toFixed(minimumFractionDigits);
    
    if (useGrouping) {
      // Add thousand separators
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }

    // Add currency symbol/code
    if (showSymbol) {
      if (currencyInfo.position === 'before') {
        formatted = `${currencyInfo.symbol}${formatted}`;
      } else {
        formatted = `${formatted} ${currencyInfo.symbol}`;
      }
    }

    if (showCode) {
      formatted = `${formatted} ${currencyInfo.code}`;
    }

    return formatted;
  }

  /**
   * Get sample formatted amounts for testing
   */
  static getSampleFormats(countryKey: string): Record<string, string> {
    const amounts = [0, 100, 1000, 10000, 100000, 1000000];
    const result: Record<string, string> = {};
    
    amounts.forEach(amount => {
      result[amount.toString()] = this.formatCurrency(amount, countryKey);
    });
    
    return result;
  }

  /**
   * Validate if a country has proper currency formatting support
   */
  static validateCurrencySupport(countryKey: string): {
    supported: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const currencyInfo = getCurrencyInfo(countryKey);
    
    try {
      // Test basic formatting
      const testAmount = 12345.67;
      const formatted = this.formatCurrency(testAmount, countryKey);
      
      if (!formatted.includes(currencyInfo.symbol) && !formatted.includes(currencyInfo.code)) {
        issues.push('Currency symbol/code not found in formatted output');
      }
      
      // Test parsing
      const parsed = this.parseCurrency(formatted, countryKey);
      if (Math.abs(parsed - testAmount) > 0.01) {
        issues.push(`Parsing accuracy issue: ${testAmount} -> ${formatted} -> ${parsed}`);
      }
      
    } catch (error) {
      issues.push(`Formatting error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      supported: issues.length === 0,
      issues
    };
  }
}
