import { useMemo, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";

import { type AccountTypeValue } from "@/data/accountTypes";
import { supabaseClient as supabase } from "@/lib/supabaseClient";
import { logSupabaseAuthError } from "@/lib/supabaseClient";
import { getEmailConfirmationRedirectUrl } from "@/lib/emailRedirect";
import { logAuthError, getUserFriendlyMessage, shouldReportError } from "@/lib/authErrorHandler";
import { isStrongPassword, PASSWORD_MIN_LENGTH, passwordStrengthMessage } from "@/utils/password";
import { 
  recordSignupAttempt, 
  getClientBlockedStatus, 
  markAsBlocked, 
  clearSignupAttempts,
  isBlockedError,
  getBlockedMessage,
  formatRetryTime
} from "@/lib/blockedSignupDetection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

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
  mobileNumber: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => {
        if (!val || val === '') return true;
        // Basic international phone number validation
        return /^\+?[1-9]\d{1,14}$/.test(val.replace(/[\s-()]/g, ''));
      },
      "Enter a valid phone number with country code (e.g., +260 XXX XXXXXX)"
    ),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(72, "Password must be at most 72 characters"),
  useSmsOtp: z.boolean().optional().default(false),
  acceptedTerms: z.boolean().refine((value) => value, "You must accept the Terms & Conditions."),
  newsletterOptIn: z.boolean().optional().default(false),
})
  .superRefine(({ password }, ctx) => {
    if (!isStrongPassword(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: passwordStrengthMessage,
        path: ["password"],
      });
    }
  });

export type SignupFormValues = z.infer<typeof formSchema>;

