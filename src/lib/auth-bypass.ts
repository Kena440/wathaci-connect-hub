import type { Profile, User } from '@/@types/database';

/**
 * ⚠️ SECURITY WARNING - TEMPORARY AUTH BYPASS MODE ⚠️
 * 
 * This module implements a TEMPORARY authentication bypass mechanism for onboarding/testing purposes.
 * It stores sensitive user data (emails, user IDs) in browser localStorage WITHOUT ENCRYPTION.
 * 
 * CRITICAL SECURITY IMPLICATIONS:
 * - localStorage is accessible to ALL scripts running on the same origin (XSS vulnerability)
 * - Data persists across browser sessions, increasing exposure window
 * - No encryption means data is stored in plain text
 * - localStorage data can be accessed via browser DevTools
 * - Data survives page refreshes and browser restarts
 * - Cross-site scripting (XSS) attacks can steal all stored data
 * 
 * THIS SHOULD ONLY BE USED IN:
 * - Development environments
 * - Controlled testing scenarios
 * - Onboarding flows where users understand the risks
 * 
 * DO NOT USE IN PRODUCTION WITH REAL USER DATA.
 * Remove this code before production deployment or implement proper encryption.
 * 
 * For production use, consider:
 * - Implementing encryption for localStorage data
 * - Using secure HTTP-only cookies
 * - Using sessionStorage for shorter-lived data
 * - Implementing Content Security Policy (CSP)
 * - Regular security audits and XSS prevention measures
 */

const BYPASS_USER_KEY = 'auth_bypass_current_user';
const BYPASS_USER_BY_EMAIL_PREFIX = 'auth_bypass_user_';
const BYPASS_PROFILE_PREFIX = 'auth_bypass_profile_';

const getRuntimeEnvValue = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && key in (import.meta as any).env) {
    return String((import.meta as any).env[key]);
  }

  if (typeof process !== 'undefined' && typeof process.env === 'object') {
    return process.env[key];
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).__APP_ENV__ && key in (globalThis as any).__APP_ENV__) {
    return String((globalThis as any).__APP_ENV__[key]);
  }

  return undefined;
};

const normalizeBoolean = (value: string | undefined): boolean => {
  if (typeof value !== 'string') return false;
  return value.trim().toLowerCase() === 'true';
};

export const isAuthBypassEnabled = (): boolean => {
  const browserFlag = getRuntimeEnvValue('NEXT_PUBLIC_AUTH_BYPASS_MODE_ENABLED')
    ?? getRuntimeEnvValue('VITE_AUTH_BYPASS_MODE_ENABLED');
  const serverFlag = getRuntimeEnvValue('AUTH_BYPASS_MODE_ENABLED');

  return normalizeBoolean(typeof window === 'undefined' ? serverFlag : browserFlag ?? serverFlag);
};

export type BypassUser = User & {
  isBypassUser: true;
  createdAt: string;
};

export type BypassProfile = Partial<Profile> & {
  isBypassProfile?: boolean;
  updatedAt?: string;
};

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * ⚠️ SECURITY WARNING: Stores data in UNENCRYPTED localStorage.
 * Data is accessible to any script on the same origin and persists across sessions.
 * Only use in development/testing environments.
 */
const storageSafeSet = (key: string, value: unknown) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('[AUTH_BYPASS_FALLBACK] Failed to persist data', { key, error });
  }
};

const storageSafeGet = <T>(key: string): T | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error('[AUTH_BYPASS_FALLBACK] Failed to read data', { key, error });
    return null;
  }
};

const storageSafeRemove = (key: string) => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('[AUTH_BYPASS_FALLBACK] Failed to remove data', { key, error });
  }
};

const buildUserKey = (email: string) => `${BYPASS_USER_BY_EMAIL_PREFIX}${email.toLowerCase()}`;
const buildProfileKey = (userId: string) => `${BYPASS_PROFILE_PREFIX}${userId}`;

export const createBypassUser = (email: string): BypassUser => {
  const id = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return {
    id,
    email,
    isBypassUser: true,
    createdAt: new Date().toISOString(),
    profile_completed: false,
    user_metadata: {
      isBypassUser: true,
      bypassCreatedAt: new Date().toISOString(),
    },
  };
};

/**
 * ⚠️ SECURITY WARNING: Stores user data including email and user ID in UNENCRYPTED localStorage.
 * 
 * RISKS:
 * - Email addresses stored in plain text
 * - User IDs stored in plain text
 * - Vulnerable to XSS attacks
 * - Data persists across sessions
 * - Accessible via browser DevTools
 * 
 * This is acceptable ONLY for temporary development/testing purposes.
 * DO NOT use with real user data in production.
 */
export const saveBypassUser = (user: BypassUser) => {
  const normalizedEmail = user.email.toLowerCase();
  storageSafeSet(BYPASS_USER_KEY, normalizedEmail);
  storageSafeSet(buildUserKey(normalizedEmail), { ...user, email: normalizedEmail });
};

export const loadBypassUser = (email?: string): BypassUser | null => {
  const normalizedEmail = email?.toLowerCase() ?? storageSafeGet<string>(BYPASS_USER_KEY) ?? undefined;
  if (!normalizedEmail) return null;
  return storageSafeGet<BypassUser>(buildUserKey(normalizedEmail));
};

export const clearBypassUser = () => {
  const lastEmail = storageSafeGet<string>(BYPASS_USER_KEY);
  if (lastEmail) {
    const user = storageSafeGet<BypassUser>(buildUserKey(lastEmail));
    storageSafeRemove(buildUserKey(lastEmail));
    if (user && user.id) {
      storageSafeRemove(buildProfileKey(user.id));
    }
  }
  storageSafeRemove(BYPASS_USER_KEY);
};

/**
 * ⚠️ SECURITY WARNING: Stores profile data in UNENCRYPTED localStorage.
 * 
 * Profile data may contain sensitive personal information.
 * This storage method is vulnerable to XSS attacks and data exposure.
 * Only use in development/testing environments.
 */
export const saveBypassProfile = (userId: string, profile: BypassProfile) => {
  const payload: BypassProfile = {
    ...profile,
    isBypassProfile: true,
    updatedAt: new Date().toISOString(),
  };
  storageSafeSet(buildProfileKey(userId), payload);
};

export const loadBypassProfile = (userId: string): BypassProfile | null => {
  return storageSafeGet<BypassProfile>(buildProfileKey(userId));
};
