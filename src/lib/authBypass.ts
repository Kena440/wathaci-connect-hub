// TEMPORARY BYPASS MODE: remove after auth errors are fixed
/**
 * Auth Bypass Mode Utilities
 * 
 * This module provides utilities for a temporary "bypass / fallback onboarding mode"
 * that allows users to sign up, sign in, and create profiles even when backend/auth/database
 * errors occur.
 * 
 * This is STRICTLY a development/debugging feature and should be removed once auth issues
 * are resolved in production.
 */

import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User, Profile } from '@/@types/database';

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Check if auth bypass mode is enabled.
 * Reads from environment variables:
 * - Client/Browser: VITE_AUTH_BYPASS_MODE_ENABLED
 * - Server: AUTH_BYPASS_MODE_ENABLED
 */
export const isAuthBypassEnabled = (): boolean => {
  // Check browser/client environment (Vite)
  if (typeof import.meta !== 'undefined') {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv?.VITE_AUTH_BYPASS_MODE_ENABLED === 'true') {
      return true;
    }
  }

  // Check Node.js/server environment
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.AUTH_BYPASS_MODE_ENABLED === 'true') {
      return true;
    }
  }

  return false;
};

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * Extended user type that includes bypass mode indicator
 */
export interface BypassUser extends User {
  isBypassUser: true;
  bypassCreatedAt: string;
}

/**
 * Extended profile type that includes bypass mode indicator
 */
export interface BypassProfile extends Profile {
  isBypassProfile: true;
  bypassCreatedAt: string;
}

/**
 * Bypass session data structure
 */
export interface BypassSession {
  user: BypassUser;
  profile: BypassProfile | null;
  createdAt: string;
}

// ============================================================================
// LocalStorage Keys
// ============================================================================

const BYPASS_USER_KEY = 'auth_bypass_current_user';
const BYPASS_PROFILE_KEY_PREFIX = 'auth_bypass_profile_';

// ============================================================================
// Bypass User Management
// ============================================================================

/**
 * Generate a temporary user ID
 */
export const generateTempUserId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 11);
  return `temp_${timestamp}_${random}`;
};

/**
 * Create a bypass user object from minimal data
 */
export const createBypassUser = (email: string, additionalData?: Partial<User>): BypassUser => {
  const now = new Date().toISOString();
  return {
    id: generateTempUserId(),
    email,
    isBypassUser: true,
    bypassCreatedAt: now,
    created_at: now,
    updated_at: now,
    profile_completed: false,
    ...additionalData,
  } as BypassUser;
};

/**
 * Create a bypass profile object from minimal data
 */
export const createBypassProfile = (
  userId: string,
  email: string,
  additionalData?: Partial<Profile>
): BypassProfile => {
  const now = new Date().toISOString();
  return {
    id: userId,
    email,
    isBypassProfile: true,
    bypassCreatedAt: now,
    created_at: now,
    updated_at: now,
    profile_completed: false,
    ...additionalData,
  } as BypassProfile;
};

/**
 * Check if a user is a bypass user
 */
export const isBypassUser = (user: any): user is BypassUser => {
  return user && typeof user === 'object' && user.isBypassUser === true;
};

/**
 * Check if a profile is a bypass profile
 */
export const isBypassProfile = (profile: any): profile is BypassProfile => {
  return profile && typeof profile === 'object' && profile.isBypassProfile === true;
};

// ============================================================================
// LocalStorage Helpers
// ============================================================================

/**
 * Save bypass user to localStorage
 */
export const saveBypassUser = (user: BypassUser): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const data = JSON.stringify(user);
    window.localStorage.setItem(BYPASS_USER_KEY, data);
    console.log('[AUTH_BYPASS_STORAGE] Saved bypass user to localStorage', {
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('[AUTH_BYPASS_STORAGE] Failed to save bypass user', error);
  }
};

/**
 * Load bypass user from localStorage
 */