interface SignupFormProps {
  accountType: AccountTypeValue | "";
  onAccountTypeMissing: (message: string) => void;
  onSuccess: (email: string, requiresEmailConfirmation: boolean, phone?: string) => void;
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
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      acceptedTerms: false,
      newsletterOptIn: false,
      useSmsOtp: false,
    },
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [blockedStatus, setBlockedStatus] = useState<ReturnType<typeof getClientBlockedStatus> | null>(null);

  const useSmsOtp = watch("useSmsOtp");
  const mobileNumber = watch("mobileNumber");
  const emailValue = watch("email");

  const isDisabled = disabled || isSubmitting;

  // Check blocked status when email changes
  useEffect(() => {
    if (emailValue) {
      const status = getClientBlockedStatus(emailValue);
      setBlockedStatus(status);
      
      // Show warning if user has attempted multiple times
      if (status.attemptCount >= 2 && !status.isBlocked) {
        setFormError(`You've attempted to sign up ${status.attemptCount} times recently. Please ensure all information is correct before trying again.`);
      } else if (!status.isBlocked) {
        setFormError(null);
      }
    }
  }, [emailValue]);

  const handleProfileUpsert = async (
    userId: string,
    values: SignupFormValues,
    selectedAccountType: AccountTypeValue
  ) => {
    const normalizedEmail = values.email.trim().toLowerCase();
    const normalizedMobile = values.mobileNumber?.trim() || null;

    const { error: profileErrorResponse } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: normalizedEmail,
        full_name: values.fullName,
        account_type: selectedAccountType,
        accepted_terms: true,
        newsletter_opt_in: Boolean(values.newsletterOptIn),
        profile_completed: false,
        phone: normalizedMobile,
        msisdn: normalizedMobile,
      },
      {
        onConflict: "id",
      }
    );

    if (profileErrorResponse) {
      // Enhanced error logging with detailed context
      logAuthError("signup-profile-upsert", profileErrorResponse, {
        userId,
        email: normalizedEmail,
        accountType: selectedAccountType,
      });
      
      // Set user-friendly error message
      const friendlyMessage = getUserFriendlyMessage(profileErrorResponse);
      setProfileError(friendlyMessage);
      
      // Log to legacy system for compatibility
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

    // Check if user is currently blocked
    const currentBlockedStatus = getClientBlockedStatus(values.email);
    if (currentBlockedStatus.isBlocked && currentBlockedStatus.canRetryAt) {
      const message = getBlockedMessage(currentBlockedStatus);
      setFormError(`${message} You can try again at ${formatRetryTime(currentBlockedStatus.canRetryAt)}.`);
      return;
    }

    // Record this signup attempt
    recordSignupAttempt(values.email);

    const normalizedEmail = values.email.trim().toLowerCase();
    const normalizedMobileNumber = values.mobileNumber?.trim() || '';
    const normalizedAccountType = accountType;

    // Validate SMS OTP option
    if (values.useSmsOtp && (!values.mobileNumber || values.mobileNumber.trim() === '')) {
      setFormError("Please provide a mobile number to receive SMS verification code.");
      return;
    }

    // Sign up with email or phone
    if (values.useSmsOtp && values.mobileNumber) {
      // SMS-based signup with phone number
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        phone: normalizedMobileNumber || undefined,
        password: values.password,
        options: {
          channel: "sms",
          emailRedirectTo: getEmailConfirmationRedirectUrl(),
          data: {
            full_name: values.fullName,
            email: normalizedEmail,
            account_type: normalizedAccountType,
            accepted_terms: true,
            newsletter_opt_in: Boolean(values.newsletterOptIn),
            mobile_number: normalizedMobileNumber || undefined,
          },
        },
      });

      if (error) {
        // Check if this is a blocked/rate-limited error
        if (isBlockedError(error)) {
          // Mark email as blocked for 1 hour
          markAsBlocked(60 * 60 * 1000);
          
          // Enhanced error logging with detailed context
          logAuthError("signup-sms-blocked", error, {
            email: normalizedEmail,
            accountType: normalizedAccountType,
            hasPhone: Boolean(normalizedMobileNumber),
            blocked: true,
          });
        } else {
          // Enhanced error logging with detailed context
          logAuthError("signup-sms", error, {
            email: normalizedEmail,
            accountType: normalizedAccountType,
            hasPhone: Boolean(normalizedMobileNumber),
          });
        }
        
        // Set user-friendly error message
        const friendlyMessage = getUserFriendlyMessage(error);
        setFormError(friendlyMessage);
        
        // Log to legacy system for compatibility
        logSupabaseAuthError("signup-sms", error);
        return;
      }

      const requiresConfirmation = !data.session;

      if (data.user?.id && data.session) {
        await handleProfileUpsert(
          data.user.id,
          values,
          normalizedAccountType
        );
      }

      // Clear signup attempt tracking on success
      clearSignupAttempts();

      onSuccess(normalizedEmail, requiresConfirmation, normalizedMobileNumber || undefined);
    } else {
      // Email-based signup (default)
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: values.password,
        options: {
          emailRedirectTo: getEmailConfirmationRedirectUrl(),
          data: {
            full_name: values.fullName,
            account_type: normalizedAccountType,
            accepted_terms: true,
            newsletter_opt_in: Boolean(values.newsletterOptIn),
            mobile_number: normalizedMobileNumber || null,
          },
        },
      });

      if (error) {
        // Check if this is a blocked/rate-limited error
        if (isBlockedError(error)) {
          // Mark email as blocked for 1 hour
          markAsBlocked(60 * 60 * 1000);
          
          // Enhanced error logging with detailed context
          logAuthError("signup-email-blocked", error, {
            email: normalizedEmail,
            accountType: normalizedAccountType,
            blocked: true,
          });
        } else {
          // Enhanced error logging with detailed context
          logAuthError("signup-email", error, {
            email: normalizedEmail,
            accountType: normalizedAccountType,
          });
        }
        
        // Set user-friendly error message
        const friendlyMessage = getUserFriendlyMessage(error);
        setFormError(friendlyMessage);
        
        // Log to legacy system for compatibility
        logSupabaseAuthError("signup", error);
        return;
      }

      const requiresEmailConfirmation = !data.session;

      if (data.user?.id && data.session) {
        await handleProfileUpsert(
          data.user.id,
          values,
          normalizedAccountType
        );
      }

      // Clear signup attempt tracking on success
      clearSignupAttempts();

      onSuccess(normalizedEmail, requiresEmailConfirmation, normalizedMobileNumber || undefined);
    }
  };

  const submitLabel = useMemo(() => {
    if (isSubmitting) return "Creating account...";
    return "Sign up now";
  }, [isSubmitting]);

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Loading/Submitting State */}
      {isSubmitting && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Creating your account</AlertTitle>
          <AlertDescription>
            This may take a few seconds. Please do not refresh or go back.
          </AlertDescription>
        </Alert>
      )}

      {/* Blocked Status Warning */}
      {blockedStatus && blockedStatus.isBlocked && blockedStatus.canRetryAt && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Too Many Signup Attempts</AlertTitle>
          <AlertDescription>
            {getBlockedMessage(blockedStatus)}
            <br />
            <span className="text-sm">
              You can try again at {formatRetryTime(blockedStatus.canRetryAt)}.
              {' '}If you already have an account, <Link to="/signin" className="underline">try signing in instead</Link>.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Errors */}
      {formError && !isSubmitting ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Profile Errors */}
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
        <p className="text-xs text-gray-500">{passwordStrengthMessage}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mobileNumber">Mobile Number (Optional)</Label>
        <Input
          id="mobileNumber"
          type="tel"
          placeholder="+260 XXX XXXXXX"
          autoComplete="tel"
          disabled={isDisabled}
          {...register("mobileNumber")}
        />
        {errors.mobileNumber?.message ? <p className="text-sm text-red-600">{errors.mobileNumber.message}</p> : null}
        <p className="text-xs text-gray-500">Include country code for SMS verification (e.g., +260 for Zambia)</p>
      </div>

      {mobileNumber && mobileNumber.trim() !== '' && (
        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <label className="flex items-start gap-3">
            <Controller
              name="useSmsOtp"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="useSmsOtp"
                  disabled={isDisabled}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              )}
            />
            <span className="text-sm text-gray-700">
              Send verification code via SMS instead of email
            </span>
          </label>
          {useSmsOtp && (
            <p className="text-xs text-blue-600 ml-7">
              You'll receive a verification code on your mobile number.
            </p>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-3">
          <Controller
            name="acceptedTerms"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="acceptedTerms"
                disabled={isDisabled}
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-1"
              />
            )}
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
          <Controller
            name="newsletterOptIn"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="newsletterOptIn"
                disabled={isDisabled}
                checked={field.value}
                onCheckedChange={field.onChange}
                className="mt-1"
              />
            )}
          />
          <span className="text-sm text-gray-700">Send me the Wathaci newsletter monthly.</span>
        </label>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isDisabled || (blockedStatus?.isBlocked && Boolean(blockedStatus?.canRetryAt))}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          submitLabel
        )}
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
