// Calculator error handling with strict TypeScript compliance

/**
 * Base error class for calculator-specific errors
 */
export abstract class CalculatorError extends Error {
  public abstract readonly code: string;
  public abstract readonly category: "validation" | "calculation" | "configuration" | "network";
  public readonly timestamp: Date;

  protected constructor(message: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    
    // if (cause) {
    //   this.cause = cause;
    // }

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends CalculatorError {
  public readonly code = "VALIDATION_ERROR" as const;
  public readonly category = "validation" as const;
  public readonly field?: string;

  constructor(message: string, field?: string, cause?: Error) {
    super(message, cause);
    this.field = field;
  }
}

/**
 * Calculation error for tax computation failures
 */
export class CalculationError extends CalculatorError {
  public readonly code = "CALCULATION_ERROR" as const;
  public readonly category = "calculation" as const;
  public readonly country?: string;

  constructor(message: string, country?: string, cause?: Error) {
    super(message, cause);
    this.country = country;
  }
}

/**
 * Configuration error for missing or invalid country configurations
 */
export class ConfigurationError extends CalculatorError {
  public readonly code = "CONFIGURATION_ERROR" as const;
  public readonly category = "configuration" as const;
  public readonly configKey?: string;

  constructor(message: string, configKey?: string, cause?: Error) {
    super(message, cause);
    this.configKey = configKey;
  }
}

/**
 * Network error for API or external service failures
 */
export class NetworkError extends CalculatorError {
  public readonly code = "NETWORK_ERROR" as const;
  public readonly category = "network" as const;
  public readonly statusCode?: number;

  constructor(message: string, statusCode?: number, cause?: Error) {
    super(message, cause);
    this.statusCode = statusCode;
  }
}

/**
 * Union type for all calculator errors
 */
export type AnyCalculatorError = ValidationError | CalculationError | ConfigurationError | NetworkError;

/**
 * Error result type for operations that can fail
 */
export type ErrorResult<T> = 
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: AnyCalculatorError };

/**
 * Type guard to check if a value is a calculator error
 */
export function isCalculatorError(error: unknown): error is AnyCalculatorError {
  return error instanceof CalculatorError;
}

/**
 * Type guard to check if an error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a calculation error
 */
export function isCalculationError(error: unknown): error is CalculationError {
  return error instanceof CalculationError;
}

/**
 * Type guard to check if an error is a configuration error
 */
export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

/**
 * Type guard to check if an error is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Create an error result
 */
export function createErrorResult<T>(error: AnyCalculatorError): ErrorResult<T> {
  return { success: false, error };
}

/**
 * Create a success result
 */
export function createSuccessResult<T>(data: T): ErrorResult<T> {
  return { success: true, data };
}

/**
 * Wrap a function to catch and convert errors to ErrorResult
 */
export function wrapWithErrorHandling<TArgs extends ReadonlyArray<unknown>, TReturn>(
  fn: (...args: TArgs) => TReturn
): (...args: TArgs) => ErrorResult<TReturn> {
  return (...args: TArgs): ErrorResult<TReturn> => {
    try {
      const result = fn(...args);
      return createSuccessResult(result);
    } catch (error) {
      if (isCalculatorError(error)) {
        return createErrorResult(error);
      }
      
      // Convert unknown errors to CalculationError
      const calculationError = new CalculationError(
        error instanceof Error ? error.message : "Unknown calculation error",
        undefined,
        error instanceof Error ? error : undefined
      );
      
      return createErrorResult(calculationError);
    }
  };
}

/**
 * Wrap an async function to catch and convert errors to ErrorResult
 */
export function wrapAsyncWithErrorHandling<TArgs extends ReadonlyArray<unknown>, TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<ErrorResult<TReturn>> {
  return async (...args: TArgs): Promise<ErrorResult<TReturn>> => {
    try {
      const result = await fn(...args);
      return createSuccessResult(result);
    } catch (error) {
      if (isCalculatorError(error)) {
        return createErrorResult(error);
      }
      
      // Convert unknown errors to CalculationError
      const calculationError = new CalculationError(
        error instanceof Error ? error.message : "Unknown calculation error",
        undefined,
        error instanceof Error ? error : undefined
      );
      
      return createErrorResult(calculationError);
    }
  };
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: AnyCalculatorError): string {
  switch (error.category) {
    case "validation":
      return `Invalid input: ${error.message}`;
    case "calculation":
      return `Calculation failed: ${error.message}`;
    case "configuration":
      return `Configuration error: ${error.message}`;
    case "network":
      return `Network error: ${error.message}`;
    default:
      // This should never happen due to exhaustive checking
      const _exhaustiveCheck: never = error;
      return `Unknown error: ${String(_exhaustiveCheck)}`;
  }
}

/**
 * Log error with appropriate level based on category
 */
export function logError(error: AnyCalculatorError): void {
  const logData = {
    code: error.code,
    category: error.category,
    message: error.message,
    timestamp: error.timestamp,
    stack: error.stack,
  };

  // In a real application, you would use a proper logger here
  // For now, we'll use console methods
  switch (error.category) {
    case "validation":
      console.warn("Validation error:", logData);
      break;
    case "calculation":
      console.error("Calculation error:", logData);
      break;
    case "configuration":
      console.error("Configuration error:", logData);
      break;
    case "network":
      console.error("Network error:", logData);
      break;
    default:
      console.error("Unknown error:", logData);
  }
}
