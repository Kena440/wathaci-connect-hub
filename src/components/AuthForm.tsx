import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { logSupabaseAuthError } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { normalizeMsisdn } from '@/utils/phone';

const CREDENTIALS_STORAGE_KEY = 'wathaci-auth-credentials';

const baseSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long')
    .max(72, 'Password must be 72 characters or fewer'),
});

const signInSchema = baseSchema.extend({
  rememberPassword: z.boolean().optional().default(false),
});

const signUpSchema = baseSchema
  .extend({
    fullName: z.string().trim().min(1, 'Full name is required').max(120, 'Name is too long'),
    phone: z
      .string()
      .trim()
      .min(1, 'Phone number is required')
      .refine((value) => /^\+?[0-9]{9,15}$/.test(value.replace(/\s+/g, '')), {
        message: 'Enter a valid phone number with country code',
      }),
    confirmPassword: z.string().min(8, 'Please confirm your password'),
    acceptedTerms: z.boolean().refine((value) => value === true, {
      message: 'You must accept the Terms & Conditions',
    }),
    newsletterOptIn: z.boolean().optional().default(false),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export type AuthMode = 'signin' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
  redirectTo?: string;
  onSuccess?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

const normalizePhone = (value: string | undefined) => {
  if (!value) return undefined;
  const normalized = normalizeMsisdn(value);
  return normalized ?? undefined;
};

const getStoredCredentials = () => {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(CREDENTIALS_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (!parsed.email || !parsed.password) return null;
    return {
      email: String(parsed.email),
      password: String(parsed.password),
    };
  } catch (error) {
    console.error('Failed to parse stored credentials', error);
    window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    return null;
  }
};

const saveCredentials = (email: string, password: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify({ email, password }));
};

const clearStoredCredentials = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
};

