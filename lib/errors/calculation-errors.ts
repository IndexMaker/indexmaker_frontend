// Calculation error handling and recovery

export enum CalculationErrorType {
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_COUNTRY_DATA = 'MISSING_COUNTRY_DATA',
  INVALID_TAX_BRACKETS = 'INVALID_TAX_BRACKETS',
  CALCULATION_OVERFLOW = 'CALCULATION_OVERFLOW',
  INVALID_SETUP = 'INVALID_SETUP',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class CalculationError extends Error {
  public readonly type: CalculationErrorType;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly context?: Record<string, unknown>;
  public readonly recoverable: boolean;

  constructor(
    type: CalculationErrorType,
    message: string,
    userMessage: string,
    context?: Record<string, unknown>,
    recoverable = true
  ) {
    super(message);
    this.name = 'CalculationError';
    this.type = type;
    this.code = `CALC_${type}`;
    this.userMessage = userMessage;
    this.context = context || {};
    this.recoverable = recoverable;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CalculationError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      context: this.context,
      recoverable: this.recoverable,
      stack: this.stack,
    };
  }
}

// Specific error creators
export const calculationErrors = {
  invalidInput: (field: string, value: unknown, reason?: string) =>
    new CalculationError(
      CalculationErrorType.INVALID_INPUT,
      `Invalid input for field '${field}': ${value}${reason ? ` (${reason})` : ''}`,
      `Please check your input for ${field}. ${reason || 'The value appears to be invalid.'}`,
      { field, value, reason }
    ),

  missingCountryData: (country: string) =>
    new CalculationError(
      CalculationErrorType.MISSING_COUNTRY_DATA,
      `Tax data not available for country: ${country}`,
      `Tax calculations are not yet available for ${country}. Please select a different country.`,
      { country },
      false
    ),

  invalidTaxBrackets: (country: string, status: string) =>
    new CalculationError(
      CalculationErrorType.INVALID_TAX_BRACKETS,
      `Invalid tax brackets for ${country} with status ${status}`,
      `There seems to be an issue with the tax data for ${country}. Please try a different filing status or country.`,
      { country, status }
    ),

  calculationOverflow: (operation: string, values: Record<string, number>) =>
    new CalculationError(
      CalculationErrorType.CALCULATION_OVERFLOW,
      `Calculation overflow in operation: ${operation}`,
      'The calculation resulted in values that are too large to process. Please try with smaller input values.',
      { operation, values }
    ),

  invalidSetup: (setupName: string, country: string) =>
    new CalculationError(
      CalculationErrorType.INVALID_SETUP,
      `Invalid setup '${setupName}' for country ${country}`,
      `The selected account type (${setupName}) is not available for ${country}. Please choose a different account type.`,
      { setupName, country }
    ),

  networkError: (operation: string, originalError?: Error) =>
    new CalculationError(
      CalculationErrorType.NETWORK_ERROR,
      `Network error during ${operation}: ${originalError?.message || 'Unknown network error'}`,
      'There was a problem connecting to our servers. Please check your internet connection and try again.',
      { operation, originalError: originalError?.message }
    ),

  unknown: (originalError: Error, context?: Record<string, unknown>) =>
    new CalculationError(
      CalculationErrorType.UNKNOWN_ERROR,
      `Unknown error: ${originalError.message}`,
      'An unexpected error occurred. Please try again, and if the problem persists, contact support.',
      { originalError: originalError.message, ...context },
      false
    ),
};

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover: (error: CalculationError) => boolean;
  recover: (error: CalculationError, context?: Record<string, unknown>) => unknown;
  fallbackMessage: string;
}

