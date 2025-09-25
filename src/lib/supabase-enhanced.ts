/**
 * Enhanced Supabase client configuration with error handling and validation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment validation
const validateEnvironment = (): { url: string; key: string } => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_KEY;

  console.log('Supabase Environment Check:', {
    hasUrl: !!url,
    urlValue: url,
    hasKey: !!key,
    keyLength: key?.length,
    keyPrefix: key?.substring(0, 20) + '...'
  });

  if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable');
  }

  if (!key) {
    throw new Error('Missing VITE_SUPABASE_KEY environment variable');
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid VITE_SUPABASE_URL format');
  }

  // Validate key format (Supabase anon keys are typically longer and JWT format)
  if (key.length < 50) {
    console.warn('Supabase key appears to be unusually short. Expected length is typically 100+ characters.');
  }

  // Check if key looks like a JWT token (starts with eyJ) or new format (starts with sb-)
  if (!key.startsWith('eyJ') && !key.startsWith('sb-')) {
    console.error('Supabase key format appears invalid. Expected format: eyJxxxxx... (JWT) or sb-xxxxx...');
    console.error('Current key format:', key.substring(0, 20) + '...');
    
    if (import.meta.env.DEV) {
      console.warn('Invalid key detected in development mode. The app will continue with limited functionality.');
      console.warn('To fix this:');
      console.warn('1. Go to your Supabase project dashboard');
      console.warn('2. Navigate to Settings > API');
      console.warn('3. Copy the "anon" key (not the "service_role" key)');
      console.warn('4. Update your .env file with VITE_SUPABASE_KEY="your-anon-key-here"');
    } else {
      throw new Error('Invalid Supabase key format. Please check your VITE_SUPABASE_KEY environment variable.');
    }
  }

  // Additional validation for the current key
  if (key === 'sb_publishable_8rLYlRkT8hNwBs-T7jsOAQ_pJq9gtfB') {
    console.error('The current Supabase key appears to be incomplete or a placeholder.');
    if (import.meta.env.DEV) {
      console.warn('Using placeholder key in development mode. Please update with the correct anon key.');
    } else {
      throw new Error('Please update VITE_SUPABASE_KEY with the complete anon key from your Supabase project.');
    }
  }

  return { url, key };
};

// Create the enhanced Supabase client
const createSupabaseClient = (): SupabaseClient => {
  const { url, key } = validateEnvironment();

  console.log('Creating Supabase client with URL:', url);

  const client = createClient(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Storage for auth tokens
      storage: window.sessionStorage,
      // Add debugging for auth
      debug: import.meta.env.DEV,
    },
    global: {
      headers: {
        'X-Client-Info': 'wathaci-connect-v2',
      },
    },
    // Enhanced error handling
    db: {
      schema: 'public',
    },
  });

  // Test the client immediately upon creation in development
  if (import.meta.env.DEV) {
    console.log('Testing Supabase client connection...');
    client.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('Supabase auth test failed:', error);
        } else {
          console.log('Supabase client initialized successfully');
        }
      })
      .catch(err => {
        console.error('Supabase client test error:', err);
      });
  }

  return client;
};

// Initialize the client
let supabaseClient: SupabaseClient;

try {
  supabaseClient = createSupabaseClient();
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  
  // In development mode, create a mock client to prevent app crashes
  if (import.meta.env.DEV) {
    console.warn('Creating mock Supabase client for development...');
    // Create a minimal mock that satisfies the interface
    supabaseClient = {
      auth: {
        signUp: async () => ({ 
          data: { user: null, session: null }, 
          error: new Error('Mock mode: Supabase not properly configured. Please check your VITE_SUPABASE_URL and VITE_SUPABASE_KEY environment variables.') 
        }),
        signInWithPassword: async () => ({ 
          data: { user: null, session: null }, 
          error: new Error('Mock mode: Supabase not properly configured') 
        }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ 
          data: { user: null }, 
          error: new Error('Mock mode: Auth session missing!') 
        }),
        getSession: async () => ({ 
          data: { session: null }, 
          error: null 
        }),
        onAuthStateChange: () => ({ 
          data: { subscription: { unsubscribe: () => {} } } 
        })
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ 
              data: null, 
              error: new Error('Mock mode: Database not available') 
            }),
            limit: async () => ({ 
              data: [], 
              error: new Error('Mock mode: Database not available') 
            })
          }),
          limit: async () => ({ 
            data: [], 
            error: new Error('Mock mode: Database not available') 
          })
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ 
              data: null, 
              error: new Error('Mock mode: Database not available') 
            })
          })
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ 
                data: null, 
                error: new Error('Mock mode: Database not available') 
              })
            })
          })
        })
      })
    } as any;
  } else {
    throw error;
  }
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
      console.error(`Supabase Error in ${context}:`, result.error);
      
      // Provide more specific error messages based on common issues
      let errorMessage = result.error.message;
      
      if (errorMessage.includes('Invalid API key')) {
        errorMessage = 'Invalid Supabase API key. Please check your VITE_SUPABASE_KEY environment variable.';
      } else if (errorMessage.includes('fetch')) {
        errorMessage = 'Network error connecting to Supabase. Please check your internet connection and Supabase configuration.';
      } else if (errorMessage.includes('CORS')) {
        errorMessage = 'CORS error. Please check your Supabase project settings and ensure the domain is allowed.';
      }
      
      const error = new Error(`${context}: ${errorMessage}`);
      return { data: null, error };
    }

    return { data: result.data, error: null };
  } catch (error) {
    console.error(`Exception in ${context}:`, error);
    
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle common network errors
    if (errorMessage.includes('fetch')) {
      errorMessage = 'Failed to connect to Supabase. Please check your internet connection and Supabase configuration.';
    } else if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
      errorMessage = 'Request blocked by browser or ad-blocker. Please disable ad-blockers for this site.';
    }
    
    const wrappedError = new Error(`${context}: ${errorMessage}`);
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