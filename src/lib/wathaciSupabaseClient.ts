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
  investor: "/investor-assessment",
  professional: "/professional-assessment",
  donor: "/donor-assessment",
  government_institution: "/government-assessment",
};

const normalizeAccountType = (accountType?: string | null): AccountType | null => {
  if (!accountType) return null;
  const normalized = accountType.trim().toLowerCase();

  if (normalized === "sole_proprietor") {
    return "sme";
  }

  if (normalized === "government") {
    return "government_institution";
  }

  if ((Object.keys(accountTypePaths) as string[]).includes(normalized)) {
    return normalized as AccountType;
  }

  return null;
};

export const getDashboardPathForAccountType = (accountType?: string | null): string => {
  const normalized = normalizeAccountType(accountType);
  if (!normalized) return "/profile-review";

  return accountTypePaths[normalized] ?? "/profile-review";
};
