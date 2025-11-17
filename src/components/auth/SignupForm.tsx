import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";

import { type AccountTypeValue } from "@/data/accountTypes";
import { supabaseClient as supabase } from "@/lib/supabaseClient";
import { logSupabaseAuthError } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Full name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"),
  acceptedTerms: z.boolean().refine((value) => value, "You must accept the Terms & Conditions."),
  newsletterOptIn: z.boolean().optional().default(false),
});

export type SignupFormValues = z.infer<typeof formSchema>;

interface SignupFormProps {
  accountType: AccountTypeValue | "";
  onAccountTypeMissing: (message: string) => void;
  onSuccess: (email: string, requiresEmailConfirmation: boolean) => void;
  disabled?: boolean;
}

export const SignupForm = ({
  accountType,
  onAccountTypeMissing,
  onSuccess,
  disabled = false,
}: SignupFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      acceptedTerms: false,
      newsletterOptIn: false,
    },
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const isDisabled = disabled || isSubmitting;

  const buildFriendlyError = (message?: string | null) => {
    if (!message) return "Something went wrong while creating your account.";
    if (message.toLowerCase().includes("duplicate") || message.includes("already exists")) {
      return "An account with this email already exists. Please sign in instead.";
    }
    if (message.toLowerCase().includes("password")) {
      return "Password does not meet requirements. Please use a stronger password.";
    }
    return message;
  };

  const handleProfileUpsert = async (
    userId: string,
    values: SignupFormValues,
    newsletterOptIn: boolean,
    selectedAccountType: AccountTypeValue
  ) => {
    const { error: profileErrorResponse } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: values.email,
        first_name: values.fullName,
        account_type: selectedAccountType,
        accepted_terms: true,
        newsletter_opt_in: newsletterOptIn,
        profile_completed: false,
      },
      {
        onConflict: "id",
      }
    );

    if (profileErrorResponse) {
      setProfileError(buildFriendlyError(profileErrorResponse.message));
      logSupabaseAuthError("signup-profile", profileErrorResponse);
    }
  };

  const onSubmit = async (values: SignupFormValues) => {
    setFormError(null);
    setProfileError(null);

    if (!accountType) {
      onAccountTypeMissing("Please select an account type to continue.");
      return;
    }

    const normalizedAccountType = accountType;

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          account_type: normalizedAccountType,
          accepted_terms: true,
          newsletter_opt_in: Boolean(values.newsletterOptIn),
        },
      },
    });

    if (error) {
      const friendly = buildFriendlyError(error.message);
      setFormError(friendly);
      logSupabaseAuthError("signup", error);
      return;
    }

    const requiresEmailConfirmation = !data.session;

    if (data.user?.id && data.session) {
      await handleProfileUpsert(
        data.user.id,
        values,
        Boolean(values.newsletterOptIn),
        normalizedAccountType
      );
    }

    onSuccess(values.email, requiresEmailConfirmation);
  };

  const submitLabel = useMemo(() => {
    if (isSubmitting) return "Creating account...";
    return "Sign up now";
  }, [isSubmitting]);

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {profileError ? (
        <Alert variant="warning">
          <AlertDescription>{profileError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Jane Doe"
          autoComplete="name"
          disabled={isDisabled}
          {...register("fullName")}
        />
        {errors.fullName?.message ? <p className="text-sm text-red-600">{errors.fullName.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isDisabled}
          {...register("email")}
        />
        {errors.email?.message ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          disabled={isDisabled}
          {...register("password")}
        />
        {errors.password?.message ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
        <p className="text-xs text-gray-500">Use at least 8 characters for a secure password.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-3">
          <Checkbox
            id="acceptedTerms"
            disabled={isDisabled}
            {...register("acceptedTerms")}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">
            I have read and accept the{" "}
            <Link to="/terms-of-service" className="text-orange-700 underline">
              Terms & Conditions
            </Link>
            .
          </span>
        </label>
        {errors.acceptedTerms?.message ? (
          <p className="text-sm text-red-600">{errors.acceptedTerms.message}</p>
        ) : null}

        <label className="flex items-start gap-3">
          <Checkbox
            id="newsletterOptIn"
            disabled={isDisabled}
            {...register("newsletterOptIn")}
            className="mt-1"
          />
          <span className="text-sm text-gray-700">Send me the Wathaci newsletter monthly.</span>
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isDisabled}>
        {submitLabel}
      </Button>

      <p className="text-center text-sm text-gray-700">
        Already have an account?{" "}
        <Link to="/signin" className="font-semibold text-orange-700 hover:text-orange-800">
          Login
        </Link>
      </p>
    </form>
  );
};

export default SignupForm;