export const errorRecoveryStrategies: Record<CalculationErrorType, ErrorRecoveryStrategy> = {
  [CalculationErrorType.INVALID_INPUT]: {
    canRecover: () => true,
    recover: (error) => {
      // Return sanitized default values based on field
      const field = error.context?.['field'];
      const defaults: Record<string, unknown> = {
        agiExcl: 50000,
        initial: 100000,
        years: 5,
        currentAge: 35,
        customRate: 0.07,
        additionalPenalty: 0,
        expectedDeFiExtra: 0,
        country: 'usa',
        status: 'single',
        scenario: 'Stock Market',
        setupName: 'Taxable',
      };
      return typeof field === 'string' && field in defaults ? defaults[field] : null;
    },
    fallbackMessage: 'Using default value for invalid input',
  },

  [CalculationErrorType.MISSING_COUNTRY_DATA]: {
    canRecover: () => true,
    recover: () => 'usa', // Fallback to USA
    fallbackMessage: 'Switched to USA (most complete tax data available)',
  },

  [CalculationErrorType.INVALID_TAX_BRACKETS]: {
    canRecover: () => true,
    recover: (error) => {
      // Fallback to single filing status
      return error.context?.['country'] === 'usa' ? 'single' : 'default';
    },
    fallbackMessage: 'Using default filing status',
  },

  [CalculationErrorType.CALCULATION_OVERFLOW]: {
    canRecover: () => true,
    recover: (error) => {
      // Scale down values that caused overflow
      const values = error.context?.['values'] || {};
      const scaledValues: Record<string, number> = {};

      for (const [key, value] of Object.entries(values)) {
        if (typeof value === 'number' && value > 1e9) {
          scaledValues[key] = Math.min(value, 1e9);
        } else {
          scaledValues[key] = typeof value === 'number' ? value : 0;
        }
      }

      return scaledValues;
    },
    fallbackMessage: 'Scaled down large values to prevent overflow',
  },

  [CalculationErrorType.INVALID_SETUP]: {
    canRecover: () => true,
    recover: () => 'Taxable', // Fallback to taxable account
    fallbackMessage: 'Using taxable account as fallback',
  },

  [CalculationErrorType.NETWORK_ERROR]: {
    canRecover: () => false,
    recover: () => null,
    fallbackMessage: 'Please check your connection and try again',
  },

  [CalculationErrorType.UNKNOWN_ERROR]: {
    canRecover: () => false,
    recover: () => null,
    fallbackMessage: 'Please refresh the page and try again',
  },
};

// Safe calculation wrapper
export async function safeCalculationAsync<T>(
  operation: () => T | Promise<T>,
  operationName: string,
  context?: Record<string, unknown>
): Promise<{ success: true; data: T } | { success: false; error: CalculationError }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    let calculationError: CalculationError;

    if (error instanceof CalculationError) {
      calculationError = error;
    } else if (error instanceof Error) {
      // Try to categorize the error based on message
      if (error.message.includes('network') || error.message.includes('fetch')) {
        calculationError = calculationErrors.networkError(operationName, error);
      } else if (error.message.includes('overflow') || error.message.includes('Infinity')) {
        calculationError = calculationErrors.calculationOverflow(operationName, {});
      } else {
        calculationError = calculationErrors.unknown(error, { operationName, ...context });
      }
    } else {
      calculationError = calculationErrors.unknown(new Error(String(error)), {
        operationName,
        ...context,
      });
    }

    // Log error for debugging
    console.error(`Calculation error in ${operationName}:`, calculationError.toJSON());

    return { success: false, error: calculationError };
  }
}

// Attempt error recovery
export function attemptRecovery(error: CalculationError): {
  recovered: boolean;
  fallbackValue?: unknown;
  message?: string;
} {
  const strategy = errorRecoveryStrategies[error.type];

  if (!strategy || !strategy.canRecover(error)) {
    return { recovered: false };
  }

  try {
    const fallbackValue = strategy.recover(error);
    return {
      recovered: true,
      fallbackValue,
      message: strategy.fallbackMessage,
    };
  } catch (recoveryError) {
    console.error('Error recovery failed:', recoveryError);
    return { recovered: false };
  }
}

// Error reporting utility
export function reportError(error: CalculationError, additionalContext?: Record<string, unknown>) {
  const errorReport = {
    ...error.toJSON(),
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    additionalContext,
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Calculation Error Report:', errorReport);
  }

  // Send to error tracking service
  if (typeof window !== 'undefined') {
    // Google Analytics
    if ((window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'exception', {
        description: error.userMessage,
        fatal: !error.recoverable,
        error_type: error.type,
        error_code: error.code,
      });
    }

    // Custom error endpoint
    fetch('/api/errors/calculation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    }).catch(() => {
      // Fail silently for error reporting
    });
  }
}
