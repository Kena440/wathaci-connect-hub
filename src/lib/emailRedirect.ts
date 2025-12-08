/**
 * Email Redirect URL Helper
 * 
 * Provides functions to construct email redirect URLs for Supabase auth flows.
 * Supports both absolute URLs and path-based redirects with automatic base URL resolution.
 */

/**
 * Get the base URL of the application
 * Tries multiple environment variables and falls back to window.location.origin
 */
const getAppBaseUrl = (): string | undefined => {
  const defaultBaseUrl = 'https://wathaci.com';

  // Try various environment variable names
  const envKeys = [
    'VITE_APP_BASE_URL',
    'VITE_SITE_URL',
    'VITE_PUBLIC_SITE_URL',
  ];

  for (const key of envKeys) {
    const value = import.meta.env[key];
    if (value && typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') {
        return trimmed;
      }
    }
  }

  // Prefer the canonical domain when no environment variable is provided
  if (defaultBaseUrl) {
    return defaultBaseUrl;
  }

  // Fallback to window.location.origin if available
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return undefined;
};

/**
 * Build an absolute URL from a path or URL string
 * If the input is already an absolute URL, return it as-is
 * Otherwise, combine it with the base URL
 */
const buildAbsoluteUrl = (pathOrUrl: string, baseUrl?: string): string | undefined => {
  if (!pathOrUrl) {
    return undefined;
  }

  // Check if it's already an absolute URL
  try {
    new URL(pathOrUrl);
    return pathOrUrl;
  } catch {
    // Not an absolute URL, need to combine with base URL
  }

  if (!baseUrl) {
    return undefined;
  }

  try {
    // Ensure base URL doesn't end with slash and path starts with slash
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${normalizedBase}${normalizedPath}`;
  } catch {
    return undefined;
  }
};

/**
 * Get the email confirmation redirect URL
 * 
 * Checks for environment variables in this order:
 * 1. VITE_EMAIL_CONFIRMATION_REDIRECT_URL (absolute URL)
 * 2. VITE_EMAIL_CONFIRMATION_REDIRECT_PATH (path to combine with base URL)
 * 3. Falls back to the provided default path (default: '/signin')
 * 
 * @param fallbackPath - Default path to use if no env vars are set (default: '/signin')
 * @returns Absolute redirect URL or undefined if cannot be constructed
 */
export const getEmailConfirmationRedirectUrl = (fallbackPath: string = '/signin'): string | undefined => {
  const baseUrl = getAppBaseUrl();

  // Try absolute URL first
  const absoluteUrl = import.meta.env.VITE_EMAIL_CONFIRMATION_REDIRECT_URL;
  if (absoluteUrl && typeof absoluteUrl === 'string') {
    const trimmed = absoluteUrl.trim();
    if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') {
      return trimmed;
    }
  }

  // Try path-based redirect
  const redirectPath = import.meta.env.VITE_EMAIL_CONFIRMATION_REDIRECT_PATH;
  if (redirectPath && typeof redirectPath === 'string') {
    const trimmed = redirectPath.trim();
    if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') {
      return buildAbsoluteUrl(trimmed, baseUrl);
    }
  }

  // Use fallback path
  return buildAbsoluteUrl(fallbackPath, baseUrl);
};

/**
 * Get the password reset redirect URL
 * 
 * Checks for environment variables in this order:
 * 1. VITE_PASSWORD_RESET_REDIRECT_URL (absolute URL)
 * 2. VITE_PASSWORD_RESET_REDIRECT_PATH (path to combine with base URL)
 * 3. Falls back to the provided default path (default: '/reset-password')
 * 
 * @param fallbackPath - Default path to use if no env vars are set (default: '/reset-password')
 * @returns Absolute redirect URL or undefined if cannot be constructed
 */
export const getPasswordResetRedirectUrl = (fallbackPath: string = '/reset-password'): string | undefined => {
  const baseUrl = getAppBaseUrl();

  // Try absolute URL first
  const absoluteUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL;
  if (absoluteUrl && typeof absoluteUrl === 'string') {
    const trimmed = absoluteUrl.trim();
    if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') {
      return trimmed;
    }
  }

  // Try path-based redirect
  const redirectPath = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_PATH;
  if (redirectPath && typeof redirectPath === 'string') {
    const trimmed = redirectPath.trim();
    if (trimmed && trimmed !== 'undefined' && trimmed !== 'null') {
      return buildAbsoluteUrl(trimmed, baseUrl);
    }
  }

  // Use fallback path
  return buildAbsoluteUrl(fallbackPath, baseUrl);
};

/**
 * Get a generic email redirect URL
 * Useful for custom auth flows
 * 
 * @param path - Path to redirect to
 * @returns Absolute redirect URL or undefined if cannot be constructed
 */
export const getEmailRedirectUrl = (path: string): string | undefined => {
  const baseUrl = getAppBaseUrl();
  return buildAbsoluteUrl(path, baseUrl);
};
