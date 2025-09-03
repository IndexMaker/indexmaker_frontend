// lib/tax/types/enhanced.ts
// Enhanced type definitions for country-specific tax calculations

import type { Brackets } from '../types';

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
