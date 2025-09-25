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