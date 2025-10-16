/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

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
  operation: () => PromiseLike<{ data: T | null; error: any }>,
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