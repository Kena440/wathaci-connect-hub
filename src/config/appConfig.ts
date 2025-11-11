import type { SupabaseClientOptions } from "@supabase/supabase-js";

export type EnvKey =
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_PROJECT_URL"
  | "SUPABASE_URL"
  | "SUPABASE_PROJECT_URL"
  | "VITE_SUPABASE_ANON_KEY"
  | "VITE_SUPABASE_KEY"
  | "SUPABASE_ANON_KEY"
  | "SUPABASE_KEY"
  | "VITE_LENCO_API_URL"
  | "LENCO_API_URL"
  | "VITE_LENCO_PUBLIC_KEY"
  | "LENCO_PUBLIC_KEY"
  | "VITE_LENCO_SECRET_KEY"
  | "LENCO_SECRET_KEY"
  | "VITE_LENCO_WEBHOOK_URL"
  | "LENCO_WEBHOOK_URL"
  | "VITE_MIN_PAYMENT_AMOUNT"
  | "MIN_PAYMENT_AMOUNT"
  | "VITE_MAX_PAYMENT_AMOUNT"
  | "MAX_PAYMENT_AMOUNT"
  | "VITE_PLATFORM_FEE_PERCENTAGE"
  | "PLATFORM_FEE_PERCENTAGE"
  | "VITE_PAYMENT_CURRENCY"
  | "PAYMENT_CURRENCY"
  | "VITE_PAYMENT_COUNTRY"
  | "PAYMENT_COUNTRY"
  | "VITE_APP_ENV";

interface EnvResolution<K extends EnvKey = EnvKey> {
  key?: K;
  value?: string;
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
  try {
    const meta = (Function("return typeof import.meta !== 'undefined' ? import.meta : undefined")() as {
      env?: Record<string, unknown>;
    })?.env;
    const candidate = sanitizeEnvValue(meta?.[key]);
    if (candidate) {
      return candidate;
    }
  } catch (error) {
    if (typeof console !== "undefined" && typeof process !== "undefined" && process.env?.NODE_ENV !== "production") {
      console.warn("[config] Unable to access import.meta for", key, error);
    }
  }

  if (typeof process !== "undefined" && process.env) {
    const candidate = sanitizeEnvValue(process.env[key]);
    if (candidate) {
      return candidate;
    }
  }

  if (typeof globalThis !== "undefined") {
    const candidate = sanitizeEnvValue((globalThis as any)?.__APP_CONFIG__?.[key]);
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
};

const resolveEnv = <K extends EnvKey>(keys: readonly K[]): EnvResolution<K> => {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) {
      return { key, value };
    }
  }

  return {};
};

export interface SupabaseConfigStatus {
  hasValidConfig: boolean;
  resolvedUrl?: string;
  resolvedAnonKey?: string;
  resolvedUrlKey?: EnvKey;
  resolvedAnonKeyKey?: EnvKey;
  missingUrlKeys: EnvKey[];
  missingAnonKeys: EnvKey[];
  errorMessage?: string;
  canonicalUrlKey: "VITE_SUPABASE_URL";
  canonicalAnonKey: "VITE_SUPABASE_ANON_KEY";
  aliasUrlKeys: EnvKey[];
  aliasAnonKeys: EnvKey[];
  usingFallbackClient: boolean;
}

export type AppConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  lencoApiUrl?: string;
  lencoPublicKey?: string;
  lencoSecretKey?: string;
  lencoWebhookUrl?: string;
  paymentCurrency?: string;
  paymentCountry?: string;
  minPaymentAmount?: number;
  maxPaymentAmount?: number;
  platformFeePercentage?: number;
  environment?: string;
};

const SUPABASE_URL_KEYS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PROJECT_URL",
  "SUPABASE_URL",
  "SUPABASE_PROJECT_URL",
] as const satisfies readonly EnvKey[];

const SUPABASE_ANON_KEYS = [
  "VITE_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_KEY",
] as const satisfies readonly EnvKey[];

const LENCO_API_URL_KEYS = ["VITE_LENCO_API_URL", "LENCO_API_URL"] as const satisfies readonly EnvKey[];
const LENCO_PUBLIC_KEY_KEYS = ["VITE_LENCO_PUBLIC_KEY", "LENCO_PUBLIC_KEY"] as const satisfies readonly EnvKey[];
const LENCO_SECRET_KEY_KEYS = ["VITE_LENCO_SECRET_KEY", "LENCO_SECRET_KEY"] as const satisfies readonly EnvKey[];
const LENCO_WEBHOOK_URL_KEYS = ["VITE_LENCO_WEBHOOK_URL", "LENCO_WEBHOOK_URL"] as const satisfies readonly EnvKey[];
const PAYMENT_MIN_KEYS = ["VITE_MIN_PAYMENT_AMOUNT", "MIN_PAYMENT_AMOUNT"] as const satisfies readonly EnvKey[];
const PAYMENT_MAX_KEYS = ["VITE_MAX_PAYMENT_AMOUNT", "MAX_PAYMENT_AMOUNT"] as const satisfies readonly EnvKey[];
const PAYMENT_FEE_KEYS = ["VITE_PLATFORM_FEE_PERCENTAGE", "PLATFORM_FEE_PERCENTAGE"] as const satisfies readonly EnvKey[];
const PAYMENT_CURRENCY_KEYS = ["VITE_PAYMENT_CURRENCY", "PAYMENT_CURRENCY"] as const satisfies readonly EnvKey[];
const PAYMENT_COUNTRY_KEYS = ["VITE_PAYMENT_COUNTRY", "PAYMENT_COUNTRY"] as const satisfies readonly EnvKey[];
const ENVIRONMENT_KEYS = ["VITE_APP_ENV"] as const satisfies readonly EnvKey[];

