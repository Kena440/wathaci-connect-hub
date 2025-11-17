import React, { useMemo, useState } from "react";
import { supabaseClient, accountTypePaths, type AccountType } from "@/lib/wathaciSupabaseClient";

export interface SignupFormProps {
  accountType: AccountType;
  onSuccess?: (accountType: AccountType) => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ accountType, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const redirectPath = useMemo(() => accountTypePaths[accountType], [accountType]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("You must accept the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Signup succeeded but user information is missing. Please check your email.");
        return;
      }

      const { error: profileError } = await supabaseClient.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName || null,
        account_type: accountType,
        company_name: companyName || null,
        accepted_terms: acceptedTerms,
        newsletter_opt_in: newsletterOptIn,
      });

      if (profileError) {
        console.error("Profile insert failed", profileError);
        setError(profileError.message);
        return;
      }

      if (!data.session) {
        setSuccessMessage(
          "Account created. Please check your email to confirm before logging in."
        );
      } else {
        setSuccessMessage("Account created. Redirecting to your dashboard...");
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 1200);
      }

      onSuccess?.(accountType);
    } catch (unknownError) {
      console.error(unknownError);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Account type</label>
        <input
          value={accountType}
          readOnly
          className="mt-1 w-full rounded border bg-gray-50 p-2 text-gray-700"
        />
      </div>
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
      <div>
        <label className="block text-sm font-medium text-gray-700">Confirm password</label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded border p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Company name</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="mt-1 w-full rounded border p-2"
          placeholder="Optional"
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="acceptedTerms"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
            required
          />
          <label htmlFor="acceptedTerms" className="text-sm text-gray-700">
            I read and accept the{" "}
            <a href="/terms-of-service" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Terms & Conditions
            </a>
            . <span className="text-red-600">*</span>
          </label>
        </div>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="newsletterOptIn"
            checked={newsletterOptIn}
            onChange={(e) => setNewsletterOptIn(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="newsletterOptIn" className="text-sm text-gray-700">
            Send me a monthly Newsletter.
          </label>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
      >
        {loading ? "Creating account..." : "Create account"}
      </button>

      {dataPrivacyCopy}
    </form>
  );
};

const dataPrivacyCopy = (
  <p className="text-xs text-gray-500">
    By continuing you agree to Wathaci's terms. Do not access session.user if session is
    null—always check Supabase auth state before using protected endpoints.
  </p>
);

export default SignupForm;
