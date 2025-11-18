/**
 * API Connection Status Banner Component
 * 
 * Displays a banner when the backend API is unreachable or unhealthy.
 * Provides users with clear feedback about connectivity issues.
 * 
 * @example
 * ```tsx
 * // In your App.tsx or layout component
 * <ApiConnectionBanner />
 * ```
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, WifiOff, RefreshCw } from 'lucide-react';
import { useApiConnection } from '@/hooks/useApiConnection';

interface ApiConnectionBannerProps {
  autoRetry?: boolean;
  retryInterval?: number;
  className?: string;
}

export const ApiConnectionBanner: React.FC<ApiConnectionBannerProps> = ({
  autoRetry = true,
  retryInterval = 30000,
  className = '',
}) => {
  const { isConnected, isChecking, error, checkConnection } = useApiConnection({
    checkOnMount: true,
    autoRetry,
    retryInterval,
  });

  // Don't show anything if connected or still checking initially
  if (isConnected === null || isConnected === true) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className}>
      <WifiOff className="h-4 w-4" />
      <AlertTitle>Backend Connection Lost</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          Cannot connect to the backend API. {error || 'Please check your connection.'}
          {autoRetry && ' Automatically retrying...'}
        </span>
        <Button
          onClick={checkConnection}
          disabled={isChecking}
          variant="outline"
          size="sm"
          className="ml-4"
        >
          {isChecking ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

interface ApiConnectionIndicatorProps {
  showWhenConnected?: boolean;
  className?: string;
}

/**
 * Simple connection status indicator (dot)
 * Shows a colored dot indicating connection status
 */
export const ApiConnectionIndicator: React.FC<ApiConnectionIndicatorProps> = ({
  showWhenConnected = false,
  className = '',
}) => {
  const { isConnected, isChecking } = useApiConnection({
    checkOnMount: true,
    autoRetry: true,
  });

  if (isConnected === null) {
    return null;
  }

  if (isConnected && !showWhenConnected) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`} title={isConnected ? 'Connected' : 'Disconnected'}>
      <div
        className={`h-2 w-2 rounded-full ${
          isChecking
            ? 'bg-yellow-500 animate-pulse'
            : isConnected
            ? 'bg-green-500'
            : 'bg-red-500 animate-pulse'
        }`}
      />
      <span className="text-xs text-muted-foreground">
        {isChecking ? 'Checking...' : isConnected ? 'API Connected' : 'API Disconnected'}
      </span>
    </div>
  );
};
