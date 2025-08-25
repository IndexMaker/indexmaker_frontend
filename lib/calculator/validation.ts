// Calculator input validation with strict TypeScript compliance

import type { DefiConfig, InvestmentInput } from "./types";

/**
 * Validation error type with branded string
 */
export type ValidationError = string & { readonly __brand: "ValidationError" };

/**
 * Validation result type using discriminated union
 */
export type ValidationResult<T> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: ReadonlyArray<ValidationError> };

/**
 * Type guard to check if value is a positive number
 */
function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && value > 0 && !Number.isNaN(value) && Number.isFinite(value);
}

/**
 * Type guard to check if value is a non-negative number
 */
function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && !Number.isNaN(value) && Number.isFinite(value);
}

/**
 * Type guard to check if value is a valid age
 */
function isValidAge(value: unknown): value is number {
  return typeof value === "number" && value >= 18 && value <= 100 && Number.isInteger(value);
}

/**
 * Type guard to check if value is a valid holding period
 */
function isValidHoldingPeriod(value: unknown): value is number {
  return typeof value === "number" && value > 0 && value <= 50 && !Number.isNaN(value);
}

/**
 * Type guard to check if value is a valid filing status
 */
function isValidFilingStatus(value: unknown): value is InvestmentInput["filingStatus"] {
  return typeof value === "string" && 
    ["single", "married-joint", "married-separate", "head-of-household"].includes(value);
}

/**
 * Type guard to check if value is a valid investment type
 */
function isValidInvestmentType(value: unknown): value is InvestmentInput["investmentType"] {
  return typeof value === "string" && ["etf", "crypto"].includes(value);
}

/**
 * Create a validation error with proper branding
 */
function createValidationError(message: string): ValidationError {
  return message as ValidationError;
}

/**
 * Validate investment input with comprehensive checks
 */
export function validateInvestmentInput(input: unknown): ValidationResult<InvestmentInput> {
  const errors: Array<ValidationError> = [];

  // Type check for input object
  if (typeof input !== "object" || input === null) {
    return {
      success: false,
      errors: [createValidationError("Input must be a valid object")]
    };
  }

  const obj = input as Record<string, unknown>;

  // Validate amount
  if (!isPositiveNumber(obj.amount)) {
    errors.push(createValidationError("Investment amount must be a positive number"));
  } else if (obj.amount > 10_000_000) {
    errors.push(createValidationError("Investment amount cannot exceed $10,000,000"));
  }

  // Validate holding period
  if (!isValidHoldingPeriod(obj.holdingPeriod)) {
    errors.push(createValidationError("Holding period must be between 0 and 50 years"));
  }

  // Validate current age
  if (!isValidAge(obj.currentAge)) {
    errors.push(createValidationError("Current age must be between 18 and 100"));
  }

  // Validate filing status
  if (!isValidFilingStatus(obj.filingStatus)) {
    errors.push(createValidationError("Filing status must be one of: single, married-joint, married-separate, head-of-household"));
  }

  // Validate additional income
  if (!isNonNegativeNumber(obj.additionalIncome)) {
    errors.push(createValidationError("Additional income must be a non-negative number"));
  } else if (obj.additionalIncome > 100_000_000) {
    errors.push(createValidationError("Additional income seems unreasonably high"));
  }

  // Validate investment type
  if (!isValidInvestmentType(obj.investmentType)) {
    errors.push(createValidationError("Investment type must be either 'etf' or 'crypto'"));
  }

  // Validate enableDefi flag
  if (typeof obj.enableDefi !== "boolean") {
    errors.push(createValidationError("EnableDefi must be a boolean value"));
  }

  // Return validation result
  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: obj as unknown as InvestmentInput
  };
}

/**
 * Validate DeFi configuration
 */
export function validateDefiConfig(config: unknown): ValidationResult<DefiConfig> {
  const errors: Array<ValidationError> = [];

  if (typeof config !== "object" || config === null) {
    return {
      success: false,
      errors: [createValidationError("DeFi config must be a valid object")]
    };
  }

  const obj = config as Record<string, unknown>;

  // Validate protocol
  if (typeof obj.protocol !== "string" || obj.protocol.length === 0) {
    errors.push(createValidationError("Protocol must be a non-empty string"));
  }

  // Validate yield rate
  if (!isPositiveNumber(obj.yieldRate) || obj.yieldRate > 100) {
    errors.push(createValidationError("Yield rate must be a positive number not exceeding 100%"));
  }

  // Validate staking period
  if (!isPositiveNumber(obj.stakingPeriod) || obj.stakingPeriod > 120) {
    errors.push(createValidationError("Staking period must be between 1 and 120 months"));
  }

  // Validate compound frequency
  const validFrequencies = ["daily", "weekly", "monthly", "quarterly"] as const;
  if (!validFrequencies.includes(obj.compoundFrequency as never)) {
    errors.push(createValidationError("Compound frequency must be one of: daily, weekly, monthly, quarterly"));
  }

  // Validate risk level
  const validRiskLevels = ["low", "medium", "high"] as const;
  if (!validRiskLevels.includes(obj.riskLevel as never)) {
    errors.push(createValidationError("Risk level must be one of: low, medium, high"));
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: obj as unknown as DefiConfig
  };
}

/**
 * Assert that a value is never reached (for exhaustive checking)
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

/**
 * Assert that a condition is true, throwing an error if not
 */
export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Type guard to check if an error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return typeof error === "string" && error.includes("__brand");
}
