// lib/utils/error-handling.ts
// Simple error handling utilities

import type { EnhancedError } from '../types/errors';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: EnhancedError | null;
  errorInfo: { componentStack: string } | null;
  errorId: string;
  timestamp: Date;
}

/**
 * Handle error boundary errors and create enhanced error state
 */
export function handleErrorBoundaryError(
  error: Error,
  errorInfo: { componentStack: string }
): ErrorBoundaryState {
  const enhancedError: EnhancedError = {
    type: 'ComponentRender',
    message: error.message,
    timestamp: new Date(),
    context: {
      type: 'error-boundary',
      componentStack: errorInfo.componentStack,
      stack: error.stack,
    },
    severity: 'high',
    recoverable: false,
    userMessage: 'A component failed to render. Please refresh the page.',
    technicalDetails: `${error.name}: ${error.message}`,
    suggestedActions: ['Refresh the page', 'Check browser console for details'],
    errorCode: `COMP_RENDER_${Date.now().toString(36).toUpperCase()}`,
  };

  return {
    hasError: true,
    error: enhancedError,
    errorInfo,
    errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  };
}

/**
 * Convert various error types to EnhancedError for consistent display
 */
export function toEnhancedError(error: unknown): EnhancedError {
  // If already an EnhancedError, return as-is
  if (isEnhancedError(error)) {
    return error;
  }

  // If it's a standard Error object
  if (error instanceof Error) {
    return {
      type: 'ComponentRender',
      message: error.message,
      timestamp: new Date(),
      context: { stack: error.stack },
      severity: 'medium',
      recoverable: true,
      userMessage: error.message,
      technicalDetails: `${error.name}: ${error.message}`,
      suggestedActions: ['Try again', 'Refresh the page'],
      errorCode: `ERROR_${Date.now().toString(36).toUpperCase()}`,
    };
  }

  // If it's a string
  if (typeof error === 'string') {
    return {
      type: 'ValidationError',
      message: error,
      timestamp: new Date(),
      severity: 'low',
      recoverable: true,
      userMessage: error,
      technicalDetails: error,
      suggestedActions: ['Check your input and try again'],
      errorCode: `STRING_ERROR_${Date.now().toString(36).toUpperCase()}`,
    };
  }

  // Fallback for unknown error types
  return {
    type: 'ComponentRender',
    message: 'An unknown error occurred',
    timestamp: new Date(),
    context: { originalError: error },
    severity: 'medium',
    recoverable: true,
    userMessage: 'Something went wrong. Please try again.',
    technicalDetails: `Unknown error: ${String(error)}`,
    suggestedActions: ['Try again', 'Refresh the page'],
    errorCode: `UNKNOWN_${Date.now().toString(36).toUpperCase()}`,
  };
}

/**
 * Type guard to check if an error is already an EnhancedError
 */
function isEnhancedError(error: unknown): error is EnhancedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'severity' in error &&
    'recoverable' in error &&
    'userMessage' in error &&
    'technicalDetails' in error &&
    'suggestedActions' in error &&
    'errorCode' in error &&
    'timestamp' in error
  );
}
