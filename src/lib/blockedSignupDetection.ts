/**
 * Blocked Signup Detection and Management Utilities
 * 
 * Provides client-side utilities for detecting and handling blocked/rate-limited
 * signup attempts, preventing user frustration and duplicate submissions.
 */

import { supabaseClient } from './supabaseClient';
import { parseAuthError } from './authErrorHandler';

export interface BlockedSignupStatus {
  isBlocked: boolean;
  lastAttemptTime: number | null;
  attemptCount: number;
  canRetryAt: number | null;
  minutesUntilRetry: number | null;
}

// Local storage keys
const SIGNUP_ATTEMPTS_KEY = 'wathaci_signup_attempts';
const LAST_SIGNUP_ATTEMPT_KEY = 'wathaci_last_signup_attempt';
const BLOCKED_UNTIL_KEY = 'wathaci_blocked_until';

// Configuration
const MAX_ATTEMPTS_BEFORE_WARNING = 2;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const COOLDOWN_PERIOD_MS = 60 * 1000; // 1 minute between attempts
const RATE_LIMIT_DURATION_MS = 60 * 60 * 1000; // 1 hour typical rate limit

/**
 * Record a signup attempt (to track client-side rate limiting)
 * Note: Stores email in localStorage for rate limiting. Emails are not encrypted
 * as they are considered non-sensitive for this use case and are cleared after successful signup.
 */
export function recordSignupAttempt(email: string): void {
  const now = Date.now();
  
  // Update last attempt time
  localStorage.setItem(LAST_SIGNUP_ATTEMPT_KEY, now.toString());
  
  // Get existing attempts
  const attemptsData = localStorage.getItem(SIGNUP_ATTEMPTS_KEY);
  let attempts: Array<{ email: string; timestamp: number }> = [];
  
  if (attemptsData) {
    try {
      attempts = JSON.parse(attemptsData);
      // Filter out old attempts (outside the window)
      attempts = attempts.filter(
        (attempt) => now - attempt.timestamp < ATTEMPT_WINDOW_MS
      );
    } catch {
      attempts = [];
    }
  }
  
  // Add new attempt (store only lowercase email to reduce duplication)
  attempts.push({ email: email.toLowerCase(), timestamp: now });
  
  // Store updated attempts
  localStorage.setItem(SIGNUP_ATTEMPTS_KEY, JSON.stringify(attempts));
}

/**
 * Get the client-side blocked/rate-limited status
 */