export const AuthForm = ({ mode, redirectTo, onSuccess, disabled = false, disabledReason }: AuthFormProps) => {
  const navigate = useNavigate();
  const { signIn, signUp, user, profile, loading } = useAppContext();
  const [formError, setFormError] = useState<string | null>(null);
  const [maintenanceNotice, setMaintenanceNotice] = useState<string | null>(disabled ? disabledReason ?? null : null);
  const [authCompleted, setAuthCompleted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const storedCredentials = useMemo(() => (mode === 'signin' ? getStoredCredentials() : null), [mode]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignInValues | SignUpValues>({
    resolver: zodResolver(mode === 'signup' ? signUpSchema : signInSchema),
    mode: 'onBlur',
    defaultValues:
      mode === 'signin' && storedCredentials
        ? {
            email: storedCredentials.email,
            password: storedCredentials.password,
            rememberPassword: true,
          }
        : undefined,
  });

  const handleSuccess = () => {
    if (onSuccess) {
      onSuccess();
      return;
    }

    if (redirectTo) {
      navigate(redirectTo);
    }
  };

  // Smart redirect after auth completes and profile is loaded
  useEffect(() => {
    // Only run if auth was completed in this session
    if (!authCompleted) {
      return;
    }

    // Wait for loading to complete
    if (loading) {
      return;
    }

    // If user is not authenticated after loading completes, don't redirect
    if (!user) {
      return;
    }

    // If onSuccess callback is provided, use it instead of automatic redirect
    if (onSuccess) {
      onSuccess();
      setAuthCompleted(false);
      return;
    }

    // Smart redirect based on profile completion status
    if (!profile || !user.profile_completed) {
      // User needs to complete profile setup
      navigate('/profile-setup', { replace: true });
    } else if (redirectTo) {
      // Use provided redirect destination
      navigate(redirectTo, { replace: true });
    } else {
      // Default: go to home page
      navigate('/', { replace: true });
    }

    // Reset the flag
    setAuthCompleted(false);
  }, [authCompleted, loading, user, profile, navigate, redirectTo, onSuccess]);

  useEffect(() => {
    if (disabled) {
      setMaintenanceNotice(disabledReason ?? null);
    } else {
      setMaintenanceNotice(null);
    }
  }, [disabled, disabledReason]);

  const isFormDisabled = disabled || isSubmitting;

  const onSubmit = async (values: SignInValues | SignUpValues) => {
    if (disabled) {
      setMaintenanceNotice(disabledReason ?? 'Authentication is temporarily unavailable.');
      return;
    }

    setFormError(null);
    setMaintenanceNotice(null);

    try {
      const normalizedEmail = values.email.trim().toLowerCase();

      if (mode === 'signin') {
        const signInValues = values as SignInValues;
        await signIn(normalizedEmail, signInValues.password);

        if (signInValues.rememberPassword) {
          saveCredentials(normalizedEmail, signInValues.password);
        } else {
          clearStoredCredentials();
        }
      } else {
        const typed = values as SignUpValues;
        const phone = normalizePhone(typed.phone) ?? typed.phone.trim();
        const fullName = typed.fullName.trim();
        await signUp(normalizedEmail, typed.password, {
          full_name: fullName,
          phone,
          msisdn: phone,
          mobile_number: phone,
          payment_phone: phone,
          payment_method: phone ? 'phone' : undefined,
          use_same_phone: phone ? true : undefined,
          accepted_terms: typed.acceptedTerms,
          newsletter_opt_in: typed.newsletterOptIn ?? false,
        });
      }

      reset();
      // Set flag to trigger smart redirect after profile loads
      setAuthCompleted(true);
    } catch (error: any) {
      logSupabaseAuthError(`auth-${mode}`, error);
      const message = error && typeof error === 'object' && 'message' in error && error.message
        ? String(error.message)
        : 'Something went wrong. Please try again.';
      setFormError(message);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {maintenanceNotice && (
        <Alert>
          <AlertDescription>{maintenanceNotice}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" disabled={isFormDisabled} {...register('email')} />
        {errors.email?.message && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            disabled={isFormDisabled}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed"
            disabled={isFormDisabled}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {errors.password?.message && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {mode === 'signup' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isFormDisabled}
                {...register('confirmPassword')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 text-sm font-semibold text-gray-600 hover:text-gray-900 disabled:cursor-not-allowed"
                disabled={isFormDisabled}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.confirmPassword?.message && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              disabled={isFormDisabled}
              required
              {...register('fullName')}
            />
            {errors.fullName?.message && (
              <p className="text-sm text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile money number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. +260971234567"
              autoComplete="tel"
              disabled={isFormDisabled}
              required
              {...register('phone')}
            />
            {errors.phone?.message && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptedTerms"
                disabled={isFormDisabled}
                className="mt-1 h-4 w-4 rounded border-gray-300"
                {...register('acceptedTerms')}
              />
              <Label htmlFor="acceptedTerms" className="cursor-pointer text-sm font-normal">
                I have read and accept the{' '}
                <a href="/terms-of-service" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Terms & Conditions
                </a>
                . <span className="text-red-600">*</span>
              </Label>
            </div>
            {errors.acceptedTerms?.message && (
              <p className="text-sm text-red-600">{errors.acceptedTerms.message}</p>
            )}

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="newsletterOptIn"
                disabled={isFormDisabled}
                className="mt-1 h-4 w-4 rounded border-gray-300"
                {...register('newsletterOptIn')}
              />
              <Label htmlFor="newsletterOptIn" className="cursor-pointer text-sm font-normal">
                Send me a monthly newsletter.
              </Label>
            </div>
          </div>
        </>
      )}

      {mode === 'signin' && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="rememberPassword"
            disabled={isFormDisabled}
            className="h-4 w-4 rounded border-gray-300"
            {...register('rememberPassword')}
          />
          <Label htmlFor="rememberPassword" className="cursor-pointer text-sm font-normal">
            Remember password on this device
          </Label>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isFormDisabled || authCompleted}>
        {authCompleted
          ? 'Redirecting…'
          : isSubmitting
          ? 'Processing…'
          : disabled
          ? 'Temporarily unavailable'
          : mode === 'signin'
          ? 'Sign in'
          : 'Create account'}
      </Button>
    </form>
  );
};

export default AuthForm;
