// lib/types/errors.ts
// Comprehensive error type definitions for the tax calculator

import type { CountryCode } from './currency';

/**
 * Base error interface with common properties
 */
interface BaseError {
  readonly type: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
}

/**
 * Validation errors for input validation failures
 */
export type ValidationError = BaseError & {
  readonly type: 'ValidationError';
  readonly field: string;
  readonly value: unknown;
  readonly constraint: string;
  readonly expectedType?: string;
};

/**
 * Tax calculation specific errors
 */
export type TaxCalculationError =
  | InvalidInputError
  | UnsupportedCountryError
  | CalculationOverflowError
  | BracketConfigurationError
  | CurrencyConversionError
  | SetupConfigurationError;

export type InvalidInputError = BaseError & {
  readonly type: 'InvalidInput';
  readonly field: string;
  readonly value: unknown;
  readonly reason: string;
  readonly validRange?: { min: number; max: number };
};

export type UnsupportedCountryError = BaseError & {
  readonly type: 'UnsupportedCountry';
  readonly country: string;
  readonly supportedCountries: readonly CountryCode[];
};

export type CalculationOverflowError = BaseError & {
  readonly type: 'CalculationOverflow';
  readonly operation: string;
  readonly operands: readonly number[];
  readonly result: number;
  readonly maxSafeValue: number;
};

export type BracketConfigurationError = BaseError & {
  readonly type: 'BracketConfiguration';
  readonly country: CountryCode;
  readonly status: string;
  readonly issue: 'MissingBrackets' | 'InvalidRates' | 'InvalidThresholds' | 'InconsistentData';
  readonly details: string;
};

export type CurrencyConversionError = BaseError & {
  readonly type: 'CurrencyConversion';
  readonly fromCurrency: string;
  readonly toCurrency: string;
  readonly amount: number;
  readonly reason: 'UnsupportedCurrency' | 'ExchangeRateUnavailable' | 'ConversionOverflow';
};

export type SetupConfigurationError = BaseError & {
  readonly type: 'SetupConfiguration';
  readonly setupName: string;
  readonly setupType: string;
  readonly issue: 'InvalidPenaltyRate' | 'InvalidThresholdAge' | 'MissingConfiguration';
  readonly details: string;
};

/**
 * Network and external service errors
 */
export type NetworkError = BaseError & {
  readonly type: 'NetworkError';
  readonly url?: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly timeout?: boolean;
};

/**
 * Application state errors
 */
export type ApplicationError =
  | StateInitializationError
  | ComponentRenderError
  | DataSynchronizationError;

export type StateInitializationError = BaseError & {
  readonly type: 'StateInitialization';
  readonly component: string;
  readonly reason: string;
  readonly recoverable: boolean;
};

export type ComponentRenderError = BaseError & {
  readonly type: 'ComponentRender';
  readonly component: string;
  readonly props?: Record<string, unknown>;
  readonly stack?: string;
};

export type DataSynchronizationError = BaseError & {
  readonly type: 'DataSynchronization';
  readonly source: string;
  readonly target: string;
  readonly conflictingFields: readonly string[];
};

/**
 * Union of all possible errors
 */
export type AppError = ValidationError | TaxCalculationError | NetworkError | ApplicationError;

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Enhanced error with severity and recovery information
 */
export interface EnhancedError extends BaseError {
  readonly severity: ErrorSeverity;
  readonly recoverable: boolean;
  readonly userMessage: string;
  readonly technicalDetails: string;
  readonly suggestedActions: readonly string[];
  readonly errorCode: string;
}

/**
 * Error factory functions
 */

export function createValidationError(
  field: string,
  value: unknown,
  constraint: string,
  expectedType?: string,
  context?: Record<string, unknown>
): ValidationError {
  const baseError = {
    type: 'ValidationError' as const,
    message: `Validation failed for field '${field}': ${constraint}`,
    field,
    value,
    constraint,
    timestamp: new Date(),
  };

  const error: ValidationError = {
    ...baseError,
    ...(expectedType !== undefined ? { expectedType } : {}),
    ...(context !== undefined ? { context } : {}),
  };
  return error;
}

export function createInvalidInputError(
  field: string,
  value: unknown,
  reason: string,
  validRange?: { min: number; max: number },
  context?: Record<string, unknown>
): InvalidInputError {
  return {
    type: 'InvalidInput',
    message: `Invalid input for field '${field}': ${reason}`,
    field,
    value,
    reason,
    timestamp: new Date(),
    ...(validRange !== undefined && { validRange }),
    ...(context !== undefined && { context }),
  } as InvalidInputError;
}

export function createUnsupportedCountryError(
  country: string,
  supportedCountries: readonly CountryCode[],
  context?: Record<string, unknown>
): UnsupportedCountryError {
  return {
    type: 'UnsupportedCountry',
    message: `Unsupported country: ${country}. Supported countries: ${supportedCountries.join(', ')}`,
    country,
    supportedCountries,
    timestamp: new Date(),
    ...(context !== undefined && { context }),
  } as UnsupportedCountryError;
}

