/**
 * API Configuration
 * 
 * Centralizes API base URL configuration for the application.
 * Uses VITE_API_BASE_URL (or REACT_APP_API_BASE_URL) from environment variables.
 * 
 * In development: defaults to http://localhost:4000 (backend server port)
 * In production: defaults to https://wathaci-connect-platform2.vercel.app (Vercel backend)
 */

/**
 * Get the API base URL from environment variables
 * 
 * Supports both VITE_API_BASE_URL and REACT_APP_API_BASE_URL for backward compatibility.
 * 
 * Development: defaults to http://localhost:4000 (backend server port)
 * Production: defaults to https://wathaci-connect-platform2.vercel.app (Vercel backend)
 * 
 * @returns The API base URL without trailing slash
 */
const getApiBaseUrl = (): string => {
  // Support both Vite and Create React App environment variable prefixes
  const viteUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const reactUrl = import.meta.env.REACT_APP_API_BASE_URL?.trim();
  const envUrl = viteUrl ?? reactUrl;

  // Use environment-specific defaults if not explicitly configured
  const defaultUrl = import.meta.env.DEV 
    ? 'http://localhost:4000'  // Local development backend
    : 'https://wathaci-connect-platform2.vercel.app';  // Production Vercel backend

  const baseUrl = envUrl ?? defaultUrl;

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
