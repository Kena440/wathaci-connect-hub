import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Minimal Supabase client dedicated to the Wathaci auth/onboarding flow.
// Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your
// Vite environment (e.g., .env.local). We intentionally keep this lean so
// it can be copied into standalone onboarding pages without the broader
// application config dependencies.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Early surface of misconfiguration for developers.
  throw new Error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
  );
}

export const supabaseClient: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export type AccountType =
  | "SME"
  | "INVESTOR"
  | "SERVICE_PROVIDER"
  | "PARTNER"
  | "ADMIN";

export const accountTypePaths: Record<AccountType, string> = {
  SME: "/dashboard/sme",
  INVESTOR: "/dashboard/investor",
  SERVICE_PROVIDER: "/dashboard/service-provider",
  PARTNER: "/dashboard/partner",
  ADMIN: "/dashboard/admin",
};
