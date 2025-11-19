/**
 * Frontend Auth Integration Examples
 * 
 * This file demonstrates how to integrate Supabase auth with the frontend.
 * All functions are type-safe using the TypeScript definitions from supabase.types.ts
 */

import { supabase } from '@/lib/supabaseClient';
import type {
  Profile,
  ProfileUpdate,
  AccountType,
  SignUpForm,
  SignInForm,
  AuthUser,
  Session
} from '@/@types/supabase.types';

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

/**
 * Sign up a new user with email and password
 * 
 * @param form - Sign up form data
 * @returns The created user session
 * @throws Error if sign up fails
 * 
 * @example
 * const session = await signUp({
 *   email: 'user@example.com',
 *   password: 'securePassword123',
 *   full_name: 'John Doe',
 *   account_type: 'SME'
 * });
 */
export async function signUp(form: SignUpForm) {
  const { data, error } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: {
      data: {
        full_name: form.full_name,
        account_type: form.account_type || 'sole_proprietor',
      },
    },
  });

  if (error) {
    throw new Error(`Sign up failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Sign up succeeded but no user returned');
  }

  return data;
}

/**
 * Sign in an existing user with email and password
 * 
 * @param form - Sign in form data
 * @returns The user session
 * @throws Error if sign in fails
 * 
 * @example
 * const session = await signIn({
 *   email: 'user@example.com',
 *   password: 'securePassword123'
 * });
 */
export async function signIn(form: SignInForm) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  });

  if (error) {
    throw new Error(`Sign in failed: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('Sign in succeeded but no user returned');
  }

  return data;
}

/**
 * Sign out the current user
 * 
 * @throws Error if sign out fails
 * 
 * @example
 * await signOut();
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(`Sign out failed: ${error.message}`);
  }
}

/**
 * Get the currently authenticated user
 * 
 * @returns The current user or null if not authenticated
 * @throws Error if request fails
 * 
 * @example
 * const user = await getCurrentUser();
 * if (user) {
 *   console.log('Logged in as:', user.email);
 * }
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return user;
}

/**
 * Get the current session
 * 
 * @returns The current session or null if not authenticated
 * @throws Error if request fails
 * 
 * @example
 * const session = await getSession();
 * if (session) {
 *   console.log('Session expires at:', new Date(session.expires_at * 1000));
 * }
 */
export async function getSession(): Promise<Session | null> {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to get session: ${error.message}`);
  }

  return session;
}

/**
 * Request a password reset email
 * 
 * @param email - User's email address
 * @throws Error if request fails
 * 
 * @example
 * await requestPasswordReset('user@example.com');
 */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(`Password reset request failed: ${error.message}`);
  }
}

/**
 * Update user's password
 * 
 * @param newPassword - New password
 * @throws Error if update fails
 * 
 * @example
 * await updatePassword('newSecurePassword123');
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(`Password update failed: ${error.message}`);
  }
}

// ============================================================================
// PROFILE FUNCTIONS
// ============================================================================

/**
 * Get the current user's profile
 * 
 * @returns The user's profile or null if not found
 * @throws Error if request fails
 * 
 * @example
 * const profile = await getCurrentProfile();
 * if (profile) {
 *   console.log('Profile type:', profile.account_type);
 * }
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null;
    }
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  return data;
}

/**
 * Get a profile by user ID (requires appropriate RLS permissions)
 * 
 * @param userId - User ID to fetch
 * @returns The user's profile or null if not found
 * @throws Error if request fails
 * 
 * @example
 * const profile = await getProfileById('user-uuid');
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  return data;
}

/**
 * Update the current user's profile
 * 
 * @param updates - Profile fields to update
 * @returns The updated profile
 * @throws Error if update fails
 * 
 * @example
 * const updated = await updateCurrentProfile({
 *   first_name: 'John',
 *   last_name: 'Doe',
 *   phone: '+1234567890',
 *   profile_completed: true
 * });
 */
export async function updateCurrentProfile(updates: ProfileUpdate): Promise<Profile> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

/**
 * Update a profile by user ID (requires service role or admin permissions)
 * 
 * @param userId - User ID to update
 * @param updates - Profile fields to update
 * @returns The updated profile
 * @throws Error if update fails
 * 
 * @example
 * const updated = await updateProfileById('user-uuid', {
 *   profile_completed: true
 * });
 */
export async function updateProfileById(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

// ============================================================================
// SUBSCRIPTION FUNCTIONS
// ============================================================================

/**
 * Get all available subscription plans
 * 
 * @returns Array of subscription plans
 * @throws Error if request fails
 * 
 * @example
 * const plans = await getSubscriptionPlans();
 * const popularPlan = plans.find(p => p.popular);
 */
export async function getSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('lenco_amount', { ascending: true });

  if (error) {
    throw new Error(`Failed to get subscription plans: ${error.message}`);
  }

  return data;
}

/**
 * Get the current user's active subscriptions
 * 
 * @returns Array of user subscriptions with plan details
 * @throws Error if request fails
 * 
 * @example
 * const subscriptions = await getCurrentUserSubscriptions();
 * const activeSubscription = subscriptions.find(s => s.status === 'active');
 */
export async function getCurrentUserSubscriptions() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get subscriptions: ${error.message}`);
  }

  return data;
}

// ============================================================================
// AUDIT LOG FUNCTIONS
// ============================================================================

/**
 * Get the current user's audit logs
 * 
 * @param options - Query options
 * @returns Array of audit logs
 * @throws Error if request fails
 * 
 * @example
 * const logs = await getMyAuditLogs({ limit: 50, actionType: 'update' });
 */
export async function getMyAuditLogs(options?: {
  limit?: number;
  actionType?: string;
  tableName?: string;
}) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('No authenticated user');
  }

  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.actionType) {
    query = query.eq('action_type', options.actionType);
  }

  if (options?.tableName) {
    query = query.eq('table_name', options.tableName);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }

  return data;
}

// ============================================================================
// ERROR HANDLING HELPER
// ============================================================================

/**
 * Parse and format Supabase errors into user-friendly messages
 * 
 * @param error - The error from Supabase
 * @returns User-friendly error message
 * 
 * @example
 * try {
 *   await signIn(formData);
 * } catch (error) {
 *   const message = handleSupabaseError(error);
 *   toast.error(message);
 * }
 */
export function handleSupabaseError(error: any): string {
  if (error.message) {
    // Parse common Supabase errors
    if (error.message.includes('JWT') || error.message.includes('token')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return 'This email is already registered.';
    }
    if (error.message.includes('violates') || error.message.includes('constraint')) {
      return 'Invalid data provided. Please check your input.';
    }
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password.';
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Please confirm your email address before signing in.';
    }
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

// ============================================================================
// AUTH STATE LISTENER
// ============================================================================

/**
 * Listen to auth state changes
 * 
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 * 
 * @example
 * const unsubscribe = onAuthStateChange((event, session) => {
 *   console.log('Auth event:', event);
 *   if (session) {
 *     console.log('User:', session.user.email);
 *   }
 * });
 * 
 * // Later, to unsubscribe:
 * unsubscribe();
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );

  return () => subscription.unsubscribe();
}
