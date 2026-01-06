/**
 * Enhanced Supabase helper utilities.
 * Now uses the singleton client from src/lib/supabaseClient.ts
 */

import { supabase } from '@/lib/supabaseClient';

// Connection testing function
export const testConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Enhanced error handling wrapper
export const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const result = await operation();

    if (result.error) {
      const error = new Error(`${context}: ${result.error.message}`);
      console.error(error);
      return { data: null, error };
    }

    return { data: result.data, error: null };
  } catch (error) {
    const wrappedError = new Error(
      `${context}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    console.error(wrappedError);
    return { data: null, error: wrappedError };
  }
};

// Re-export singleton for convenience
export { supabase };
