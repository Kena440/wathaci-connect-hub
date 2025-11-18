/**
 * API Connection Status Hook
 * 
 * React hook for monitoring the backend API connection status.
 * Automatically checks health on mount and provides methods for manual checks.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected, isChecking, lastCheck, checkConnection } = useApiConnection();
 * 
 *   return (
 *     <div>
 *       Status: {isConnected ? 'Connected' : 'Disconnected'}
 *       {!isConnected && <button onClick={checkConnection}>Retry</button>}
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { checkApiHealth, type HealthStatus } from '@/lib/api/health-check';

interface UseApiConnectionResult {
  isConnected: boolean | null;
  isChecking: boolean;
  lastCheck: Date | null;
  healthStatus: HealthStatus | null;
  error: string | null;
  checkConnection: () => Promise<void>;
}

interface UseApiConnectionOptions {
  checkOnMount?: boolean;
  autoRetry?: boolean;
  retryInterval?: number;
  timeout?: number;
}

/**
 * Hook to monitor API connection status
 * 
 * @param options - Configuration options
 * @returns Connection status and methods
 */
export const useApiConnection = (
  options: UseApiConnectionOptions = {}
): UseApiConnectionResult => {
  const {
    checkOnMount = true,
    autoRetry = false,
    retryInterval = 30000, // 30 seconds
    timeout = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const status = await checkApiHealth(timeout);
      
      setHealthStatus(status);
      setIsConnected(status.isHealthy);
      setLastCheck(new Date());
      
      if (!status.isHealthy) {
        setError(status.error || 'Backend is not healthy');
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLastCheck(new Date());
    } finally {
      setIsChecking(false);
    }
  }, [timeout]);

  // Check on mount
  useEffect(() => {
    if (checkOnMount) {
      checkConnection();
    }
  }, [checkOnMount, checkConnection]);

  // Auto-retry on failure
  useEffect(() => {
    if (!autoRetry || isConnected === true) {
      return;
    }

    const intervalId = setInterval(() => {
      if (isConnected === false) {
        checkConnection();
      }
    }, retryInterval);

    return () => clearInterval(intervalId);
  }, [autoRetry, isConnected, retryInterval, checkConnection]);

  return {
    isConnected,
    isChecking,
    lastCheck,
    healthStatus,
    error,
    checkConnection,
  };
};
