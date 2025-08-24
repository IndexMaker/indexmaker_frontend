// lib/validation/calculator-validation.ts
// Calculator input validation utilities

import { z } from 'zod';
import type { CountryCode } from '../types/currency';
import type { Result } from '../types/result';
import { Err, Ok } from '../types/result';

/**
 * Validation schemas for calculator inputs
 */
export const calculatorInputSchema = z.object({
  country: z.enum([
    'usa',
    'canada',
    'uk',
    'australia',
    'germany',
    'france',
    'japan',
    'india',
    'italy',
    'brazil',
  ]),
  status: z.string().min(1, 'Filing status is required'),
  annualIncome: z
    .number()
    .min(0, 'Annual income must be non-negative')
    .max(1e9, 'Annual income is too large'),
  initialInvestment: z
    .number()
    .min(0, 'Initial investment must be non-negative')
    .max(1e9, 'Initial investment is too large'),
  investmentPeriod: z
    .number()
    .min(1, 'Investment period must be at least 1 year')
    .max(100, 'Investment period is too long'),
  currentAge: z.number().min(18, 'Age must be at least 18').max(100, 'Age must be reasonable'),
  isCrypto: z.boolean().optional().default(false),
  isLongTerm: z.boolean().optional().default(true),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

/**
 * Validation result type
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly data?: CalculatorInput;
}

/**
 * Validate calculator input
 */
export function validateCalculatorInput(input: unknown): ValidationResult {
  try {
    const data = calculatorInputSchema.parse(input);
    return {
      valid: true,
      errors: [],
      data,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return {
      valid: false,
      errors: ['Unknown validation error'],
    };
  }
}

/**
 * Validate individual fields
 */
export const fieldValidators = {
  country: (value: unknown): Result<CountryCode, string> => {
    if (typeof value !== 'string') {
      return Err('Country must be a string');
    }
    const validCountries: CountryCode[] = [
      'usa',
      'canada',
      'uk',
      'australia',
      'germany',
      'france',
      'japan',
      'india',
      'italy',
      'brazil',
    ];
    if (!validCountries.includes(value as CountryCode)) {
      return Err(`Invalid country: ${value}`);
    }
    return Ok(value as CountryCode);
  },

  amount: (value: unknown, fieldName = 'amount'): Result<number, string> => {
    if (typeof value !== 'number') {
      return Err(`${fieldName} must be a number`);
    }
    if (!Number.isFinite(value)) {
      return Err(`${fieldName} must be finite`);
    }
    if (value < 0) {
      return Err(`${fieldName} cannot be negative`);
    }
    if (value > 1e9) {
      return Err(`${fieldName} is too large`);
    }
    return Ok(value);
  },

  age: (value: unknown): Result<number, string> => {
    if (typeof value !== 'number') {
      return Err('Age must be a number');
    }
    if (!Number.isFinite(value)) {
      return Err('Age must be finite');
    }
    if (value < 18) {
      return Err('Age must be at least 18');
    }
    if (value > 100) {
      return Err('Age must be reasonable (≤ 100)');
    }
    return Ok(value);
  },

  years: (value: unknown): Result<number, string> => {
    if (typeof value !== 'number') {
      return Err('Years must be a number');
    }
    if (!Number.isFinite(value)) {
      return Err('Years must be finite');
    }
    if (value < 1) {
      return Err('Years must be at least 1');
    }
    if (value > 100) {
      return Err('Years cannot exceed 100');
    }
    return Ok(value);
  },
};

/**
 * Sanitize input values
 */
export function sanitizeInput(input: Partial<CalculatorInput>): Partial<CalculatorInput> {
  const sanitized: Partial<CalculatorInput> = {};

  if (input.country) {
    sanitized.country = input.country;
  }

  if (input.status) {
    sanitized.status = input.status.trim();
  }

  if (typeof input.annualIncome === 'number') {
    sanitized.annualIncome = Math.max(0, Math.min(1e9, input.annualIncome));
  }

  if (typeof input.initialInvestment === 'number') {
    sanitized.initialInvestment = Math.max(0, Math.min(1e9, input.initialInvestment));
  }

  if (typeof input.investmentPeriod === 'number') {
    sanitized.investmentPeriod = Math.max(1, Math.min(100, Math.round(input.investmentPeriod)));
  }

  if (typeof input.currentAge === 'number') {
    sanitized.currentAge = Math.max(18, Math.min(100, Math.round(input.currentAge)));
  }

  if (typeof input.isCrypto === 'boolean') {
    sanitized.isCrypto = input.isCrypto;
  }

  if (typeof input.isLongTerm === 'boolean') {
    sanitized.isLongTerm = input.isLongTerm;
  }

  return sanitized;
}

/**
 * Check if input is complete
 */
export function isCompleteInput(input: Partial<CalculatorInput>): input is CalculatorInput {
  return !!(
    input.country &&
    input.status &&
    typeof input.annualIncome === 'number' &&
    typeof input.initialInvestment === 'number' &&
    typeof input.investmentPeriod === 'number' &&
    typeof input.currentAge === 'number'
  );
}

/**
 * Get validation error messages for UI display
 */
export function getValidationErrors(input: Partial<CalculatorInput>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.country) {
    errors.country = 'Please select a country';
  }

  if (!input.status) {
    errors.status = 'Please select a filing status';
  }

  if (typeof input.annualIncome !== 'number' || input.annualIncome < 0) {
    errors.annualIncome = 'Please enter a valid annual income';
  }

  if (typeof input.initialInvestment !== 'number' || input.initialInvestment < 0) {
    errors.initialInvestment = 'Please enter a valid initial investment amount';
  }

  if (typeof input.investmentPeriod !== 'number' || input.investmentPeriod < 1) {
    errors.investmentPeriod = 'Please enter a valid investment period';
  }

  if (typeof input.currentAge !== 'number' || input.currentAge < 18) {
    errors.currentAge = 'Please enter a valid age (18 or older)';
  }

  return errors;
}
