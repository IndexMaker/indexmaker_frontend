// lib/tax/types.ts
// Simplified types without over-engineered patterns

import type { CountryCode } from '../types/currency';

export type Setup = {
  readonly name: string;
  readonly type: 'taxable' | 'deferred' | 'taxfree' | 'super';
  readonly fees: string;
  readonly penaltyRate: number;
  readonly thresholdAge: number;
};

// Basic tax bracket definition
export type TaxBracket = {
  readonly min: number;
  readonly max: number;
  readonly rate: number;
};

// Tax calculation error type
export type TaxCalculationError = {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
};

export type Brackets = {
  readonly ordinary: { readonly uppers: readonly number[]; readonly rates: readonly number[] };
  readonly lt: { readonly uppers: readonly number[]; readonly rates: readonly number[] } | null;
  readonly stdDed: number;
  readonly niitThresh: number;
  readonly capGainInclusion?: number;
  readonly capGainDiscount?: number;
  readonly capGainRate?: number;
  readonly solidarity?: number;
  readonly annualExempt?: number;
  readonly cryptoHoldFree?: number;
  readonly cryptoSmallExempt?: number;
  readonly higherThresh?: number;
  readonly capGainRateBasic?: number;
  readonly capGainRateHigher?: number;
  readonly medicareLevyRate?: number;
  readonly capitalGainsFlatRate?: number;
};

export type TaxableParams = {
  readonly country: string;
  readonly status: string;
  readonly agiExcl: number;
  readonly taxableAmount: number;
  isLong: boolean;
  readonly brackets: Brackets;
  readonly isCrypto: boolean;
  readonly years: number;
  readonly additionalPenalty?: number;
  readonly gain?: number;
};

export type TaxParams = {
  readonly status: string;
  readonly agiExcl: number;
  readonly initial: number;
  readonly gain: number;
  readonly years: number;
  readonly isLong: boolean;
  readonly currentAge: number;
  readonly isCrypto: boolean;
  readonly additionalPenalty: number;
  readonly brackets: Brackets;
};

export type CalcOut = {
  readonly tax: number;
  readonly niit: number;
  readonly penalty: number;
  readonly taxPct: number;
};

export type CountryModule = {
  readonly key: CountryCode;
  readonly name: string;
  readonly currency: string;
  readonly statuses: readonly string[];
  readonly cryptoNote: string;
  readonly setups: readonly Setup[];
  readonly getBrackets: (status: string) => Brackets;
  readonly computeTaxable: (p: TaxableParams) => { readonly tax: number; readonly niit: number };
  // For deferred wrappers: compute full taxation on a withdrawal amount using country ordinary rules
  readonly computeDeferredFull: (p: TaxableParams) => {
    readonly tax: number;
    readonly niit: number;
  };
  readonly computeSetupTax?: (setup: Setup, p: TaxParams) => CalcOut;
};

/**
 * Simplified Tax Types
 */

// Enhanced setup type using discriminated unions
export type EnhancedSetup =
  | {
      readonly type: 'taxable';
      readonly penaltyRate: 0;
      readonly thresholdAge: number;
      readonly name: string;
      readonly fees: string;
    }
  | {
      readonly type: 'deferred';
      readonly penaltyRate: number;
      readonly thresholdAge: number;
      readonly name: string;
      readonly fees: string;
    }
  | {
      readonly type: 'taxfree';
      readonly penaltyRate: number;
      readonly thresholdAge: number;
      readonly name: string;
      readonly fees: string;
    }
  | {
      readonly type: 'super';
      readonly penaltyRate: number;
      readonly thresholdAge: number;
      readonly name: string;
      readonly fees: string;
    };

// Simple type aliases for common patterns
export type SetupType = 'taxable' | 'deferred' | 'taxfree' | 'super';
export type FilingStatus = 'single' | 'married' | 'head_of_household';

// Country module registry type
export type CountryModuleRegistry = Record<CountryCode, CountryModule>;

// Enhanced calculation result with metadata
export type EnhancedCalcOut = CalcOut & {
  readonly calculationId: string;
  readonly timestamp: Date;
  readonly country: CountryCode;
  readonly setupType: SetupType;
  readonly metadata?: {
    readonly version: string;
    readonly calculationTime: number;
    readonly warnings: readonly string[];
  };
};

// Simple validation result
export type ValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
};

// Tax optimization suggestion
export type TaxOptimization = {
  readonly type: 'setup_change' | 'timing_optimization' | 'amount_adjustment';
  readonly description: string;
  readonly potentialSavings: number;
  readonly confidence: 'low' | 'medium' | 'high';
};
