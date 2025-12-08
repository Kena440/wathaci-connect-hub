import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AccountTypeSelector from "@/components/auth/AccountTypeSelector";
import SignupForm from "@/components/auth/SignupForm";
import { type AccountTypeValue } from "@/data/accountTypes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getMaintenanceConfig } from "@/config/featureFlags";
// TEMPORARY BYPASS MODE: remove after auth errors are fixed
import { BypassModeBanner } from "@/components/BypassModeBanner";

export const SignUp = () => {
  const navigate = useNavigate();
  const maintenance = getMaintenanceConfig();
  const maintenanceActive = maintenance.enabled;
  const signUpDisabled = maintenanceActive && !maintenance.allowSignUp;
  const signInAvailable = !maintenanceActive || maintenance.allowSignIn;

  const [selectedAccountType, setSelectedAccountType] = useState<AccountTypeValue | "">("");
  const [accountTypeError, setAccountTypeError] = useState<string | null>(null);
  const [emailForConfirmation, setEmailForConfirmation] = useState<string | null>(null);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const handleAccountTypeChange = (value: AccountTypeValue) => {
    setSelectedAccountType(value);
    setAccountTypeError(null);
  };

  const handleSignupSuccess = (email: string, requiresEmailConfirmation: boolean) => {
    setEmailForConfirmation(email);
    setConfirmationRequired(requiresEmailConfirmation);

    if (!requiresEmailConfirmation) {
      navigate("/onboarding/account-type");
    }
  };

  const headline = useMemo(() => "Sign up. It is fast and easy.", []);

  const showSuccessState = Boolean(emailForConfirmation);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white via-orange-50 to-green-100 p-6">
      <div className="w-full max-w-5xl rounded-2xl bg-white/95 p-8 shadow-xl ring-1 ring-orange-100/60 backdrop-blur">
        {/* TEMPORARY BYPASS MODE: remove after auth errors are fixed */}
        <BypassModeBanner className="mb-6" />
        
        {maintenanceActive && (
          <Alert variant="warning" className="mb-6">
            <AlertTitle>{maintenance.bannerTitle}</AlertTitle>
            <AlertDescription>{maintenance.bannerMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
          <div className="lg:col-span-2">
            <img
              src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
              alt="Wathaci Connect"
              className="h-14 w-auto"
              loading="lazy"
              decoding="async"
            />
            <h1 className="mt-6 text-3xl font-bold text-gray-900">{headline}</h1>
            <p className="mt-3 max-w-xl text-base text-gray-700">
              Choose your account type, accept the Terms & Conditions, and create your secure login to start using Wathaci.
            </p>
            <div className="mt-6 rounded-xl bg-orange-50 p-4 text-sm text-orange-900">
              <p className="font-semibold">Remember</p>
              <p>
                Your account type controls your onboarding journey. We only support the existing Wathaci account types; no changes or
                new roles are introduced here.
              </p>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-3">
            {!showSuccessState ? (
              <>
                <AccountTypeSelector
                  value={selectedAccountType}
                  onChange={handleAccountTypeChange}
                  disabled={signUpDisabled}
                  error={accountTypeError}
                />

                <SignupForm
                  accountType={selectedAccountType}
                  onAccountTypeMissing={setAccountTypeError}
                  onSuccess={handleSignupSuccess}
                  disabled={signUpDisabled}
                />
              </>
            ) : (
              <div className="space-y-4 rounded-2xl border border-green-100 bg-green-50 p-6">
                <h2 className="text-2xl font-semibold text-green-900">Account created</h2>
                <p className="text-base text-green-900">
                  You can sign in immediately with your email and password to continue setting up your profile.
                </p>
                {emailForConfirmation ? (
                  <p className="text-sm text-green-900">Registered email: {emailForConfirmation}</p>
                ) : null}
                {signInAvailable ? (
                  <Link to="/signin" className="font-semibold text-green-900 underline">
                    Continue to login
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
