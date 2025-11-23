/**
 * API Configuration
 * 
 * Centralizes API base URL configuration for the application.
 * Uses VITE_API_BASE_URL from environment variables.
 * 
 * In development: defaults to http://localhost:3000
 * In production: MUST be set to the live API endpoint (e.g., https://api.wathaci.com)
 */

/**
 * Get the API base URL from environment variables
 * 
 * @returns The API base URL without trailing slash
 */
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // In production, VITE_API_BASE_URL must be set
  if (import.meta.env.MODE === 'production' && !envUrl) {
    throw new Error(
      'VITE_API_BASE_URL is required in production mode. ' +
      'Please set it to your live backend API URL (e.g., https://api.wathaci.com)'
    );
  }
  
  // Default to localhost in development
  const baseUrl = envUrl ?? 'http://localhost:3000';
  
  // Remove trailing slash for consistency
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

/**
 * The base URL for all API requests
 * 
 * Usage:
 * ```typescript
 * import { API_BASE_URL } from '@/config/api';
 * 
 * const response = await fetch(`${API_BASE_URL}/users`, {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * });
 * ```
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Check if the API is configured for production
 * 
 * @returns true if using a production API URL (not localhost)
 */
export const isProductionApi = (): boolean => {
  return !API_BASE_URL.includes('localhost') && !API_BASE_URL.includes('127.0.0.1');
};

/**
 * Get the API endpoint for a given path
 * 
 * @param path - The API path (e.g., '/users', '/payments')
 * @returns The full API endpoint URL
 * 
 * @example
 * ```typescript
 * const url = getApiEndpoint('/users');
 * // Returns: "https://api.wathaci.com/users" (in production)
 * ```
 */
export const getApiEndpoint = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
