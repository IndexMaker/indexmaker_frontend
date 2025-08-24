#!/usr/bin/env node

// scripts/start-phase1.js
// Quick-start script to begin Phase 1 implementation

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Phase 1: Tax Bracket Implementation Foundation\n');

// Create necessary directories
const dirs = [
  'lib/tax/utils',
  'lib/tax/parsers',
  'lib/tax/validators',
  'lib/tax/types',
  'tests/tax',
  'docs/tax-data'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`⏭️  Directory exists: ${dir}`);
  }
});

// Create enhanced types file
const enhancedTypesContent = `// lib/tax/types/enhanced.ts
// Enhanced type definitions for country-specific tax calculations

export interface BracketStructure {
  uppers: readonly number[];
  rates: readonly number[];
}

export interface CapitalGainsBrackets {
  shortTerm: BracketStructure;
  longTerm: BracketStructure;
  holdingPeriodMonths: number;
}

export interface TaxExemptions {
  annualThreshold: number;
  currency: string;
  conditions?: string[];
}

export interface EnhancedBrackets extends Brackets {
  // Capital gains specific brackets
  capitalGains?: CapitalGainsBrackets;
  
  // Country-specific exemptions
  exemptions?: TaxExemptions;
  
  // Social charges (France, Germany, etc.)
  socialCharges?: BracketStructure;
  
  // Different brackets for filing statuses
  filingStatuses: Record<string, {
    ordinary: BracketStructure;
    stdDed: number;
    niitThresh?: number;
  }>;
  
  // Special tax rules
  specialRules?: {
    flatTaxRate?: number;
    wealthTax?: boolean;
    miningTaxRate?: number;
    stakingTaxRate?: number;
  };
}

export interface CapitalGainsParams {
  country: string;
  status: string;
  agiExcl: number;
  gainAmount: number;
  holdingPeriodMonths: number;
  assetType: 'crypto' | 'stocks' | 'other';
}

export interface TaxResult {
  tax: number;
  niit?: number;
  socialCharges?: number;
  effectiveRate: number;
  breakdown?: {
    ordinary?: number;
    capitalGains?: number;
    exemptionUsed?: number;
  };
}

// Re-export existing types
export type { Brackets, CalcOut, CountryModule, Setup, TaxableParams, TaxParams } from '../types';
`;

const enhancedTypesPath = path.join(__dirname, '..', 'lib/tax/types/enhanced.ts');
fs.writeFileSync(enhancedTypesPath, enhancedTypesContent);
console.log('✅ Created enhanced types definition');

// Create tax bracket parser template
const parserContent = `// lib/tax/parsers/bracket-parser.ts
// Parser for extracting tax bracket information from crypto_tax strings

import type { BracketStructure, TaxExemptions, CapitalGainsBrackets } from '../types/enhanced';

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
    
    // Detect tax type
    if (text.includes('banned') || text.includes('exempt')) {
      return {
        type: 'exempt',
        currency,
        specialRules: ['Tax-free or banned jurisdiction']
      };
    }
    
    if (text.includes('flat')) {
      const flatRate = this.extractFlatRate(cryptoTaxText);
      return {
        type: 'flat',
        flatRate,
        currency,
        exemptions: this.extractExemptions(cryptoTaxText, currency)
      };
    }
    
    // Progressive tax parsing
    const brackets = this.extractProgressiveBrackets(cryptoTaxText, currency);
    const exemptions = this.extractExemptions(cryptoTaxText, currency);
    const holdingPeriod = this.extractHoldingPeriod(cryptoTaxText);
    
    return {
      type: brackets ? 'progressive' : 'complex',
      brackets,
      exemptions,
      holdingPeriodMonths: holdingPeriod,
      currency,
      specialRules: this.extractSpecialRules(cryptoTaxText)
    };
  }
  
  private static extractFlatRate(text: string): number | undefined {
    // Match patterns like "Flat 19%" or "19% on gains"
    const flatMatch = text.match(/(?:flat\\s+)?(\\d+(?:\\.\\d+)?)%/i);
    return flatMatch ? parseFloat(flatMatch[1]) / 100 : undefined;
  }
  
  private static extractProgressiveBrackets(text: string, currency: string): BracketStructure | undefined {
    // TODO: Implement progressive bracket parsing
    // Match patterns like "10% ($0-$11,925), 12% ($11,926-$48,535)"
    return undefined;
  }
  
  private static extractExemptions(text: string, currency: string): TaxExemptions | undefined {
    // Match patterns like "gains under €600" or "below $1,000"
    const exemptionMatch = text.match(/(?:under|below)\\s*[€$£¥]?([\\d,]+)/i);
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
    const yearMatch = text.match(/(\\d+)\\s*years?/i);
    if (yearMatch) {
      return parseInt(yearMatch[1]) * 12;
    }
    
    const monthMatch = text.match(/(\\d+)\\s*months?/i);
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
`;

