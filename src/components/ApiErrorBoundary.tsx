/**
 * API Error Boundary Component
 * 
 * Catches and handles API-related errors in React components.
 * Provides user-friendly error messages and recovery options.
 * 
 * @example
 * ```tsx
 * <ApiErrorBoundary>
 *   <YourComponent />
 * </ApiErrorBoundary>
 * ```
 */

import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('API Error Boundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-4">
                {this.state.error?.message || 'An unexpected error occurred while connecting to the API.'}
              </p>
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline" size="sm">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  Reload Page
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer">Error Details (Development Only)</summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error handler for API calls
 * Use this to wrap async API calls with consistent error handling
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const handleApiError = useApiErrorHandler();
 * 
 *   const fetchData = async () => {
 *     try {
 *       const response = await fetch(...);
 *       // handle response
 *     } catch (error) {
 *       handleApiError(error);
 *     }
 *   };
 * }
 * ```
 */
export const useApiErrorHandler = () => {
  return (error: unknown) => {
    let message = 'An error occurred while communicating with the API';
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      message = 'Unable to connect to the API. Please check your internet connection.';
    } else if (error instanceof Error) {
      message = error.message;
    }

    console.error('API Error:', error);
    
    // You can integrate with a toast/notification system here
    return {
      message,
      error,
    };
  };
};
