import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import type { Database } from "@/@types/database";
import { getSupabaseClientConfiguration, supabaseConfigStatus } from "@/config/appConfig";

const clientOptions: SupabaseClientOptions<"public"> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
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

const resolveCanonicalEnv = (key: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"): string | undefined => {
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

const supabaseUrl = resolveCanonicalEnv("VITE_SUPABASE_URL");
const supabaseAnonKey = resolveCanonicalEnv("VITE_SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    supabaseConfigStatus.errorMessage ||
    `Supabase configuration missing. Set ${supabaseConfigStatus.canonicalUrlKey} and ${supabaseConfigStatus.canonicalAnonKey}.`;

  if (typeof console !== "undefined" && !import.meta.env.SSR) {
    console.error("Supabase config missing: check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY", {
      resolvedUrlKey: supabaseConfigStatus.resolvedUrlKey,
      resolvedAnonKeyKey: supabaseConfigStatus.resolvedAnonKeyKey,
      missingUrlKeys: supabaseConfigStatus.missingUrlKeys,
      missingAnonKeys: supabaseConfigStatus.missingAnonKeys,
    });
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

  throw new Error("Missing Supabase environment configuration");
}

const resolvedConfig = getSupabaseClientConfiguration(clientOptions);

const internalClient = createClient<Database>(
  resolvedConfig?.url ?? supabaseUrl,
  resolvedConfig?.anonKey ?? supabaseAnonKey,
  resolvedConfig?.options ?? clientOptions,
);

export type SupabaseClient = typeof internalClient;

export { supabaseConfigStatus } from "@/config/appConfig";

export const supabaseClient = internalClient;

export const getSupabaseClient = (): SupabaseClient => supabaseClient;

export const logSupabaseAuthError = (context: string, error: unknown) => {
  if (!import.meta.env.DEV) {
    return;
  }

  const payload = error instanceof Error ? { message: error.message, stack: error.stack } : error;
  console.groupCollapsed(`[supabase-auth] ${context}`);
  console.error(payload);
  console.groupEnd();
};

