/**
 * Enhanced Supabase client configuration with error handling and validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment validation
const validateEnvironment = (): { url: string; key: string } => {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL;
  // Support both key names for backwards compatibility
  const key = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || 
              (import.meta as any).env?.VITE_SUPABASE_KEY;

  if (!url) {
    console.warn('Missing VITE_SUPABASE_URL environment variable');
    return { url: '', key: '' };
  }

  if (!key) {
    console.warn('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable');
    return { url: '', key: '' };
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    console.warn('Invalid VITE_SUPABASE_URL format');
    return { url: '', key: '' };
  }

  return { url, key };
};

// Create the enhanced Supabase client
const createSupabaseClient = (): SupabaseClient => {
  const { url, key } = validateEnvironment();

  if (!url || !key) {
    // Return a mock client that won't work but won't crash
    console.error('Supabase client not properly configured');
  }

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'X-Client-Info': 'wathaci-connect-v1',
      },
    },
    db: {
      schema: 'public',
    },
  });

  return client;
};

// Initialize the client
let supabaseClient: SupabaseClient;

try {
  supabaseClient = createSupabaseClient();
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw error;
}

// Connection testing function
export const testConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabaseClient
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
    const wrappedError = new Error(`${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(wrappedError);
    return { data: null, error: wrappedError };
  }
};

// Retry logic for failed operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
};

// Export the main client
export const supabase = supabaseClient;

// Export client getter for testing purposes
export const getSupabaseClient = () => supabaseClient;

// Health check function
export const healthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: {
    connection: boolean;
    auth: boolean;
    timestamp: string;
  };
}> => {
  const timestamp = new Date().toISOString();
  
  try {
    // Test basic connection
    const connection = await testConnection();
    
    // Test auth status
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    const auth = !authError;

    const status = connection && auth ? 'healthy' : 'unhealthy';

    return {
      status,
      details: {
        connection,
        auth,
        timestamp,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connection: false,
        auth: false,
        timestamp,
      },
    };
  }
};

// Export types for use in other modules
export type SupabaseClientType = typeof supabaseClient;