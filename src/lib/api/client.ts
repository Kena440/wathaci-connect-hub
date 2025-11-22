/**
 * Centralized API Client Utility
 * 
 * Provides a consistent interface for making API requests to the backend.
 * All API calls should use this utility to ensure proper error handling,
 * authentication, and configuration.
 */

import { API_BASE_URL } from '@/config/api';

export type ApiRequestOptions = RequestInit & {
  headers?: Record<string, string>;
};

export type ApiResponse<T = any> = {
  data?: T;
  error?: string;
  status: number;
};

/**
 * Make an API request to the backend
 * 
 * @param path - API endpoint path (e.g., '/users', '/api/health')
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise with typed response data
 * 
 * @example
 * ```typescript
 * // GET request
 * const health = await apiFetch('/health');
 * 
 * // POST request
 * const user = await apiFetch('/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ email: 'user@example.com' })
 * });
 * ```
 */
export async function apiFetch<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  // Normalize path to start with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Parse response as JSON
    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      // If JSON parsing fails but response is OK, return empty object
      if (response.ok) {
        return {} as T;
      }
      // Otherwise, throw error about failed response
      throw new Error(`Failed to parse response: ${response.statusText}`);
    }

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = data as { error?: string; message?: string };
      const errorMessage = errorData?.error || errorData?.message || `Request failed: ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error) {
    // Re-throw with additional context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

/**
 * Make a GET request to the API
 * 
 * @param path - API endpoint path
 * @param options - Additional fetch options
 * @returns Promise with typed response data
 */
export async function apiGet<T = any>(
  path: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(path, { ...options, method: 'GET' });
}

/**
 * Make a POST request to the API
 * 
 * @param path - API endpoint path
 * @param data - Request body data
 * @param options - Additional fetch options
 * @returns Promise with typed response data
 */
export async function apiPost<T = any>(
  path: string,
  data?: any,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a PUT request to the API
 * 
 * @param path - API endpoint path
 * @param data - Request body data
 * @param options - Additional fetch options
 * @returns Promise with typed response data
 */
export async function apiPut<T = any>(
  path: string,
  data?: any,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make a DELETE request to the API
 * 
 * @param path - API endpoint path
 * @param options - Additional fetch options
 * @returns Promise with typed response data
 */
export async function apiDelete<T = any>(
  path: string,
  options?: ApiRequestOptions
): Promise<T> {
  return apiFetch<T>(path, { ...options, method: 'DELETE' });
}
