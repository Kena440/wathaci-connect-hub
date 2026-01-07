/**
 * Enhanced Supabase client utilities
 * 
 * IMPORTANT: This module re-exports the SINGLETON Supabase client from 
 * @/integrations/supabase/client.ts to ensure only ONE GoTrueClient exists.
 * 
 * DO NOT create a new client here - use the singleton!
 */

import { supabase } from '@/integrations/supabase/client';

// Re-export the singleton client
export { supabase };

// Export type for external use
export type SupabaseClientType = typeof supabase;

/**
 * Get the Supabase client instance (for testing/utility purposes)
 */
export const getSupabaseClient = () => supabase;

/**
 * Test the Supabase connection
 */
export const testConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Supabase connection test exception:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Wrap an async operation with error handling
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const result = await operation();
    if (result.error) {
      console.error(`[${context}] Error:`, result.error);
      return { data: null, error: result.error };
    }
    return { data: result.data, error: null };
  } catch (err: any) {
    console.error(`[${context}] Exception:`, err);
    return { data: null, error: err };
  }
};

/**
 * Retry an async operation with exponential backoff
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
};

/**
 * Perform a health check on the Supabase connection
 */
export const healthCheck = async (): Promise<{
  connected: boolean;
  authenticated: boolean;
  userId?: string;
  error?: string;
}> => {
  try {
    // Test connection
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      return { connected: false, authenticated: false, error: connectionTest.error };
    }
    
    // Check auth status
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      return { connected: true, authenticated: false, error: authError.message };
    }
    
    return {
      connected: true,
      authenticated: !!session,
      userId: session?.user?.id,
    };
  } catch (err: any) {
    return { connected: false, authenticated: false, error: err.message };
  }
};
