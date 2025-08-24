// lib/tax/validators/bracket-validator.ts
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
        errors.push(`Rate at index ${i} is out of range: ${rate}`);
      }
    });
    
    // Check uppers are in ascending order
    for (let i = 1; i < brackets.uppers.length; i++) {
      if (brackets.uppers[i] <= brackets.uppers[i-1] && brackets.uppers[i] !== Infinity) {
        errors.push(`Upper bounds not in ascending order at index ${i}`);
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
        errors.push(`${status}: ${error}`);
      });
    });
    
    // Validate capital gains brackets if present
    if (brackets.capitalGains) {
      const cgErrors = [
        ...this.validateBracketStructure(brackets.capitalGains.shortTerm),
        ...this.validateBracketStructure(brackets.capitalGains.longTerm)
      ];
      cgErrors.forEach(error => {
        errors.push(`Capital gains: ${error}`);
      });
    }
    
    return errors;
  }
}