const parseNumber = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const supabaseUrlResolution = resolveEnv(SUPABASE_URL_KEYS);
const supabaseAnonResolution = resolveEnv(SUPABASE_ANON_KEYS);

const missingUrlKeys = supabaseUrlResolution.value ? [] : [...SUPABASE_URL_KEYS];
const missingAnonKeys = supabaseAnonResolution.value ? [] : [...SUPABASE_ANON_KEYS];

const configErrorMessages: string[] = [];

if (!supabaseUrlResolution.value) {
  configErrorMessages.push(
    `Missing Supabase URL. Set ${SUPABASE_URL_KEYS[0]} (aliases checked: ${SUPABASE_URL_KEYS.slice(1).join(", ") || "none"}).`,
  );
}

if (!supabaseAnonResolution.value) {
  configErrorMessages.push(
    `Missing Supabase anon/public key. Set ${SUPABASE_ANON_KEYS[0]} (aliases checked: ${SUPABASE_ANON_KEYS.slice(1).join(", ") || "none"}).`,
  );
}

const supabaseStatus: SupabaseConfigStatus = {
  hasValidConfig: Boolean(supabaseUrlResolution.value && supabaseAnonResolution.value),
  resolvedUrl: supabaseUrlResolution.value,
  resolvedAnonKey: supabaseAnonResolution.value,
  resolvedUrlKey: supabaseUrlResolution.key,
  resolvedAnonKeyKey: supabaseAnonResolution.key,
  missingUrlKeys,
  missingAnonKeys,
  errorMessage: configErrorMessages.join("\n"),
  canonicalUrlKey: "VITE_SUPABASE_URL",
  canonicalAnonKey: "VITE_SUPABASE_ANON_KEY",
  aliasUrlKeys: SUPABASE_URL_KEYS.slice(1),
  aliasAnonKeys: SUPABASE_ANON_KEYS.slice(1),
  usingFallbackClient: false,
};

const appConfig: AppConfig | undefined = supabaseStatus.hasValidConfig
  ? {
      supabaseUrl: supabaseUrlResolution.value!,
      supabaseAnonKey: supabaseAnonResolution.value!,
      lencoApiUrl: resolveEnv(LENCO_API_URL_KEYS).value,
      lencoPublicKey: resolveEnv(LENCO_PUBLIC_KEY_KEYS).value,
      lencoSecretKey: resolveEnv(LENCO_SECRET_KEY_KEYS).value,
      lencoWebhookUrl: resolveEnv(LENCO_WEBHOOK_URL_KEYS).value,
      paymentCurrency: resolveEnv(PAYMENT_CURRENCY_KEYS).value,
      paymentCountry: resolveEnv(PAYMENT_COUNTRY_KEYS).value,
      minPaymentAmount: parseNumber(resolveEnv(PAYMENT_MIN_KEYS).value),
      maxPaymentAmount: parseNumber(resolveEnv(PAYMENT_MAX_KEYS).value),
      platformFeePercentage: parseNumber(resolveEnv(PAYMENT_FEE_KEYS).value),
      environment: resolveEnv(ENVIRONMENT_KEYS).value,
    }
  : undefined;

export const supabaseConfigStatus = supabaseStatus;

export const getOptionalAppConfig = (): AppConfig | undefined => appConfig;

export const getAppConfig = (): AppConfig => {
  if (!appConfig) {
    const message =
      supabaseStatus.errorMessage?.trim() ||
      `Supabase configuration missing. Set ${supabaseStatus.canonicalUrlKey} and ${supabaseStatus.canonicalAnonKey}.`;
    throw new Error(message);
  }

  return appConfig;
};

export const getEnvValue = (key: EnvKey): string | undefined => readEnv(key);

export type SupabaseClientConfiguration = {
  url: string;
  anonKey: string;
  options?: SupabaseClientOptions<"public">;
};

export const getSupabaseClientConfiguration = (
  options?: SupabaseClientOptions<"public">,
): SupabaseClientConfiguration | undefined => {
  if (!supabaseStatus.hasValidConfig || !appConfig) {
    return undefined;
  }

  return {
    url: appConfig.supabaseUrl,
    anonKey: appConfig.supabaseAnonKey,
    options,
  };
};

export const getEnvDebugSnapshot = () => ({
  supabase: {
    ...supabaseStatus,
  },
  appConfig,
});
