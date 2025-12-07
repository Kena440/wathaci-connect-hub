/**
 * Enhanced error handling and logging for authentication operations
 * Provides detailed error messages while keeping sensitive information secure
 */

import { AuthError } from '@supabase/supabase-js';

export interface DetailedAuthError {
  /** User-friendly error message safe to display */
  friendlyMessage: string;
  /** Technical error code for logging */
  errorCode: string;
  /** Original error message (for logging only) */
  originalMessage?: string;
  /** Error category for routing to correct fix */
  category: 'auth' | 'database' | 'network' | 'validation' | 'unknown';
  /** Suggested action for user */
  suggestedAction?: string;
  /** Whether this error should be reported to backend */
  shouldReport: boolean;
}

/**
 * Parse and categorize authentication errors
 */
export function parseAuthError(error: unknown): DetailedAuthError {
  // Handle AuthError from Supabase
  if (error instanceof AuthError) {
    return parseSupabaseAuthError(error);
  }

  // Handle generic Error
  if (error instanceof Error) {
    return parseGenericError(error);
  }

  // Handle string errors
  if (typeof error === 'string') {
    return parseStringError(error);
  }

  // Handle unknown error types
  return {
    friendlyMessage: 'An unexpected error occurred. Please try again.',
    errorCode: 'UNKNOWN_ERROR',
    category: 'unknown',
    shouldReport: true,
  };
}

/**
 * Parse Supabase AuthError
 */
function parseSupabaseAuthError(error: AuthError): DetailedAuthError {
  const message = error.message.toLowerCase();
  const status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;
  const code = (error as any)?.code as string | undefined;

  // Signups disabled or blocked at project level
  if (
    message.includes('signup') &&
    (message.includes('not allowed') || message.includes('disabled') || message.includes('forbidden'))
  ) {
    return {
      friendlyMessage: 'New account creation is currently disabled. Please contact support if you believe this is in error.',
      errorCode: 'SIGNUPS_DISABLED',
      originalMessage: error.message,
      category: 'auth',
      suggestedAction: 'Reach out to support@wathaci.com so we can enable signups for your workspace.',
      shouldReport: true,
    };
  }

  // SMTP/confirmation email failures
  if (
    message.includes('confirmation email') ||
    message.includes('smtp') ||
    message.includes('authentication failed') ||
    message.includes('535')
  ) {
    return {
      friendlyMessage:
        "We couldn't send the confirmation email right now. Please try again in a few minutes or contact support@wathaci.com.",
      errorCode: 'EMAIL_DELIVERY_FAILED',
      originalMessage: error.message,
      category: 'network',
      suggestedAction: 'Retry later or reach out to support if the issue continues.',
      shouldReport: true,
    };
  }

  // Explicit Supabase rate limiting
  if (status === 429 || code === '429' || message.includes('rate limit')) {
    return {
      friendlyMessage: 'Too many signup attempts. Please wait a few minutes before trying again.',
      errorCode: 'SIGNUP_RATE_LIMITED',
      originalMessage: error.message,
      category: 'validation',
      suggestedAction: 'Pause for a few minutes, then try signing up once. Contact support if the issue persists.',
      shouldReport: false,
    };
  }

  // Backend/network outages
  if (status && status >= 500) {
    return {
      friendlyMessage: 'Our authentication service is temporarily unavailable. Please try again shortly.',
      errorCode: 'AUTH_SERVICE_UNAVAILABLE',
      originalMessage: error.message,
      category: 'network',
      suggestedAction: 'Retry in a few minutes. If the problem continues, contact support@wathaci.com.',
      shouldReport: true,
    };
  }

  // Email already registered
  if (message.includes('user already registered') || message.includes('duplicate key')) {
    return {
      friendlyMessage: 'An account with this email already exists. Please sign in instead.',
      errorCode: 'EMAIL_ALREADY_EXISTS',
      originalMessage: error.message,
      category: 'validation',
      suggestedAction: 'Try signing in or use a different email address.',
      shouldReport: false,
    };
  }

  // Invalid email format
  if (message.includes('invalid email') || message.includes('email format')) {
    return {
      friendlyMessage: 'Please enter a valid email address.',
      errorCode: 'INVALID_EMAIL',
      originalMessage: error.message,
      category: 'validation',
      shouldReport: false,
    };
  }

  // Weak password
  if (message.includes('password') && (message.includes('weak') || message.includes('short') || message.includes('minimum'))) {
    return {
      friendlyMessage: 'Password must be at least 8 characters long.',
      errorCode: 'WEAK_PASSWORD',
      originalMessage: error.message,
      category: 'validation',
      shouldReport: false,
    };
  }

  // Database errors
  if (
    message.includes('database error') ||
    message.includes('unique constraint') ||
    message.includes('violates') ||
    message.includes('null value') ||
    message.includes('foreign key')
  ) {
    return {
      friendlyMessage: 'We\'re having trouble creating your account right now. Please try again or contact support.',
      errorCode: 'DATABASE_ERROR',
      originalMessage: error.message,
      category: 'database',
      suggestedAction: 'Please try again in a few moments. If the problem persists, contact support@wathaci.com',
      shouldReport: true,
    };
  }

  // Row-level security errors
  if (message.includes('row-level security') || message.includes('rls') || message.includes('policy')) {
    return {
      friendlyMessage: 'We\'re having trouble creating your account right now. Please try again or contact support.',
      errorCode: 'RLS_POLICY_ERROR',
      originalMessage: error.message,
      category: 'database',
      suggestedAction: 'Please contact support@wathaci.com for assistance.',
      shouldReport: true,
    };
  }

  // Network/timeout errors
  if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
    return {
      friendlyMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
      errorCode: 'NETWORK_ERROR',
      originalMessage: error.message,
      category: 'network',
      shouldReport: false,
    };
  }

  // Rate limiting and blocked signups
  if (
    message.includes('rate limit') || 
    message.includes('too many requests') ||
    message.includes('too many signups') ||
    message.includes('email rate limit') ||
    message.includes('for security purposes, you can only request this once')
  ) {
    return {
      friendlyMessage: 'Too many signup attempts detected. Please wait 5-10 minutes before trying again.',
      errorCode: 'SIGNUP_RATE_LIMITED',
      originalMessage: error.message,
      category: 'validation',
      suggestedAction: 'Wait at least 5-10 minutes, then try signing up again. If you already have an account, try signing in instead.',
      shouldReport: false,
    };
  }

  // Blocked by abuse protection
  if (message.includes('blocked') || message.includes('abuse protection') || message.includes('spam detection')) {
    return {
      friendlyMessage: 'Your signup attempt has been temporarily blocked for security reasons.',
      errorCode: 'SIGNUP_BLOCKED',
      originalMessage: error.message,
      category: 'validation',
      suggestedAction: 'Please wait 10-15 minutes and try again. If the issue persists, contact support@wathaci.com',
      shouldReport: true, // We want to know about these to investigate
    };
  }

  // Default auth error
  return {
    friendlyMessage: 'Unable to create your account. Please check your information and try again.',
    errorCode: 'AUTH_ERROR',
    originalMessage: error.message,
    category: 'auth',
    shouldReport: true,
  };
}

