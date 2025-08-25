// lib/utils/client-logger.ts
// Client-safe logger that completely avoids pino in browser environments

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface Logger {
  trace: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  fatal: (...args: any[]) => void;
  child: (bindings?: any) => Logger;
  level: string;
}

// Get log level from environment
const getLogLevel = (): LogLevel => {
  if (typeof process !== 'undefined' && process.env?.LOG_LEVEL) {
    return process.env.LOG_LEVEL as LogLevel;
  }
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return 'debug';
  }
  return 'info';
};

// Create browser-safe logger
const createClientLogger = (): Logger => {
  const isBrowser = typeof window !== 'undefined';
  const logLevel = getLogLevel();
  const levels = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
  const currentLevel = levels[logLevel] || 30;

  const shouldLog = (level: LogLevel) => (levels[level] || 30) >= currentLevel;

  const formatMessage = (level: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return [prefix, ...args];
  };

  if (isBrowser) {
    // Browser implementation using console
    return {
      trace: (...args: any[]) => {
        if (shouldLog('trace')) {
          console.log(...formatMessage('trace', ...args));
        }
      },
      debug: (...args: any[]) => {
        if (shouldLog('debug')) {
          console.log(...formatMessage('debug', ...args));
        }
      },
      info: (...args: any[]) => {
        if (shouldLog('info')) {
          console.info(...formatMessage('info', ...args));
        }
      },
      warn: (...args: any[]) => {
        if (shouldLog('warn')) {
          console.warn(...formatMessage('warn', ...args));
        }
      },
      error: (...args: any[]) => {
        if (shouldLog('error')) {
          console.error(...formatMessage('error', ...args));
        }
      },
      fatal: (...args: any[]) => {
        if (shouldLog('fatal')) {
          console.error(...formatMessage('fatal', ...args));
        }
      },
      child: (bindings?: any) => {
        // Return a new logger instance with bindings
        const childLogger = createClientLogger();
        if (bindings) {
          // Add bindings to all log methods
          const originalMethods = { ...childLogger };
          Object.keys(originalMethods).forEach(method => {
            if (typeof originalMethods[method as keyof Logger] === 'function' && method !== 'child') {
              (childLogger as any)[method] = (...args: any[]) => {
                (originalMethods as any)[method](bindings, ...args);
              };
            }
          });
        }
        return childLogger;
      },
      level: logLevel,
    };
  } else {
    // Server-side implementation - try to use pino, fallback to console
    try {
      // Only import pino on server side
      const pino = require('pino');
      
      return pino({
        level: logLevel,
        transport: process.env.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: true,
          },
        } : undefined,
        timestamp: pino.stdTimeFunctions.isoTime,
        base: {
          service: 'calculator',
          version: process.env?.npm_package_version || '1.0.0',
        },
        redact: {
          paths: ['password', 'token', 'apiKey', 'secret'],
          censor: '[REDACTED]',
        },
      });
    } catch (error) {
      // Fallback to console-based logger
      console.warn('Pino not available, using console logger:', error);
      return {
        trace: (...args: any[]) => shouldLog('trace') && console.log(...formatMessage('trace', ...args)),
        debug: (...args: any[]) => shouldLog('debug') && console.log(...formatMessage('debug', ...args)),
        info: (...args: any[]) => shouldLog('info') && console.info(...formatMessage('info', ...args)),
        warn: (...args: any[]) => shouldLog('warn') && console.warn(...formatMessage('warn', ...args)),
        error: (...args: any[]) => shouldLog('error') && console.error(...formatMessage('error', ...args)),
        fatal: (...args: any[]) => shouldLog('fatal') && console.error(...formatMessage('fatal', ...args)),
        child: (bindings?: any) => createClientLogger(),
        level: logLevel,
      };
    }
  }
};

// Create and export logger instance
export const log = createClientLogger();

// Export logger as default
export default log;

// Export types for TypeScript
export type { Logger, LogLevel };

// Utility functions
export const createLogger = createClientLogger;

/**
 * Safe logging functions that work in both browser and server environments
 */
export const safeLog = {
  trace: (...args: any[]) => log.trace(...args),
  debug: (...args: any[]) => log.debug(...args),
  info: (...args: any[]) => log.info(...args),
  warn: (...args: any[]) => log.warn(...args),
  error: (...args: any[]) => log.error(...args),
  fatal: (...args: any[]) => log.fatal(...args),
};

/**
 * Performance logging utility
 */
export const perfLog = {
  start: (label: string) => {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        log.debug(`Performance: ${label} took ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  }
};

/**
 * Error logging utility with stack traces
 */
export const errorLog = (error: Error | unknown, context?: any) => {
  if (error instanceof Error) {
    log.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context
    });
  } else {
    log.error('Unknown error occurred:', { error, context });
  }
};
