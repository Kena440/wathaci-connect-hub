/**
 * API Health Check Utility
 * 
 * Provides functions to check if the backend API is reachable and healthy.
 * Used for connection status monitoring and debugging.
 */

import { getApiEndpoint } from '@/config/api';

export type HealthStatus = {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
  serverInfo?: {
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
  };
};

/**
 * Check if the backend API is healthy and reachable
 * 
 * @param timeout - Request timeout in milliseconds (default: 5000)
 * @returns HealthStatus object with connection details
 * 
 * @example
 * ```typescript
 * const health = await checkApiHealth();
 * if (health.isHealthy) {
 *   console.log('Backend is healthy');
 * } else {
 *   console.error('Backend error:', health.error);
 * }
 * ```
 */
export const checkApiHealth = async (timeout = 5000): Promise<HealthStatus> => {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(getApiEndpoint('/health'), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        isHealthy: false,
        responseTime,
        error: `Server responded with status ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      isHealthy: true,
      responseTime,
      serverInfo: data,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if ((error as DOMException)?.name === 'AbortError') {
      return {
        isHealthy: false,
        responseTime,
        error: `Health check timed out after ${timeout}ms`,
      };
    }

    return {
      isHealthy: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Get API endpoint information
 * 
 * @returns API metadata including available endpoints
 */
export const getApiInfo = async (timeout = 5000): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(getApiEndpoint('/api'), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch API info: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as DOMException)?.name === 'AbortError') {
      throw new Error(`API info request timed out after ${timeout}ms`);
    }

    throw error;
  }
};

/**
 * Verify that a specific API endpoint is reachable
 * 
 * @param endpoint - The endpoint path to check (e.g., '/users', '/api/logs')
 * @param method - HTTP method to use (default: 'OPTIONS')
 * @param timeout - Request timeout in milliseconds (default: 5000)
 * @returns true if endpoint is reachable, false otherwise
 */
export const verifyEndpoint = async (
  endpoint: string,
  method: 'OPTIONS' | 'HEAD' | 'GET' = 'OPTIONS',
  timeout = 5000
): Promise<boolean> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(getApiEndpoint(endpoint), {
      method,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    // For OPTIONS and HEAD, any response (including errors) means endpoint exists
    // For GET, we want a successful response
    return method === 'GET' ? response.ok : true;
  } catch (error) {
    clearTimeout(timeoutId);
    return false;
  }
};
