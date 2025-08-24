// lib/utils/logger.ts
import pino from 'pino';

/**
 * Centralized logger configuration following principles.md requirements
 * Replaces all console.* usage with proper structured logging
 */

// Determine log level based on environment
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'info';
  }
  if (process.env.NODE_ENV === 'test') {
    return 'silent';
  }
  return 'debug';
};

// Configure logger based on environment
const createLogger = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return pino({
    level: getLogLevel(),
    // Pretty print in development for better readability
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        }
      : undefined,
    // Add timestamp and service info
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: 'calculator',
      version: process.env.npm_package_version || '1.0.0',
    },
    // Redact sensitive information
    redact: {
      paths: ['password', 'token', 'apiKey', 'secret'],
      censor: '[REDACTED]',
    },
  });
};

// Create singleton logger instance
const logger = createLogger();

/**
 * Logger interface that replaces console.* methods
 * Usage:
 * - logger.info('User calculated taxes', { country: 'usa', amount: 50000 })
 * - logger.error('Tax calculation failed', { error: err.message, params })
 * - logger.debug('Processing tax brackets', { brackets })
 * - logger.warn('Using fallback tax rate', { reason: 'missing data' })
 */
export const log = {
  /**
   * Log informational messages (replaces console.log)
   */
  info: (message: string, data?: Record<string, unknown>) => {
    logger.info(data, message);
  },

  /**
   * Log error messages (replaces console.error)
   */
  error: (message: string, data?: Record<string, unknown>) => {
    logger.error(data, message);
  },

  /**
   * Log warning messages (replaces console.warn)
   */
  warn: (message: string, data?: Record<string, unknown>) => {
    logger.warn(data, message);
  },

  /**
   * Log debug messages (replaces console.debug)
   * Only shown in development environment
   */
  debug: (message: string, data?: Record<string, unknown>) => {
    logger.debug(data, message);
  },

  /**
   * Log trace messages for detailed debugging
   * Only shown in development environment
   */
  trace: (message: string, data?: Record<string, unknown>) => {
    logger.trace(data, message);
  },

  /**
   * Log fatal errors that require immediate attention
   */
  fatal: (message: string, data?: Record<string, unknown>) => {
    logger.fatal(data, message);
  },
};

/**
 * Create a child logger with additional context
 * Useful for adding consistent context to all logs in a module
 *
 * @example
 * const moduleLogger = createChildLogger({ module: 'tax-calculator', country: 'usa' })
 * moduleLogger.info('Starting calculation')
 */
export const createChildLogger = (context: Record<string, unknown>) => {
  const childLogger = logger.child(context);

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      childLogger.info(data, message);
    },
    error: (message: string, data?: Record<string, unknown>) => {
      childLogger.error(data, message);
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      childLogger.warn(data, message);
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      childLogger.debug(data, message);
    },
    trace: (message: string, data?: Record<string, unknown>) => {
      childLogger.trace(data, message);
    },
    fatal: (message: string, data?: Record<string, unknown>) => {
      childLogger.fatal(data, message);
    },
  };
};

// Export the main logger as default
export default log;

/**
 * Performance logging utilities
 */
export const performance = {
  /**
   * Time a function execution and log the duration
   */
  timeAsync: async <T>(
    label: string,
    fn: () => Promise<T> | T,
    context?: Record<string, unknown>
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      log.debug(`${label} completed`, { ...context, duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      log.error(`${label} failed`, {
        ...context,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};
