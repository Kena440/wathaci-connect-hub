import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  supabaseClient,
  getDashboardPathForAccountType,
  type AccountType,
} from "@/lib/wathaciSupabaseClient";
import { withSupportContact } from "@/lib/supportEmail";
import { getOnboardingStartPath, normalizeAccountType } from "@/lib/onboardingPaths";
import { logger } from "@/lib/logger";

export interface LoginFormProps {
  onLogin?: (accountType: AccountType | null | undefined) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const normalizedEmail = email.trim();
    const passwordLength = password?.length ?? 0;

    if (typeof console !== "undefined") {
      console.log("[auth] Login attempt", {
        email: normalizedEmail,
        passwordLength,
      });
    }

    if (!normalizedEmail || passwordLength === 0) {
      setError(withSupportContact("Please provide both email and password."));
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        const friendlyMessage = signInError.message?.toLowerCase().includes("invalid login")
          ? "Incorrect email or password. Please try again."
          : signInError.message;

        logger.error("Login failed", signInError, {
          event: "auth:login:error",
          email: normalizedEmail,
          passwordLength,
        });

        setError(withSupportContact(friendlyMessage));
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError(withSupportContact("Login succeeded but no user data was returned"));
        return;
      }

      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      let resolvedProfile = profile;

      if (profileError && profileError.code !== "PGRST116") {
        console.error(profileError);
        setError(withSupportContact(profileError.message));
        return;
      }

      if (!resolvedProfile) {
        const { data: createdProfile, error: createError } = await supabaseClient
          .from("profiles")
          .upsert(
            {
              id: userId,
              email: data.user?.email ?? email,
              full_name:
                ((data.user?.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined) ?? null,
              account_type:
                ((data.user?.user_metadata as Record<string, unknown> | undefined)?.account_type as string | undefined) ?? null,
              profile_completed: false,
            },
            { onConflict: "id" }
          )
          .select()
          .single();

        if (createError) {
          console.error(createError);
          setError(withSupportContact(createError.message));
          return;
        }

        resolvedProfile = createdProfile;
        logger.info("Created missing profile after sign in", {
          event: "auth:login:create-profile",
          userId,
        });
      }

      const normalizedType = normalizeAccountType(resolvedProfile?.account_type as string | null);
      const onboardingPath = getOnboardingStartPath(normalizedType);

      if (!resolvedProfile?.profile_completed || !normalizedType) {
        logger.info("Redirecting user to onboarding after sign in", {
          event: "auth:login:onboarding-redirect",
          userId,
          accountType: normalizedType,
        });
        onLogin?.(normalizedType || undefined);
        navigate(onboardingPath, { replace: true });
        return;
      }

      const destination = getDashboardPathForAccountType(normalizedType);
      onLogin?.(normalizedType || undefined);
      navigate(destination, { replace: true });
    } catch (unknownError) {
      console.error(unknownError);
      setError(withSupportContact("Unable to login. Please try again"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border p-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
      >
        {loading ? "Signing in..." : "Login"}
      </button>
    </form>
  );
};

export default LoginForm;
