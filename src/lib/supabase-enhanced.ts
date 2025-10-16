/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const env = typeof import.meta !== 'undefined' ? import.meta.env : {};

const supabaseUrl = env?.VITE_SUPABASE_URL || process.env?.VITE_SUPABASE_URL || '';
const supabaseKey = env?.VITE_SUPABASE_KEY || process.env?.VITE_SUPABASE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const createSupabaseStub = () => {
  const missingVars = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseKey && 'VITE_SUPABASE_KEY'
  ].filter(Boolean);

  const message = missingVars.length
    ? `Supabase client is not configured. Missing environment variable${missingVars.length > 1 ? 's' : ''}: ${missingVars.join(', ')}`
    : 'Supabase client is not configured.';

  const thrower = () => {
    throw new Error(message);
  };

  return new Proxy({} as Record<string, any>, {
    get: (_, prop) => {
      if (prop === 'auth') {
        return {
          signInWithPassword: thrower,
          signUp: thrower,
          signOut: thrower,
          getUser: thrower,
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => void 0 } } }),
        };
      }

      return thrower;
    },
  });
};

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) : createSupabaseStub();

// Simple error handling wrapper
export const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const result = await operation();
    
    if (result.error) {
      console.error(`Error in ${context}:`, result.error);
      return { data: null, error: new Error(result.error.message) };
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error(`Exception in ${context}:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: new Error(message) };
  }
};