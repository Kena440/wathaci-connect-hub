import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import type { Database } from "@/@types/database";
import { getSupabaseClientConfiguration, supabaseConfigStatus } from "@/config/appConfig";
import { supabase as fallbackSupabase } from "./supabase-enhanced";

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

const SUPABASE_URL_ENV_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PROJECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_PROJECT_URL",
] as const;

const SUPABASE_KEY_ENV_KEYS = [
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_KEY",
] as const;

const readRuntimeEnv = (keys: readonly string[]): string | undefined => {
  const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any)?.env : undefined;

  for (const key of keys) {
    const direct = sanitizeEnvValue(metaEnv?.[key]);
    if (direct) {
      return direct;
    }
  }

  if (typeof process !== "undefined" && process.env) {
    for (const key of keys) {
      const processValue = sanitizeEnvValue(process.env[key]);
      if (processValue) {
        return processValue;
      }
    }
  }

  if (typeof globalThis !== "undefined") {
    for (const key of keys) {
      const runtimeValue = sanitizeEnvValue((globalThis as any)?.__APP_CONFIG__?.[key]);
      if (runtimeValue) {
        return runtimeValue;
      }
    }
  }

  return undefined;
};

const fallbackUrl = readRuntimeEnv(SUPABASE_URL_ENV_KEYS);
const fallbackAnonKey = readRuntimeEnv(SUPABASE_KEY_ENV_KEYS);

const resolvedConfig = getSupabaseClientConfiguration(clientOptions);
const supabaseUrl = resolvedConfig?.url ?? fallbackUrl;
const supabaseAnonKey = resolvedConfig?.anonKey ?? fallbackAnonKey;

const maskKey = (key?: string | null): string | undefined => {
  if (!key || typeof key !== "string") {
    return undefined;
  }

  if (key.length <= 10) {
    return `${key.slice(0, 3)}...`;
  }

  return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

const buildClientFromConfig = () => {
  supabaseConfigStatus.usingFallbackClient = false;
  return createClient<Database>(supabaseUrl as string, supabaseAnonKey as string, resolvedConfig?.options ?? clientOptions);
};

const markInvalidConfig = (errorMessage: string) => {
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
};

const buildFallbackClient = () => {
  const errorMessage =
    supabaseConfigStatus.errorMessage?.trim() ||
    "Missing Supabase environment configuration: VITE_SUPABASE_URL | VITE_SUPABASE_ANON_KEY";

  markInvalidConfig(errorMessage);
  supabaseConfigStatus.usingFallbackClient = true;
  return fallbackSupabase;
};

const shouldLogRuntimeConfig =
  (typeof import.meta !== "undefined" && Boolean((import.meta as any)?.env?.DEV)) ||
  (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");

if (shouldLogRuntimeConfig) {
  console.info("[supabase-client] Runtime Supabase configuration", {
    supabaseUrl,
    anonKeyPreview: maskKey(supabaseAnonKey ?? undefined),
    resolvedUrlKey: supabaseConfigStatus.resolvedUrlKey,
    resolvedAnonKeyKey: supabaseConfigStatus.resolvedAnonKeyKey,
    usingFallbackClient: supabaseConfigStatus.usingFallbackClient,
  });
}

const internalClient =
  !supabaseUrl || !supabaseAnonKey
    ? buildFallbackClient()
    : buildClientFromConfig();

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