export function createCalculationOverflowError(
  operation: string,
  operands: readonly number[],
  result: number,
  maxSafeValue: number = Number.MAX_SAFE_INTEGER,
  context?: Record<string, unknown>
): CalculationOverflowError {
  return {
    type: 'CalculationOverflow',
    message: `Calculation overflow in operation '${operation}': result ${result} exceeds maximum safe value ${maxSafeValue}`,
    operation,
    operands,
    result,
    maxSafeValue,
    timestamp: new Date(),
    ...(context !== undefined && { context }),
  } as CalculationOverflowError;
}

export function createBracketConfigurationError(
  country: CountryCode,
  status: string,
  issue: BracketConfigurationError['issue'],
  details: string,
  context?: Record<string, unknown>
): BracketConfigurationError {
  const baseError = {
    type: 'BracketConfiguration' as const,
    message: `Tax bracket configuration error for ${country} (${status}): ${issue} - ${details}`,
    country,
    status,
    issue,
    details,
    timestamp: new Date(),
  };

  return {
    ...baseError,
    ...(context !== undefined ? { context } : {}),
  };
}

export function createCurrencyConversionError(
  fromCurrency: string,
  toCurrency: string,
  amount: number,
  reason: CurrencyConversionError['reason'],
  context?: Record<string, unknown>
): CurrencyConversionError {
  const baseError = {
    type: 'CurrencyConversion' as const,
    message: `Currency conversion failed: ${amount} ${fromCurrency} to ${toCurrency} - ${reason}`,
    fromCurrency,
    toCurrency,
    amount,
    reason,
    timestamp: new Date(),
  };

  return {
    ...baseError,
    ...(context !== undefined ? { context } : {}),
  };
}

export function createNetworkError(
  message: string,
  url?: string,
  status?: number,
  statusText?: string,
  timeout?: boolean,
  context?: Record<string, unknown>
): NetworkError {
  const baseError = {
    type: 'NetworkError' as const,
    message,
    timestamp: new Date(),
  };

  return {
    ...baseError,
    ...(url !== undefined ? { url } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(statusText !== undefined ? { statusText } : {}),
    ...(timeout !== undefined ? { timeout } : {}),
    ...(context !== undefined ? { context } : {}),
  };
}

/**
 * Error enhancement utilities
 */

export function enhanceError(
  error: AppError,
  severity: ErrorSeverity,
  userMessage: string,
  suggestedActions: readonly string[] = [],
  errorCode?: string
): EnhancedError {
  return {
    ...error,
    severity,
    recoverable: determineRecoverability(error),
    userMessage,
    technicalDetails: error.message,
    suggestedActions,
    errorCode: errorCode || generateErrorCode(error),
  };
}

function determineRecoverability(error: AppError): boolean {
  switch (error.type) {
    case 'ValidationError':
    case 'InvalidInput':
      return true; // User can correct input
    case 'UnsupportedCountry':
      return true; // User can select different country
    case 'NetworkError':
      return true; // User can retry
    case 'CalculationOverflow':
      return true; // User can adjust input values
    case 'BracketConfiguration':
    case 'SetupConfiguration':
      return false; // System configuration issue
    case 'ComponentRender':
      return false; // Technical issue
    default:
      return false;
  }
}

function generateErrorCode(error: AppError): string {
  const timestamp = Date.now().toString(36);
  const typeCode = error.type.replace(/([A-Z])/g, '_$1').toUpperCase();
  return `${typeCode}_${timestamp}`;
}

/**
 * Error logging utilities
 */

export interface ErrorLogEntry {
  readonly error: EnhancedError;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly userAgent?: string;
  readonly url?: string;
  readonly additionalContext?: Record<string, unknown>;
}

export function createErrorLogEntry(
  error: EnhancedError,
  additionalContext?: Partial<ErrorLogEntry>
): ErrorLogEntry {
  const baseEntry = {
    error,
  };

  return {
    ...baseEntry,
    ...(additionalContext?.userId !== undefined ? { userId: additionalContext.userId } : {}),
    ...(additionalContext?.sessionId !== undefined
      ? { sessionId: additionalContext.sessionId }
      : {}),
    ...(typeof window !== 'undefined' && window.navigator.userAgent
      ? { userAgent: window.navigator.userAgent }
      : {}),
    ...(typeof window !== 'undefined' && window.location.href ? { url: window.location.href } : {}),
    ...(additionalContext?.additionalContext !== undefined
      ? { additionalContext: additionalContext.additionalContext }
      : {}),
  };
}

/**
 * Error type guards
 */

export function isValidationError(error: AppError): error is ValidationError {
  return error.type === 'ValidationError';
}

export function isTaxCalculationError(error: AppError): error is TaxCalculationError {
  return [
    'InvalidInput',
    'UnsupportedCountry',
    'CalculationOverflow',
    'BracketConfiguration',
    'CurrencyConversion',
    'SetupConfiguration',
  ].includes(error.type);
}

export function isNetworkError(error: AppError): error is NetworkError {
  return error.type === 'NetworkError';
}

export function isRecoverableError(error: AppError): boolean {
  return determineRecoverability(error);
}
