import React, { useState } from "react";
import {
  supabaseClient,
  getDashboardPathForAccountType,
  type AccountType,
} from "@/lib/wathaciSupabaseClient";
import { withSupportContact } from "@/lib/supportEmail";

export interface LoginFormProps {
  onLogin?: (accountType: AccountType | null | undefined) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
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
        .select("account_type")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(profileError);
        setError(withSupportContact(profileError.message));
        return;
      }

      const normalizedType = (typeof profile?.account_type === "string"
        ? (profile.account_type.toLowerCase() as AccountType)
        : null);

      const destination = getDashboardPathForAccountType(normalizedType);
      onLogin?.(normalizedType || undefined);
      window.location.href = destination;
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
