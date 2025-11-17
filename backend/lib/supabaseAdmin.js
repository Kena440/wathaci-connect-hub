/**
 * Supabase Admin Client
 * 
 * Provides a Supabase client with service role key for backend operations.
 * This client bypasses Row Level Security (RLS) policies.
 * 
 * Required Environment Variables:
 * - SUPABASE_URL (or VITE_SUPABASE_URL): Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.VITE_SUPABASE_PROJECT_URL ||
  '';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_KEY || 
  '';

let supabaseClient = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('[SupabaseAdmin] Supabase admin client initialized successfully');
  } catch (error) {
    console.error('[SupabaseAdmin] Failed to initialize Supabase client:', error.message);
  }
} else {
  console.warn('[SupabaseAdmin] Supabase not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

/**
 * Get the Supabase admin client instance
 * @returns {import('@supabase/supabase-js').SupabaseClient | null} Supabase client or null
 */
function getSupabaseClient() {
  return supabaseClient;
}

/**
 * Check if Supabase is configured and ready to use
 * @returns {boolean} True if Supabase client is available
 */
function isSupabaseConfigured() {
  return supabaseClient !== null;
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured,
};