const parserPath = path.join(__dirname, '..', 'lib/tax/parsers/bracket-parser.ts');
fs.writeFileSync(parserPath, parserContent);
console.log('✅ Created tax bracket parser template');

// Create validator template
const validatorContent = `// lib/tax/validators/bracket-validator.ts
// Validation functions for tax bracket data

import type { BracketStructure, EnhancedBrackets } from '../types/enhanced';

export class BracketValidator {
  /**
   * Validate bracket structure
   */
  static validateBracketStructure(brackets: BracketStructure): string[] {
    const errors: string[] = [];
    
    if (!brackets.uppers || !brackets.rates) {
      errors.push('Missing uppers or rates arrays');
      return errors;
    }
    
    if (brackets.uppers.length !== brackets.rates.length) {
      errors.push('Uppers and rates arrays must have same length');
    }
    
    // Check rates are between 0 and 1
    brackets.rates.forEach((rate, i) => {
      if (rate < 0 || rate > 1) {
        errors.push(\`Rate at index \${i} is out of range: \${rate}\`);
      }
    });
    
    // Check uppers are in ascending order
    for (let i = 1; i < brackets.uppers.length; i++) {
      if (brackets.uppers[i] <= brackets.uppers[i-1] && brackets.uppers[i] !== Infinity) {
        errors.push(\`Upper bounds not in ascending order at index \${i}\`);
      }
    }
    
    return errors;
  }
  
  /**
   * Validate enhanced brackets
   */
  static validateEnhancedBrackets(brackets: EnhancedBrackets): string[] {
    const errors: string[] = [];
    
    // Validate each filing status
    Object.entries(brackets.filingStatuses).forEach(([status, statusBrackets]) => {
      const statusErrors = this.validateBracketStructure(statusBrackets.ordinary);
      statusErrors.forEach(error => {
        errors.push(\`\${status}: \${error}\`);
      });
    });
    
    // Validate capital gains brackets if present
    if (brackets.capitalGains) {
      const cgErrors = [
        ...this.validateBracketStructure(brackets.capitalGains.shortTerm),
        ...this.validateBracketStructure(brackets.capitalGains.longTerm)
      ];
      cgErrors.forEach(error => {
        errors.push(\`Capital gains: \${error}\`);
      });
    }
    
    return errors;
  }
}
`;

const validatorPath = path.join(__dirname, '..', 'lib/tax/validators/bracket-validator.ts');
fs.writeFileSync(validatorPath, validatorContent);
console.log('✅ Created bracket validator template');

console.log('\n🎉 Phase 1 foundation setup complete!');
console.log('\n📝 Next steps:');
console.log('1. Implement the progressive bracket parsing logic in bracket-parser.ts');
console.log('2. Create unit tests for the parser and validator');
console.log('3. Update USA module to use enhanced brackets');
console.log('4. Test with known USA tax scenarios');
console.log('\n📚 See docs/53-country-implementation-plan.md for detailed implementation guide');
