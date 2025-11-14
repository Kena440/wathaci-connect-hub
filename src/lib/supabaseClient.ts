import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import type { Database } from "@/@types/database";
import { getSupabaseClientConfiguration, supabaseConfigStatus } from "@/config/appConfig";

const clientOptions: SupabaseClientOptions<"public"> = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
};

const sanitizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") {
    return undefined;
  }

  return trimmed.replace(/^['"`]+|['"`]+$/g, "").trim();
};

const readRuntimeEnv = (key: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"): string | undefined => {
  const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any)?.env : undefined;
  const direct = sanitizeEnvValue(metaEnv?.[key]);
  if (direct) {
    return direct;
  }

  if (typeof process !== "undefined" && process.env) {
    const processValue = sanitizeEnvValue(process.env[key]);
    if (processValue) {
      return processValue;
    }
  }

  if (typeof globalThis !== "undefined") {
    const runtimeValue = sanitizeEnvValue((globalThis as any)?.__APP_CONFIG__?.[key]);
    if (runtimeValue) {
      return runtimeValue;
    }
  }

  return undefined;
};

const fallbackUrl = readRuntimeEnv("VITE_SUPABASE_URL");
const fallbackAnonKey = readRuntimeEnv("VITE_SUPABASE_ANON_KEY");

const resolvedConfig = getSupabaseClientConfiguration(clientOptions);
const supabaseUrl = resolvedConfig?.url ?? fallbackUrl;
const supabaseAnonKey = resolvedConfig?.anonKey ?? fallbackAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    supabaseConfigStatus.errorMessage?.trim() ||
    "Missing Supabase environment configuration: VITE_SUPABASE_URL | VITE_SUPABASE_ANON_KEY";

  const debugSnapshot = {
    resolvedUrlKey: supabaseConfigStatus.resolvedUrlKey,
    resolvedAnonKeyKey: supabaseConfigStatus.resolvedAnonKeyKey,
    missingUrlKeys: supabaseConfigStatus.missingUrlKeys,
    missingAnonKeys: supabaseConfigStatus.missingAnonKeys,
    fallbackUrlPresent: Boolean(fallbackUrl),
    fallbackAnonKeyPresent: Boolean(fallbackAnonKey),
  };

  if (typeof console !== "undefined") {
    console.error(
      "[CONFIG ERROR] Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.",
      debugSnapshot,
    );
  }

  supabaseConfigStatus.hasValidConfig = false;
  supabaseConfigStatus.resolvedUrl = undefined;
  supabaseConfigStatus.resolvedAnonKey = undefined;
  supabaseConfigStatus.resolvedUrlKey = undefined;
  supabaseConfigStatus.resolvedAnonKeyKey = undefined;
  supabaseConfigStatus.missingUrlKeys = [
    supabaseConfigStatus.canonicalUrlKey,
    ...supabaseConfigStatus.aliasUrlKeys,
  ];
  supabaseConfigStatus.missingAnonKeys = [
    supabaseConfigStatus.canonicalAnonKey,
    ...supabaseConfigStatus.aliasAnonKeys,
  ];
  supabaseConfigStatus.errorMessage = errorMessage;

  throw new Error("Missing Supabase environment configuration: VITE_SUPABASE_URL | VITE_SUPABASE_ANON_KEY");
}

const internalClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  resolvedConfig?.options ?? clientOptions,
);

export type SupabaseClient = typeof internalClient;

export { supabaseConfigStatus } from "@/config/appConfig";

export const supabaseClient = internalClient;
export const supabase = internalClient;

export const getSupabaseClient = (): SupabaseClient => supabaseClient;

export const logSupabaseAuthError = (context: string, error: unknown) => {
  const payload = error instanceof Error ? { message: error.message, stack: error.stack } : error;

  if (typeof console === "undefined") {
    return;
  }

  const shouldLog =
    (typeof import.meta !== "undefined" && Boolean((import.meta as any)?.env?.DEV)) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");

  if (!shouldLog) {
    return;
  }

  console.groupCollapsed?.(`[supabase-auth] ${context}`);
  console.error(payload);
  console.groupEnd?.();
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
