import {
  createClient,
  type SupabaseClient as SupabaseJsClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

import type { Database } from "@/@types/database";
import { getSupabaseClientConfiguration, supabaseConfigStatus } from "@/config/appConfig";

const clientOptions: SupabaseClientOptions<"public"> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

type SupabaseClientType = SupabaseJsClient<Database>;

const createFallbackSupabaseClient = (error: Error): SupabaseClientType => {
  const rejected = async () => {
    throw error;
  };

  const noopSubscription = {
    unsubscribe: () => {},
  };

  return {
    auth: {
      getSession: rejected,
      signInWithPassword: rejected,
      signUp: rejected,
      signOut: rejected,
      onAuthStateChange: () => ({ data: { subscription: noopSubscription }, error }),
      getUser: rejected,
      updateUser: rejected,
    },
    from: () => ({
      select: rejected,
      insert: rejected,
      update: rejected,
      upsert: rejected,
      delete: rejected,
      eq: () => ({
        select: rejected,
        insert: rejected,
        update: rejected,
        upsert: rejected,
        delete: rejected,
      }),
      neq: () => ({
        select: rejected,
      }),
      single: rejected,
      maybeSingle: rejected,
      limit: () => ({
        select: rejected,
      }),
      order: () => ({
        select: rejected,
      }),
      throwOnError: () => ({
        select: rejected,
      }),
    }),
    rpc: rejected,
    channel: () => ({
      subscribe: () => ({ error }),
      on: () => ({ subscribe: () => ({ error }) }),
    }),
    removeChannel: () => ({ error }),
    getChannels: () => [],
    storage: {
      from: () => ({
        upload: rejected,
        download: rejected,
        remove: rejected,
        list: rejected,
      }),
    },
    functions: {
      invoke: rejected,
    },
  } as unknown as SupabaseClientType;
};

let internalClient: SupabaseClientType;

const resolvedConfig = getSupabaseClientConfiguration(clientOptions);

if (resolvedConfig) {
  internalClient = createClient<Database>(resolvedConfig.url, resolvedConfig.anonKey, resolvedConfig.options);
  
  // Log successful configuration in development
  if (import.meta.env.DEV && typeof console !== "undefined") {
    console.info(
      "[supabaseClient] ✓ Configured successfully",
      `\n  URL: ${resolvedConfig.url}`,
      `\n  Using keys: ${supabaseConfigStatus.resolvedUrlKey}, ${supabaseConfigStatus.resolvedAnonKeyKey}`
    );
  }
} else {
  const error = new Error(
    supabaseConfigStatus.errorMessage ||
      `Supabase configuration missing. Set ${supabaseConfigStatus.canonicalUrlKey} and ${supabaseConfigStatus.canonicalAnonKey}.`,
  );

  // Make config failures highly visible
  if (typeof console !== "undefined" && !import.meta.env.SSR) {
    console.error(
      "╔═══════════════════════════════════════════════════════════════════╗\n" +
      "║  ⚠️  CRITICAL: SUPABASE CONFIGURATION MISSING                    ║\n" +
      "╠═══════════════════════════════════════════════════════════════════╣\n" +
      `║  Required: ${supabaseConfigStatus.canonicalUrlKey.padEnd(51)}║\n` +
      `║  Required: ${supabaseConfigStatus.canonicalAnonKey.padEnd(51)}║\n` +
      "║                                                                   ║\n" +
      "║  The app will NOT function without these environment variables.  ║\n" +
      "║  Please check your .env file and ensure both are set.            ║\n" +
      "╚═══════════════════════════════════════════════════════════════════╝"
    );
    console.error("[supabaseClient] Error details:", error.message);
  }

  internalClient = createFallbackSupabaseClient(error);
  supabaseConfigStatus.usingFallbackClient = true;
  
  // In production, throw to prevent silent failures
  if (import.meta.env.PROD) {
    throw error;
  }
}

export type SupabaseClient = typeof internalClient;

export { supabaseConfigStatus } from "@/config/appConfig";

export const supabaseClient = internalClient;

export const getSupabaseClient = (): SupabaseClient => supabaseClient;

export const logSupabaseAuthError = (context: string, error: unknown) => {
  const payload = error instanceof Error ? { message: error.message, stack: error.stack } : error;
  
  // Always log errors, but with different verbosity
  if (import.meta.env.DEV) {
    console.groupCollapsed(`[supabase-auth] ${context}`);
    console.error(payload);
    console.groupEnd();
  } else {
    // In production, log minimal info for debugging
    console.error(`[supabase-auth] ${context}:`, error instanceof Error ? error.message : String(error));
  }
};

/**
 * Log authentication state changes for debugging
 */
export const logAuthStateChange = (event: string, details?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) {
    return;
  }

  console.log(`[auth-state] ${event}`, details || '');
};

/**
 * Log profile operations for debugging
 */
export const logProfileOperation = (operation: string, details?: Record<string, unknown>) => {
  if (!import.meta.env.DEV) {
    return;
  }

  console.log(`[profile] ${operation}`, details || '');
};