export const loadBypassUser = (): BypassUser | null => {
  if (typeof window === 'undefined') return null;

  try {
    const data = window.localStorage.getItem(BYPASS_USER_KEY);
    if (!data) return null;

    const user = JSON.parse(data) as BypassUser;
    
    // Validate it's actually a bypass user
    if (!isBypassUser(user)) {
      console.warn('[AUTH_BYPASS_STORAGE] Invalid bypass user data, clearing');
      clearBypassUser();
      return null;
    }

    return user;
  } catch (error) {
    console.error('[AUTH_BYPASS_STORAGE] Failed to load bypass user', error);
    return null;
  }
};

/**
 * Find bypass user by email
 */
export const findBypassUserByEmail = (email: string): BypassUser | null => {
  const user = loadBypassUser();
  if (!user) return null;
  
  const normalizedEmail = email.trim().toLowerCase();
  const userEmail = user.email?.trim().toLowerCase();
  
  return userEmail === normalizedEmail ? user : null;
};

/**
 * Clear bypass user from localStorage
 */
export const clearBypassUser = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(BYPASS_USER_KEY);
    console.log('[AUTH_BYPASS_STORAGE] Cleared bypass user from localStorage');
  } catch (error) {
    console.error('[AUTH_BYPASS_STORAGE] Failed to clear bypass user', error);
  }
};

/**
 * Save bypass profile to localStorage
 */
export const saveBypassProfile = (profile: BypassProfile): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${BYPASS_PROFILE_KEY_PREFIX}${profile.id}`;
    const data = JSON.stringify(profile);
    window.localStorage.setItem(key, data);
    console.log('[AUTH_BYPASS_STORAGE] Saved bypass profile to localStorage', {
      userId: profile.id,
      email: profile.email,
    });
  } catch (error) {
    console.error('[AUTH_BYPASS_STORAGE] Failed to save bypass profile', error);
  }
};

/**
 * Load bypass profile from localStorage
 */
export const loadBypassProfile = (userId: string): BypassProfile | null => {
  if (typeof window === 'undefined') return null;

  try {
    const key = `${BYPASS_PROFILE_KEY_PREFIX}${userId}`;
    const data = window.localStorage.getItem(key);
    if (!data) return null;

    const profile = JSON.parse(data) as BypassProfile;
    
    // Validate it's actually a bypass profile
    if (!isBypassProfile(profile)) {
      console.warn('[AUTH_BYPASS_STORAGE] Invalid bypass profile data, clearing');
      clearBypassProfile(userId);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('[AUTH_BYPASS_STORAGE] Failed to load bypass profile', error);
    return null;
  }
};

/**
 * Clear bypass profile from localStorage
 */
export const clearBypassProfile = (userId: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${BYPASS_PROFILE_KEY_PREFIX}${userId}`;
    window.localStorage.removeItem(key);
    console.log('[AUTH_BYPASS_STORAGE] Cleared bypass profile from localStorage', { userId });
  } catch (error) {
    console.error('[AUTH_BYPASS_STORAGE] Failed to clear bypass profile', error);
  }
};

/**
 * Clear all bypass data from localStorage
 */
export const clearAllBypassData = (): void => {
  if (typeof window === 'undefined') return;
  
  clearBypassUser();
  
  // Clear all profile keys
  try {
    const keys = Object.keys(window.localStorage);
    keys.forEach(key => {
      if (key.startsWith(BYPASS_PROFILE_KEY_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    });
    console.log('[AUTH_BYPASS_STORAGE] Cleared all bypass data from localStorage');
  } catch (error) {
    console.error('[AUTH_BYPASS_STORAGE] Failed to clear all bypass data', error);
  }
};

// ============================================================================
// Logging Helpers
// ============================================================================

/**
 * Log a bypass-related error with consistent formatting
 */
export const logBypassError = (
  context: string,
  error: unknown,
  metadata?: Record<string, any>
): void => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error(`[AUTH_BYPASS_${context.toUpperCase()}]`, {
    message: errorMessage,
    stack: errorStack,
    ...metadata,
  });
};

/**
 * Log a bypass-related operation with consistent formatting
 */
export const logBypassOperation = (
  context: string,
  message: string,
  metadata?: Record<string, any>
): void => {
  console.log(`[AUTH_BYPASS_${context.toUpperCase()}]`, message, metadata || {});
};
