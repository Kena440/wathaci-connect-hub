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
} else {
  const error = new Error(
    supabaseConfigStatus.errorMessage ||
      `Supabase configuration missing. Set ${supabaseConfigStatus.canonicalUrlKey} and ${supabaseConfigStatus.canonicalAnonKey}.`,
  );

  if (typeof console !== "undefined" && !import.meta.env.SSR) {
    console.error("[supabaseClient]", error.message);
  }

  internalClient = createFallbackSupabaseClient(error);
  supabaseConfigStatus.usingFallbackClient = true;
}

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

