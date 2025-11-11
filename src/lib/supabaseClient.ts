import { createClient, type SupabaseClientOptions, type SupabaseClient as SupabaseJsClient } from "@supabase/supabase-js";
import type { Database } from "@/@types/database";

type EnvKey =
  | "VITE_SUPABASE_URL"
  | "SUPABASE_URL"
  | "VITE_SUPABASE_PROJECT_URL"
  | "SUPABASE_PROJECT_URL"
  | "VITE_SUPABASE_ANON_KEY"
  | "SUPABASE_ANON_KEY"
  | "VITE_SUPABASE_KEY"
  | "SUPABASE_KEY";

interface EnvResolution {
  key?: EnvKey;
  value?: string;
}

export interface SupabaseConfigStatus {
  hasValidConfig: boolean;
  resolvedUrl?: string;
  resolvedAnonKey?: string;
  resolvedUrlKey?: EnvKey;
  resolvedAnonKeyKey?: EnvKey;
  missingUrlKeys: EnvKey[];
  missingAnonKeys: EnvKey[];
  errorMessage?: string;
  usingFallbackClient: boolean;
}

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

const readEnv = (key: EnvKey): string | undefined => {
  if (typeof process !== "undefined" && process.env) {
    const candidate = sanitizeEnvValue(process.env[key]);
    if (candidate) return candidate;
  }

  if (typeof window !== "undefined" && (window as any)?.__APP_CONFIG__) {
    const candidate = sanitizeEnvValue((window as any).__APP_CONFIG__[key]);
    if (candidate) return candidate;
  }

  try {
    const meta = Function("return typeof import.meta !== 'undefined' ? import.meta : undefined")();
    const candidate = sanitizeEnvValue(meta?.env?.[key]);
    if (candidate) return candidate;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[supabaseClient] Unable to inspect import.meta for", key, error);
    }
  }

  return undefined;
};

const resolveEnv = (keys: EnvKey[]): EnvResolution => {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) {
      return { key, value };
    }
  }

  return {};
};

const SUPABASE_URL_KEYS: EnvKey[] = [
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "VITE_SUPABASE_PROJECT_URL",
  "SUPABASE_PROJECT_URL",
];

const SUPABASE_ANON_KEYS: EnvKey[] = [
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "VITE_SUPABASE_KEY",
  "SUPABASE_KEY",
];

const urlResolution = resolveEnv(SUPABASE_URL_KEYS);
const anonResolution = resolveEnv(SUPABASE_ANON_KEYS);

const missingUrlKeys = urlResolution.value ? [] : SUPABASE_URL_KEYS;
const missingAnonKeys = anonResolution.value ? [] : SUPABASE_ANON_KEYS;

const configErrorMessages: string[] = [];

if (!urlResolution.value) {
  configErrorMessages.push(
    `Missing Supabase URL environment variable. Provide one of: ${SUPABASE_URL_KEYS.join(", ")}.`
  );
}

if (!anonResolution.value) {
  configErrorMessages.push(
    `Missing Supabase anon/public key. Provide one of: ${SUPABASE_ANON_KEYS.join(", ")}.`
  );
}

export const supabaseConfigStatus: SupabaseConfigStatus = {
  hasValidConfig: Boolean(urlResolution.value && anonResolution.value),
  resolvedUrl: urlResolution.value,
  resolvedAnonKey: anonResolution.value,
  resolvedUrlKey: urlResolution.key,
  resolvedAnonKeyKey: anonResolution.key,
  missingUrlKeys,
  missingAnonKeys,
  errorMessage: configErrorMessages.join(" \n"),
  usingFallbackClient: false,
};

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

if (supabaseConfigStatus.hasValidConfig) {
  internalClient = createClient<Database>(
    supabaseConfigStatus.resolvedUrl!,
    supabaseConfigStatus.resolvedAnonKey!,
    clientOptions,
  );
} else {
  const error = new Error(
    supabaseConfigStatus.errorMessage ||
      "Supabase configuration missing. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before using the client.",
  );
  if (!import.meta.env.SSR) {
    console.error("[supabaseClient]", error.message);
  }
  internalClient = createFallbackSupabaseClient(error);
  supabaseConfigStatus.usingFallbackClient = true;
}

export const supabaseClient = internalClient;

export const logSupabaseAuthError = (context: string, error: unknown) => {
  if (!import.meta.env.DEV) {
    return;
  }

  const payload = error instanceof Error ? { message: error.message, stack: error.stack } : error;
  console.groupCollapsed(`[supabase-auth] ${context}`);
  console.error(payload);
  console.groupEnd();
};

export type SupabaseClient = typeof supabaseClient;

export const getSupabaseClient = (): SupabaseClient => supabaseClient;
