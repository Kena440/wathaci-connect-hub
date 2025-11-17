import React, { useState } from "react";
import type { AccountType } from "@/lib/wathaciSupabaseClient";
import { AccountTypeSelector } from "./AccountTypeSelector";
import { SignupForm } from "./SignupForm";

export const SignupFlow: React.FC = () => {
  const [step, setStep] = useState<"account" | "form" | "success">("account");
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  const handleSelect = (selected: AccountType) => {
    setAccountType(selected);
    setStep("form");
  };

  const handleSuccess = (email: string, requiresConfirmation: boolean, phone?: string) => {
    setStep("success");
  };

  return (
    <div className="mx-auto max-w-2xl rounded-xl border bg-white p-8 shadow">
      <h1 className="text-3xl font-bold">Join Wathaci</h1>
      <p className="mt-2 text-gray-600">ZAQA-style flow: Select Account Type → Register → Login</p>

      {step === "account" && (
        <div className="mt-6">
          <AccountTypeSelector selected={accountType || undefined} onSelect={handleSelect} />
          <p className="mt-4 text-sm text-gray-600">Click a card to continue.</p>
        </div>
      )}

      {step === "form" && accountType && (
        <SignupForm 
          accountType={accountType} 
          onSuccess={handleSuccess}
          onAccountTypeMissing={(msg) => console.error(msg)}
        />
      )}

      {step === "success" && (
        <div className="mt-6 space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <h2 className="text-xl font-semibold">Signup complete</h2>
          <p>
            If email confirmation is enabled, check your inbox. After logging in you'll be redirected
            based on your account type.
          </p>
          <ul className="list-disc space-y-1 pl-6 text-sm">
            <li>SME → /dashboard/sme</li>
            <li>Investor → /dashboard/investor</li>
            <li>Service Provider → /dashboard/service-provider</li>
            <li>Partner → /dashboard/partner</li>
            <li>Admin → /dashboard/admin</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SignupFlow;
