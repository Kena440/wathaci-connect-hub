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

    try {
      const { data, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(withSupportContact(signInError.message));
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError(withSupportContact("Login succeeded but no user data was returned"));
        return;
      }

      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("account_type, profile_completed, email")
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
          .insert({
            id: userId,
            email: data.user?.email ?? email,
            account_type: null,
            profile_completed: false,
          })
          .select("account_type, profile_completed, email")
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