/**
 * Parse generic Error
 */
function parseGenericError(error: Error): DetailedAuthError {
  const message = error.message.toLowerCase();

  if (message.includes('network') || message.includes('fetch')) {
    return {
      friendlyMessage: 'Unable to connect to the server. Please check your internet connection.',
      errorCode: 'NETWORK_ERROR',
      originalMessage: error.message,
      category: 'network',
      shouldReport: false,
    };
  }

  return {
    friendlyMessage: 'An unexpected error occurred. Please try again.',
    errorCode: 'GENERIC_ERROR',
    originalMessage: error.message,
    category: 'unknown',
    shouldReport: true,
  };
}

/**
 * Parse string error
 */
function parseStringError(error: string): DetailedAuthError {
  const message = error.toLowerCase();

  if (message.includes('database')) {
    return {
      friendlyMessage: 'We\'re having trouble creating your account. Please try again or contact support.',
      errorCode: 'DATABASE_ERROR_STRING',
      originalMessage: error,
      category: 'database',
      shouldReport: true,
    };
  }

  return {
    friendlyMessage: error,
    errorCode: 'STRING_ERROR',
    originalMessage: error,
    category: 'unknown',
    shouldReport: false,
  };
}

/**
 * Log error to console with detailed context (development only)
 */
export function logAuthError(
  context: string,
  error: unknown,
  additionalData?: Record<string, unknown>
): void {
  // Only log in development
  const isDev =
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

  if (!isDev || typeof console === 'undefined') {
    return;
  }

  const parsedError = parseAuthError(error);

  console.groupCollapsed(`🔒 [Auth Error] ${context}`);
  console.error('Error Category:', parsedError.category);
  console.error('Error Code:', parsedError.errorCode);
  console.error('User Message:', parsedError.friendlyMessage);

  if (parsedError.originalMessage) {
    console.error('Original Message:', parsedError.originalMessage);
  }

  if (parsedError.suggestedAction) {
    console.info('Suggested Action:', parsedError.suggestedAction);
  }

  if (additionalData) {
    console.error('Additional Context:', additionalData);
  }

  console.error('Full Error Object:', error);
  console.groupEnd();
}

/**
 * Format error for backend reporting
 */
export function formatErrorForReporting(
  context: string,
  error: unknown,
  userId?: string
): {
  context: string;
  errorCode: string;
  category: string;
  message: string;
  userId?: string;
  timestamp: string;
  userAgent?: string;
} {
  const parsedError = parseAuthError(error);

  return {
    context,
    errorCode: parsedError.errorCode,
    category: parsedError.category,
    message: parsedError.originalMessage || parsedError.friendlyMessage,
    userId,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
}

/**
 * Get user-friendly error message from any error
 */
export function getUserFriendlyMessage(error: unknown): string {
  return parseAuthError(error).friendlyMessage;
}

/**
 * Check if error should be reported to backend
 */
export function shouldReportError(error: unknown): boolean {
  return parseAuthError(error).shouldReport;
}
