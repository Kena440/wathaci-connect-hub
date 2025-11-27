import { supabaseClient } from "./supabaseClient";
import type { AccountTypeValue } from "@/data/accountTypes";

// Use the shared, fully-configured Supabase client so auth state is consistent
// across the app (sessions, headers, interceptors, etc.). This prevents the
// standalone onboarding utilities from crashing when environment variables are
// missing and keeps login/signup flows aligned with the main application.
export { supabaseClient };

export type AccountType = AccountTypeValue;

export const accountTypePaths: Record<AccountType, string> = {
  sme: "/sme-assessment",
  sole_proprietor: "/sme-assessment",
  investor: "/investor-assessment",
  professional: "/professional-assessment",
  donor: "/donor-assessment",
  government: "/government-assessment",
};

export const getDashboardPathForAccountType = (accountType?: string | null): string => {
  if (!accountType) return "/profile-review";

  const normalized = accountType.trim().toLowerCase() as AccountTypeValue;
  return accountTypePaths[normalized] ?? "/profile-review";
};
