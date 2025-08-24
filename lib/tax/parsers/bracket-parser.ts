// lib/tax/parsers/bracket-parser.ts
// Parser for extracting tax bracket information from crypto_tax strings

import type { BracketStructure, CapitalGainsBrackets, TaxExemptions } from '../types/enhanced';

export interface ParsedTaxInfo {
  type: 'progressive' | 'flat' | 'exempt' | 'complex';
  brackets?: BracketStructure;
  flatRate?: number;
  exemptions?: TaxExemptions;
  capitalGains?: CapitalGainsBrackets;
  holdingPeriodMonths?: number;
  specialRules?: string[];
  currency: string;
}

export class TaxBracketParser {
  /**
   * Parse crypto tax information from data.json crypto_tax field
   */
  static parse(cryptoTaxText: string, currency: string = 'USD'): ParsedTaxInfo {
    const text = cryptoTaxText.toLowerCase();

    // Detect truly exempt/banned jurisdictions first
    if ((text.includes('banned') && text.includes('no legal tax')) ||
        (text.includes('0%') && !text.includes('progressive') && !text.includes('bracket')) ||
        (text.includes('exempt from taxation') && !text.includes('unless'))) {
      return {
        type: 'exempt',
        currency,
        specialRules: ['Tax-free or banned jurisdiction']
      };
    }

    // Detect flat tax (must have explicit "flat" keyword or single rate without brackets)
    if (text.includes('flat') ||
        (text.match(/^[^(]*(\d+(?:\.\d+)?)%[^(]*$/) && !text.includes('progressive'))) {
      const flatRate = this.extractFlatRate(cryptoTaxText);
      return {
        type: 'flat',
        flatRate,
        currency,
        exemptions: this.extractExemptions(cryptoTaxText, currency),
        holdingPeriodMonths: this.extractHoldingPeriod(cryptoTaxText),
        specialRules: this.extractSpecialRules(cryptoTaxText)
      };
    }

    // Try to extract progressive brackets
    const brackets = this.extractProgressiveBrackets(cryptoTaxText, currency);
    const exemptions = this.extractExemptions(cryptoTaxText, currency);
    const holdingPeriod = this.extractHoldingPeriod(cryptoTaxText);
    const specialRules = this.extractSpecialRules(cryptoTaxText);

    // If we found brackets, it's progressive
    if (brackets && brackets.uppers.length > 1) {
      return {
        type: 'progressive',
        brackets,
        exemptions,
        holdingPeriodMonths: holdingPeriod,
        currency,
        specialRules
      };
    }

    // Check for single rate that might be flat tax
    const singleRateMatch = text.match(/(\d+(?:\.\d+)?)%/);
    if (singleRateMatch && !text.includes('progressive')) {
      return {
        type: 'flat',
        flatRate: parseFloat(singleRateMatch[1]) / 100,
        currency,
        exemptions,
        holdingPeriodMonths: holdingPeriod,
        specialRules
      };
    }

    // Complex cases that need manual handling
    return {
      type: 'complex',
      currency,
      exemptions,
      holdingPeriodMonths: holdingPeriod,
      specialRules: [...specialRules, 'Complex tax structure requiring manual implementation']
    };
  }
  
  private static extractFlatRate(text: string): number | undefined {
    // Match patterns like "Flat 19%" or "19% on gains"
    const flatMatch = text.match(/(?:flat\s+)?(\d+(?:\.\d+)?)%/i);
    return flatMatch ? parseFloat(flatMatch[1]) / 100 : undefined;
  }
  
  private static extractProgressiveBrackets(text: string, currency: string): BracketStructure | undefined {
    // Match patterns like "10% ($0-$11,925), 12% ($11,926-$48,535)"
    // Also handle: "14-45% €11,605-€62,810", "5% <1.95m yen", "30% >15 lakh"

    const brackets: { rate: number; upper: number }[] = [];

    // Pattern 1: Standard format "rate% (currency_symbol lower-upper)"
    const standardPattern = /(\d+(?:\.\d+)?)%\s*\([€$£¥₹]?([\d,]+(?:\.\d+)?)-[€$£¥₹]?([\d,]+(?:\.\d+)?)\)/g;
    let match;

    while ((match = standardPattern.exec(text)) !== null) {
      const rate = parseFloat(match[1]) / 100;
      const upper = this.parseAmount(match[3]);
      brackets.push({ rate, upper });
    }

    // Pattern 2: Range format "rate1-rate2% currency_symbol lower-upper"
    const rangePattern = /(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)%\s*[€$£¥₹]?([\d,]+(?:\.\d+)?)-[€$£¥₹]?([\d,]+(?:\.\d+)?)/g;
    while ((match = rangePattern.exec(text)) !== null) {
      const rate = parseFloat(match[2]) / 100; // Use higher rate
      const upper = this.parseAmount(match[4]);
      brackets.push({ rate, upper });
    }

    // Pattern 3: Comparison format "rate% <amount" or "rate% >amount"
    const comparisonPattern = /(\d+(?:\.\d+)?)%\s*([<>])\s*[€$£¥₹]?([\d,]+(?:\.\d+)?(?:[km])?)\s*(?:yen|lakh|crore)?/g;
    while ((match = comparisonPattern.exec(text)) !== null) {
      const rate = parseFloat(match[1]) / 100;
      const operator = match[2];
      const amount = this.parseAmount(match[3]);

      if (operator === '<') {
        brackets.push({ rate, upper: amount });
      } else if (operator === '>') {
        brackets.push({ rate, upper: Number.POSITIVE_INFINITY });
      }
    }

    // Pattern 4: "over amount" format
    const overPattern = /(\d+(?:\.\d+)?)%\s*\(over\s*[€$£¥₹]?([\d,]+(?:\.\d+)?)\)/g;
    while ((match = overPattern.exec(text)) !== null) {
      const rate = parseFloat(match[1]) / 100;
      brackets.push({ rate, upper: Number.POSITIVE_INFINITY });
    }

    // Pattern 5: Simple progressive format "rate% amount-amount"
    const simpleProgressivePattern = /(\d+(?:\.\d+)?)%\s*[€$£¥₹]?([\d,]+(?:\.\d+)?(?:[km])?)-[€$£¥₹]?([\d,]+(?:\.\d+)?(?:[km])?)/g;
    while ((match = simpleProgressivePattern.exec(text)) !== null) {
      const rate = parseFloat(match[1]) / 100;
      const upper = this.parseAmount(match[3]);
      brackets.push({ rate, upper });
    }

    // Pattern 6: "up to rate%" format
    const upToPattern = /up\s+to\s+(\d+(?:\.\d+)?)%/g;
    while ((match = upToPattern.exec(text)) !== null) {
      const rate = parseFloat(match[1]) / 100;
      brackets.push({ rate, upper: Number.POSITIVE_INFINITY });
    }

    // Pattern 7: Marginal rates format "0-45%" or "5-35%"
    const marginalPattern = /(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)%/g;
    while ((match = marginalPattern.exec(text)) !== null) {
      const minRate = parseFloat(match[1]) / 100;
      const maxRate = parseFloat(match[2]) / 100;

      // Add both rates (simplified - would need more context for proper brackets)
      if (minRate === 0) {
        brackets.push({ rate: minRate, upper: 50000 }); // Assume first bracket
      }
      brackets.push({ rate: maxRate, upper: Number.POSITIVE_INFINITY });
    }

    if (brackets.length === 0) {
      return undefined;
    }

    // Remove duplicates and sort by upper bound
    const uniqueBrackets = brackets.filter((bracket, index, self) =>
      index === self.findIndex(b => b.rate === bracket.rate && b.upper === bracket.upper)
    );

    uniqueBrackets.sort((a, b) => a.upper - b.upper);

    const uppers = uniqueBrackets.map(b => b.upper);
    const rates = uniqueBrackets.map(b => b.rate);

    return { uppers, rates };
  }

  private static parseAmount(amountStr: string): number {
    // Remove commas and handle suffixes
    let cleanAmount = amountStr.replace(/,/g, '');

    // Handle Japanese yen millions (m)
    if (cleanAmount.includes('m')) {
      return parseFloat(cleanAmount.replace('m', '')) * 1000000;
    }

    // Handle Indian lakh/crore
    if (cleanAmount.includes('k')) {
      return parseFloat(cleanAmount.replace('k', '')) * 1000;
    }

    return parseFloat(cleanAmount);
  }
  
  private static extractExemptions(text: string, currency: string): TaxExemptions | undefined {
    // Match patterns like "gains under €600" or "below $1,000"
    const exemptionMatch = text.match(/(?:under|below)\s*[€$£¥]?([\d,]+)/i);
    if (exemptionMatch) {
      return {
        annualThreshold: parseFloat(exemptionMatch[1].replace(/,/g, '')),
        currency
      };
    }
    return undefined;
  }
  
  private static extractHoldingPeriod(text: string): number | undefined {
    // Match patterns like "held more than 1 year" or "3 years"
    const yearMatch = text.match(/(\d+)\s*years?/i);
    if (yearMatch) {
      return parseInt(yearMatch[1]) * 12;
    }
    
    const monthMatch = text.match(/(\d+)\s*months?/i);
    if (monthMatch) {
      return parseInt(monthMatch[1]);
    }
    
    return undefined;
  }
  
  private static extractSpecialRules(text: string): string[] {
    const rules: string[] = [];
    
    if (text.includes('mining')) {
      rules.push('Special mining tax rules apply');
    }
    
    if (text.includes('staking')) {
      rules.push('Special staking tax rules apply');
    }
    
    if (text.includes('wealth tax')) {
      rules.push('Wealth tax applies');
    }
    
    return rules;
  }
}
