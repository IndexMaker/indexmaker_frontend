// components/error/enhanced-error-boundary.tsx
// Enhanced error boundary with comprehensive error handling

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import Button from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Bug, Home, RefreshCw } from 'lucide-react';
import type React from 'react';
import { Component, type ErrorInfo, type ReactNode, useCallback } from 'react';
// import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { EnhancedError } from '@/lib/types/errors';
import { handleErrorBoundaryError, type ErrorBoundaryState } from '@/lib/utils/error-handling';

interface Props {
  children: ReactNode;
  fallback?: (error: EnhancedError, retry: () => void) => ReactNode;
  onError?: (error: EnhancedError, errorInfo: ErrorInfo) => void;
  showTechnicalDetails?: boolean;
  enableRetry?: boolean;
  enableReporting?: boolean;
}

interface State extends ErrorBoundaryState {
  retryCount: number;
  isReporting: boolean;
  showDetails: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      timestamp: new Date(),
      retryCount: 0,
      isReporting: false,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(): Partial<State> {
    // This runs during the render phase, so side effects are not allowed
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorBoundaryState = handleErrorBoundaryError(error, {
      componentStack: errorInfo.componentStack || '',
    });

    this.setState({
      ...errorBoundaryState,
      retryCount: this.state.retryCount,
      isReporting: false,
    });

    // Call the onError callback if provided
    if (this.props.onError && errorBoundaryState.error) {
      this.props.onError(errorBoundaryState.error, errorInfo);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isReporting: false,
      });
    }
  };

  handleReportErrorAsync = async () => {
    if (!this.state.error || this.state.isReporting) return;

    this.setState({ isReporting: true });

    try {
      // In a real application, you would send this to your error reporting service
      const errorReport = {
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount,
      };

      console.log('Error report (would be sent to service):', errorReport);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show success message or update UI
      alert('Error report sent successfully. Thank you for helping us improve!');
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
      alert('Failed to send error report. Please try again later.');
    } finally {
      this.setState({ isReporting: false });
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return this.renderDefaultErrorUI();
    }

    return this.props.children;
  }

  private renderDefaultErrorUI() {
    const { error } = this.state;
    const { showTechnicalDetails = false, enableRetry = true, enableReporting = true } = this.props;

    if (!error) return null;

    const canRetry = enableRetry && this.state.retryCount < this.maxRetries;
    const isRecoverable = error.recoverable;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <CardTitle className="text-xl text-red-700">
                  {isRecoverable ? 'Something went wrong' : 'Application Error'}
                </CardTitle>
                <CardDescription>Error Code: {error.errorCode}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* User-friendly error message */}
            <Alert>
              <AlertDescription className="text-base">{error.userMessage}</AlertDescription>
            </Alert>

            {/* Suggested actions */}
            {error.suggestedActions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">What you can do:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {error.suggestedActions.map((action, index) => (
                    <li key={index}>{action}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Technical details (collapsible) */}
            {showTechnicalDetails && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>
                {this.state.showDetails && (
                  <div className="mt-2 bg-gray-100 p-3 rounded text-xs font-mono">
                    <div>
                      <strong>Type:</strong> {error.type}
                    </div>
                    <div>
                      <strong>Message:</strong> {error.technicalDetails}
                    </div>
                    <div>
                      <strong>Timestamp:</strong> {error.timestamp.toISOString()}
                    </div>
                    <div>
                      <strong>Severity:</strong> {error.severity}
                    </div>
                    {error.context && (
                      <div>
                        <strong>Context:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(error.context, null, 2)}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap text-xs">
                          {this.state.errorInfo?.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-4">
              {canRetry && (
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again ({this.maxRetries - this.state.retryCount} left)
                </Button>
              )}

              <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>

              {enableReporting && (
                <Button
                  variant="outline"
                  onClick={this.handleReportErrorAsync}
                  disabled={this.state.isReporting}
                  className="flex-1"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  {this.state.isReporting ? 'Reporting...' : 'Report Issue'}
                </Button>
              )}
            </div>

            {/* Retry count indicator */}
            {this.state.retryCount > 0 && (
              <div className="text-sm text-gray-500 text-center">
                Retry attempt: {this.state.retryCount} of {this.maxRetries}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
}

/**
 * Hook for using error boundary in functional components
 */
export function useErrorHandler() {
  return useCallback((error: Error) => {
    // Log error for debugging
    console.error('Error caught by useErrorHandler:', error);

    // Report error to tracking service
    if (typeof window !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.message,
          stack: error.stack?.substring(0, 1000),
          timestamp: new Date().toISOString(),
          userAgent: window.navigator.userAgent,
          url: window.location.href,
          source: 'useErrorHandler',
        }),
      }).catch(() => {
        // Fail silently for error reporting
      });
    }

    // Throw the error to be caught by the nearest error boundary
    throw error;
  }, []);
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Simple error fallback component
 */
export function SimpleErrorFallback({
  error,
  retry,
}: {
  error: EnhancedError;
  retry: () => void;
}) {
  return (
    <div className="text-center p-8">
      <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.userMessage}</p>
      <Button onClick={retry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}