export function getClientBlockedStatus(email?: string): BlockedSignupStatus {
  const now = Date.now();
  
  // Check if explicitly blocked until a certain time
  const blockedUntilStr = localStorage.getItem(BLOCKED_UNTIL_KEY);
  if (blockedUntilStr) {
    const blockedUntil = parseInt(blockedUntilStr, 10);
    if (blockedUntil > now) {
      return {
        isBlocked: true,
        lastAttemptTime: null,
        attemptCount: 0,
        canRetryAt: blockedUntil,
        minutesUntilRetry: Math.ceil((blockedUntil - now) / 60000),
      };
    } else {
      // Expired, clear it
      localStorage.removeItem(BLOCKED_UNTIL_KEY);
    }
  }
  
  // Check last attempt time for cooldown
  const lastAttemptStr = localStorage.getItem(LAST_SIGNUP_ATTEMPT_KEY);
  const lastAttemptTime = lastAttemptStr ? parseInt(lastAttemptStr, 10) : null;
  
  if (lastAttemptTime && now - lastAttemptTime < COOLDOWN_PERIOD_MS) {
    const canRetryAt = lastAttemptTime + COOLDOWN_PERIOD_MS;
    return {
      isBlocked: true,
      lastAttemptTime,
      attemptCount: 1,
      canRetryAt,
      minutesUntilRetry: Math.ceil((canRetryAt - now) / 60000),
    };
  }
  
  // Check attempt count in window
  const attemptsData = localStorage.getItem(SIGNUP_ATTEMPTS_KEY);
  if (attemptsData && email) {
    try {
      const attempts: Array<{ email: string; timestamp: number }> = JSON.parse(attemptsData);
      // Filter for this email within the window
      const recentAttempts = attempts.filter(
        (attempt) =>
          attempt.email === email && now - attempt.timestamp < ATTEMPT_WINDOW_MS
      );
      
      if (recentAttempts.length >= MAX_ATTEMPTS_BEFORE_WARNING) {
        return {
          isBlocked: false, // Warning, not hard block
          lastAttemptTime: recentAttempts[recentAttempts.length - 1].timestamp,
          attemptCount: recentAttempts.length,
          canRetryAt: null,
          minutesUntilRetry: null,
        };
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  return {
    isBlocked: false,
    lastAttemptTime,
    attemptCount: 0,
    canRetryAt: null,
    minutesUntilRetry: null,
  };
}

/**
 * Mark an email as blocked (after receiving rate limit error from server)
 */
export function markAsBlocked(durationMs: number = RATE_LIMIT_DURATION_MS): void {
  const blockedUntil = Date.now() + durationMs;
  localStorage.setItem(BLOCKED_UNTIL_KEY, blockedUntil.toString());
}

/**
 * Clear all signup attempt tracking (e.g., after successful signup)
 */
export function clearSignupAttempts(): void {
  localStorage.removeItem(SIGNUP_ATTEMPTS_KEY);
  localStorage.removeItem(LAST_SIGNUP_ATTEMPT_KEY);
  localStorage.removeItem(BLOCKED_UNTIL_KEY);
}

/**
 * Check if error indicates a blocked/rate-limited signup
 */
export function isBlockedError(error: unknown): boolean {
  const parsed = parseAuthError(error);
  return (
    parsed.errorCode === 'SIGNUP_RATE_LIMITED' ||
    parsed.errorCode === 'SIGNUP_BLOCKED' ||
    parsed.errorCode === 'RATE_LIMITED'
  );
}

/**
 * Get a user-friendly message for blocked status
 */
export function getBlockedMessage(status: BlockedSignupStatus): string {
  if (!status.isBlocked && status.attemptCount === 0) {
    return '';
  }
  
  if (status.canRetryAt && status.minutesUntilRetry) {
    if (status.minutesUntilRetry > 60) {
      const hours = Math.ceil(status.minutesUntilRetry / 60);
      return `Too many signup attempts. Please wait ${hours} hour${hours > 1 ? 's' : ''} before trying again.`;
    }
    return `Too many signup attempts. Please wait ${status.minutesUntilRetry} minute${status.minutesUntilRetry > 1 ? 's' : ''} before trying again.`;
  }
  
  if (status.attemptCount >= MAX_ATTEMPTS_BEFORE_WARNING) {
    return `You've attempted to sign up ${status.attemptCount} times recently. If you're having trouble, please contact support@wathaci.com`;
  }
  
  return '';
}

/**
 * Check if an email is rate-limited on the server (requires authentication)
 */
export async function checkServerRateLimitStatus(
  email: string
): Promise<{ isRateLimited: boolean; error?: string }> {
  try {
    const { data, error } = await supabaseClient.rpc('is_email_rate_limited', {
      p_email: email,
      p_lookback_hours: 2,
    });
    
    if (error) {
      console.error('Error checking rate limit status:', error);
      return { isRateLimited: false, error: error.message };
    }
    
    return { isRateLimited: data === true };
  } catch (err) {
    console.error('Exception checking rate limit status:', err);
    return { isRateLimited: false, error: String(err) };
  }
}

/**
 * Format a retry time as a human-readable string
 */
export function formatRetryTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get detailed blocked attempt history for an email (admin/debug use)
 */
export async function getBlockedAttemptHistory(
  email: string
): Promise<{ data: any[] | null; error?: string }> {
  try {
    const { data, error } = await supabaseClient.rpc(
      'get_blocked_attempts_for_email',
      {
        p_email: email,
        p_limit: 20,
      }
    );
    
    if (error) {
      return { data: null, error: error.message };
    }
    
    return { data };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

/**
 * React hook for managing signup attempt tracking
 */
export function useSignupAttemptTracking(email?: string) {
  const status = getClientBlockedStatus(email);
  
  const recordAttempt = () => {
    if (email) {
      recordSignupAttempt(email);
    }
  };
  
  const clearAttempts = () => {
    clearSignupAttempts();
  };
  
  const markBlocked = (durationMs?: number) => {
    markAsBlocked(durationMs);
  };
  
  return {
    status,
    recordAttempt,
    clearAttempts,
    markBlocked,
    isBlocked: status.isBlocked,
    canRetry: !status.isBlocked || (status.canRetryAt && status.canRetryAt <= Date.now()),
    blockedMessage: getBlockedMessage(status),
  };
}
