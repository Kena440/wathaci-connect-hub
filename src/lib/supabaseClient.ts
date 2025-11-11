import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from '@/@types/database';

type EnvKey =
  | 'VITE_SUPABASE_URL'
  | 'SUPABASE_URL'
  | 'VITE_SUPABASE_PROJECT_URL'
  | 'SUPABASE_PROJECT_URL'
  | 'VITE_SUPABASE_ANON_KEY'
  | 'SUPABASE_ANON_KEY'
  | 'VITE_SUPABASE_KEY'
  | 'SUPABASE_KEY';

const sanitizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return undefined;
  }

  return trimmed.replace(/^['"`]+|['"`]+$/g, '').trim();
};

const readEnv = (key: EnvKey): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    const candidate = sanitizeEnvValue(process.env[key]);
    if (candidate) return candidate;
  }

  if (typeof window !== 'undefined' && (window as any)?.__APP_CONFIG__) {
    const candidate = sanitizeEnvValue((window as any).__APP_CONFIG__[key]);
    if (candidate) return candidate;
  }

  try {
    const meta = Function('return typeof import.meta !== "undefined" ? import.meta : undefined')();
    const candidate = sanitizeEnvValue(meta?.env?.[key]);
    if (candidate) return candidate;
  } catch (error) {
    if (import.meta.env?.MODE === 'development') {
      console.warn('[supabaseClient] Unable to inspect import.meta for env', error);
    }
  }

  return undefined;
};

const resolveRequiredEnv = (keys: EnvKey[], label: string): string => {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) {
      return value;
    }
  }

  const message = `Missing required Supabase environment variable for ${label}. Expected one of: ${keys.join(', ')}`;
  console.error(message);
  throw new Error(message);
};

const SUPABASE_URL_KEYS: EnvKey[] = [
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'VITE_SUPABASE_PROJECT_URL',
  'SUPABASE_PROJECT_URL',
];

const SUPABASE_ANON_KEYS: EnvKey[] = [
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_KEY',
  'SUPABASE_KEY',
];

const supabaseUrl = resolveRequiredEnv(SUPABASE_URL_KEYS, 'Supabase URL');
const supabaseAnonKey = resolveRequiredEnv(SUPABASE_ANON_KEYS, 'Supabase anon key');

const clientOptions: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, clientOptions);

/**
 * Helper used in dev mode to surface Supabase auth errors without exposing
 * details to end users. Wrap your auth calls in try/catch and forward errors
 * here so we consistently log the important metadata.
 */
export const logSupabaseAuthError = (context: string, error: unknown) => {
  if (import.meta.env?.MODE !== 'development') {
    return;
  }

  const payload = error instanceof Error ? { message: error.message, stack: error.stack } : error;
  console.groupCollapsed(`[supabase-auth] ${context}`);
  console.error(payload);
  console.groupEnd();
};

export type SupabaseClient = typeof supabaseClient;

export const getSupabaseClient = (): SupabaseClient => supabaseClient;
