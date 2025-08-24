'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CalculationError,
  CalculationErrorType,
  attemptRecovery,
} from '@/lib/errors/calculation-errors';
import type { EnhancedError, ErrorSeverity } from '@/lib/types/errors';
import { toEnhancedError } from '@/lib/utils/error-handling';
import { AlertCircle, AlertTriangle, CheckCircle, Info, RefreshCw, XCircle } from 'lucide-react';

// Unified error types
export type UnifiedErrorSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'error'
  | 'warning'
  | 'info'
  | 'success';
export type UnifiedError = EnhancedError | CalculationError | Error | string;

interface UnifiedErrorDisplayProps {
  error?: UnifiedError | null;
  severity?: UnifiedErrorSeverity;
  title?: string;
  showRetry?: boolean;
  showRecovery?: boolean;
  showTechnicalDetails?: boolean;
  compact?: boolean;
  onRetry?: () => void;
  onRecovery?: (fallbackValue: unknown) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Unified error display component that handles all error types
 */
export function UnifiedErrorDisplay({
  error,
  severity,
  title,
  showRetry = true,
  showRecovery = true,
  showTechnicalDetails = false,
  compact = false,
  onRetry,
  onRecovery,
  onDismiss,
  className,
}: UnifiedErrorDisplayProps) {
  if (!error || (typeof error === 'string' && error.trim() === '')) {
    return null;
  }

  // Convert any error type to a consistent format
  let enhancedError: EnhancedError;
  let calculationError: CalculationError | null = null;
  let errorMessage: string;
  let errorTitle: string;
  let effectiveSeverity: UnifiedErrorSeverity;

  if (error instanceof CalculationError) {
    calculationError = error;
    enhancedError = toEnhancedError(error);
    errorMessage = error.userMessage;
    errorTitle = title || 'Calculation Error';
    effectiveSeverity = severity || getCalculationErrorSeverity(error);
  } else {
    enhancedError = toEnhancedError(error);
    errorMessage = enhancedError.userMessage;
    errorTitle = title || getSeverityTitle(enhancedError.severity);
    effectiveSeverity = severity || enhancedError.severity;
  }

  const { icon: Icon, variant } = getErrorDisplayConfig(effectiveSeverity);

  // Handle recovery for calculation errors
  const handleRecovery = () => {
    if (!calculationError || !onRecovery) return;
    const recovery = attemptRecovery(calculationError);
    if (recovery.recovered) {
      onRecovery(recovery.fallbackValue);
    }
  };

  const canRecover = calculationError?.recoverable && showRecovery && onRecovery;
  const canRetry = showRetry && onRetry;

  if (compact) {
    return (
      <Alert variant={variant} className={`mb-4 ${className || ''}`}>
        <Icon className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <div className="flex gap-2 ml-2">
              {canRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              {canRecover && (
                <Button variant="secondary" size="sm" onClick={handleRecovery}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Fix
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`border-l-4 ${getBorderColor(effectiveSeverity)} ${className || ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${getIconColor(effectiveSeverity)}`} />
            <div>
              <CardTitle className="text-lg">{errorTitle}</CardTitle>
              <CardDescription>
                {enhancedError.errorCode && `Error Code: ${enhancedError.errorCode} • `}
                {enhancedError.timestamp.toLocaleString()}
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* User message */}
        <div className="text-base">{errorMessage}</div>

        {/* Recovery suggestion for calculation errors */}
        {calculationError && canRecover && (
          <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-md">
            <p>💡 We can try to fix this automatically by using a default value.</p>
          </div>
        )}

        {/* Suggested actions for enhanced errors */}
        {enhancedError.suggestedActions && enhancedError.suggestedActions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Suggested actions:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              {enhancedError.suggestedActions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Technical details */}
        {showTechnicalDetails && (
          <details className="bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer font-medium">Technical Details</summary>
            <div className="mt-2 text-sm font-mono space-y-1">
              <div>
                <strong>Type:</strong> {enhancedError.type || 'Unknown'}
              </div>
              <div>
                <strong>Message:</strong> {enhancedError.technicalDetails || enhancedError.message}
              </div>
              <div>
                <strong>Severity:</strong> {effectiveSeverity}
              </div>
              <div>
                <strong>Recoverable:</strong> {enhancedError.recoverable ? 'Yes' : 'No'}
              </div>
              {enhancedError.context && (
                <div>
                  <strong>Context:</strong>
                  <pre className="mt-1 text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(enhancedError.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Development debug info for calculation errors */}
        {process.env.NODE_ENV === 'development' && calculationError && (
          <details className="bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer font-medium text-xs">Debug Information</summary>
            <div className="mt-2 text-xs font-mono space-y-1">
              <div>
                <strong>Type:</strong> {calculationError.type}
              </div>
              <div>
                <strong>Code:</strong> {calculationError.code}
              </div>
              <div>
                <strong>Recoverable:</strong> {calculationError.recoverable ? 'Yes' : 'No'}
              </div>
              {calculationError.context && (
                <div>
                  <strong>Context:</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">
                    {JSON.stringify(calculationError.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Action buttons */}
        {(canRetry || canRecover) && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {canRetry && (
              <Button onClick={onRetry} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            {canRecover && (
              <Button onClick={handleRecovery} variant="secondary" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                Use Default Value
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Inline error display for form fields
 */
export function FieldError({
  error,
  className = '',
}: {
  error?: string;
  className?: string;
}) {
  if (!error) return null;

  return <div className={`text-sm text-destructive mt-1 ${className}`}>{error}</div>;
}

/**
 * Success message component
 */
export function SuccessMessage({
  message,
  title = 'Success',
  className = '',
}: {
  message: string;
  title?: string;
  className?: string;
}) {
  return (
    <Alert className={`border-green-200 bg-green-50 text-green-800 ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">{title}</AlertTitle>
      <AlertDescription className="text-green-700">{message}</AlertDescription>
    </Alert>
  );
}

/**
 * Loading error component
 */
export function LoadingError({
  error,
  message = 'Failed to load data',
  onRetry,
  isRetrying = false,
  className = '',
}: {
  error?: UnifiedError;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  const displayMessage = error
    ? typeof error === 'string'
      ? error
      : error instanceof CalculationError
        ? error.userMessage
        : error instanceof Error
          ? error.message
          : toEnhancedError(error).userMessage
    : message;

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <XCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold text-destructive mb-2">Loading Error</h3>
      <p className="text-muted-foreground mb-4">{displayMessage}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" disabled={isRetrying}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      )}
    </div>
  );
}

/**
 * Network error component
 */
export function NetworkError({
  onRetry,
  className = '',
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Connection Error</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p>Unable to connect to our servers. Please check your internet connection.</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Connection
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Helper functions
 */

function getCalculationErrorSeverity(error: CalculationError): UnifiedErrorSeverity {
  switch (error.type) {
    case CalculationErrorType.NETWORK_ERROR:
    case CalculationErrorType.UNKNOWN_ERROR:
      return 'error';
    case CalculationErrorType.MISSING_COUNTRY_DATA:
    case CalculationErrorType.INVALID_SETUP:
      return 'warning';
    case CalculationErrorType.INVALID_INPUT:
    case CalculationErrorType.INVALID_TAX_BRACKETS:
    case CalculationErrorType.CALCULATION_OVERFLOW:
      return 'info';
    default:
      return 'error';
  }
}

function getErrorDisplayConfig(severity: UnifiedErrorSeverity) {
  switch (severity) {
    case 'critical':
    case 'error':
      return { icon: XCircle, variant: 'destructive' as const };
    case 'high':
    case 'warning':
      return { icon: AlertTriangle, variant: 'destructive' as const };
    case 'medium':
    case 'info':
      return { icon: Info, variant: 'default' as const };
    case 'low':
      return { icon: AlertCircle, variant: 'default' as const };
    case 'success':
      return { icon: CheckCircle, variant: 'default' as const };
    default:
      return { icon: AlertCircle, variant: 'default' as const };
  }
}

function getBorderColor(severity: UnifiedErrorSeverity): string {
  switch (severity) {
    case 'critical':
    case 'error':
      return 'border-l-red-500';
    case 'high':
    case 'warning':
      return 'border-l-orange-500';
    case 'medium':
    case 'info':
      return 'border-l-blue-500';
    case 'low':
      return 'border-l-gray-500';
    case 'success':
      return 'border-l-green-500';
    default:
      return 'border-l-red-500';
  }
}

function getIconColor(severity: UnifiedErrorSeverity): string {
  switch (severity) {
    case 'critical':
    case 'error':
      return 'text-red-500';
    case 'high':
    case 'warning':
      return 'text-orange-500';
    case 'medium':
    case 'info':
      return 'text-blue-500';
    case 'low':
      return 'text-gray-500';
    case 'success':
      return 'text-green-500';
    default:
      return 'text-red-500';
  }
}

function getSeverityTitle(severity: ErrorSeverity | UnifiedErrorSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical Error';
    case 'high':
    case 'error':
      return 'Error';
    case 'medium':
    case 'warning':
      return 'Warning';
    case 'low':
    case 'info':
      return 'Notice';
    case 'success':
      return 'Success';
    default:
      return 'Error';
  }
}
