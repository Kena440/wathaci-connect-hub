/**
 * API Configuration
 *
 * Centralizes API base URL configuration for the application.
 * Uses VITE_API_BASE_URL (or REACT_APP_API_BASE_URL) from environment variables.
 *
 * In development: defaults to http://localhost:4000
 * In production: MUST be set to the live API endpoint (e.g., https://wathaci-connect-platform2.vercel.app)
 */

const FALLBACK_PROD_API = 'https://wathaci-connect-platform2.vercel.app';
const FALLBACK_DEV_API = 'http://localhost:4000';

/**
 * Get the API base URL from environment variables
 *
 * Supports both VITE_API_BASE_URL and REACT_APP_API_BASE_URL for backward compatibility.
 *
 * @returns The API base URL without trailing slash
 */
const getApiBaseUrl = (): string => {
  const viteUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const reactUrl = import.meta.env.REACT_APP_API_BASE_URL?.trim();
  const envUrl = viteUrl ?? reactUrl;

  const resolvedUrl =
    envUrl && envUrl.length > 0
      ? envUrl
      : import.meta.env.DEV
      ? FALLBACK_DEV_API
      : FALLBACK_PROD_API;

  if (!resolvedUrl && !import.meta.env.DEV) {
    throw new Error(
      'API base URL is required in production mode. ' +
        'Please set VITE_API_BASE_URL (or REACT_APP_API_BASE_URL) to your live backend API URL (e.g., https://wathaci-connect-platform2.vercel.app)'
    );
  }

  const baseUrl = resolvedUrl;
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export const isProductionApi = (): boolean => {
  return !API_BASE_URL.includes('localhost') && !API_BASE_URL.includes('127.0.0.1');
};

export const getApiEndpoint = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
