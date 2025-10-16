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

/**
 * Test basic connectivity to Supabase
 * @returns Promise resolving to true if connection is successful, false otherwise
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

// Enhanced error handling wrapper with network error detection
export const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const result = await operation();
    
    if (result.error) {
      console.error(`Error in ${context}:`, result.error);
      
      // Check for common network/connection errors
      const errorMessage = result.error.message || '';
      
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ECONNREFUSED')) {
        return { 
          data: null, 
          error: new Error('Unable to connect to the server. Please check your internet connection and try again.') 
        };
      }
      
      if (errorMessage.includes('Invalid API key') || 
          errorMessage.includes('Invalid Supabase URL')) {
        return { 
          data: null, 
          error: new Error('Configuration error. Please contact support.') 
        };
      }
      
      // For authentication-specific errors, provide better messages
      if (context.includes('signIn') || context.includes('signUp')) {
        if (errorMessage.includes('Invalid login credentials') || 
            errorMessage.includes('invalid_grant')) {
          return { data: null, error: new Error('Invalid email or password. Please try again.') };
        }
        
        if (errorMessage.includes('User already registered') || 
            errorMessage.includes('already exists')) {
          return { data: null, error: new Error('An account with this email already exists. Please sign in instead.') };
        }
        
        if (errorMessage.includes('Email not confirmed')) {
          return { data: null, error: new Error('Please verify your email address before signing in.') };
        }
      }
      
      return { data: null, error: new Error(result.error.message) };
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error(`Exception in ${context}:`, error);
    
    // Handle network errors at the exception level
    if (error instanceof TypeError && 
        (error.message.includes('fetch') || error.message.includes('network'))) {
      return { 
        data: null, 
        error: new Error('Network error. Please check your internet connection and try again.') 
      };
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: new Error(message) };
  }
};