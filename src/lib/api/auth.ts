/**
 * Backend Auth API Client
 * 
 * Provides functions to interact with backend authentication endpoints.
 * These complement Supabase Auth by providing session verification and
 * protected API functionality.
 */

import { API_BASE_URL } from '@/config/api';

/**
 * Error class for auth API errors
 */
export class AuthApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

/**
 * Get the current authenticated user from the backend
 * 
 * @param accessToken - Supabase JWT access token
 * @returns User and profile data
 * @throws AuthApiError if request fails
 */
export async function getAuthenticatedUser(accessToken: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new AuthApiError(
        error.error || 'Failed to get user information',
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    throw new AuthApiError(
      'Network error: Unable to reach authentication server',
      undefined,
      error
    );
  }
}

/**
 * Verify if the current session is valid
 * 
 * @param accessToken - Supabase JWT access token
 * @returns Validation result
 * @throws AuthApiError if request fails
 */
export async function verifySession(accessToken: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new AuthApiError(
        error.error || 'Session verification failed',
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    throw new AuthApiError(
      'Network error: Unable to verify session',
      undefined,
      error
    );
  }
}

/**
 * Refresh the access token using a refresh token
 * 
 * @param refreshToken - Supabase refresh token
 * @returns New session with access and refresh tokens
 * @throws AuthApiError if request fails
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new AuthApiError(
        error.error || 'Token refresh failed',
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    throw new AuthApiError(
      'Network error: Unable to refresh token',
      undefined,
      error
    );
  }
}

/**
 * Resend email verification
 * 
 * @param accessToken - Supabase JWT access token
 * @returns Success message
 * @throws AuthApiError if request fails
 */
export async function resendEmailVerification(accessToken: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new AuthApiError(
        error.error || 'Failed to send verification email',
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    throw new AuthApiError(
      'Network error: Unable to send verification email',
      undefined,
      error
    );
  }
}

/**
 * Check auth system status
 * 
 * @returns Auth system configuration status
 */
export async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        configured: false,
        message: 'Unable to reach authentication server',
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      configured: false,
      message: 'Network error: Unable to check auth status',
    };
  }
}

/**
 * Make an authenticated API request to the backend
 * 
 * Helper function to include authentication headers automatically
 * 
 * @param endpoint - API endpoint path (e.g., '/api/protected')
 * @param accessToken - Supabase JWT access token
 * @param options - Fetch options (method, body, etc.)
 * @returns Response data
 * @throws AuthApiError if request fails
 */
export async function authenticatedFetch<T = any>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new AuthApiError(
        error.error || `Request failed: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }
    throw new AuthApiError(
      'Network error: Unable to complete request',
      undefined,
      error
    );
  }
}
