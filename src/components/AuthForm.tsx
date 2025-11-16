import { useEffect, useState } from 'react';
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

const signInSchema = baseSchema;

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

export const AuthForm = ({ mode, redirectTo, onSuccess, disabled = false, disabledReason }: AuthFormProps) => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAppContext();
  const [formError, setFormError] = useState<string | null>(null);
  const [maintenanceNotice, setMaintenanceNotice] = useState<string | null>(disabled ? disabledReason ?? null : null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignInValues | SignUpValues>({
    resolver: zodResolver(mode === 'signup' ? signUpSchema : signInSchema),
    mode: 'onBlur',
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
      if (mode === 'signin') {
        await signIn(values.email, values.password);
      } else {
        const typed = values as SignUpValues;
        const phone = normalizePhone(typed.phone) ?? typed.phone.trim();
        const fullName = typed.fullName.trim();
        await signUp(typed.email, typed.password, {
          full_name: fullName,
          phone,
          msisdn: phone,
          mobile_number: phone,
          payment_phone: phone,
          payment_method: phone ? 'phone' : undefined,
          use_same_phone: phone ? true : undefined,
        });
      }

      reset();
      handleSuccess();
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
        <Input
          id="password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          disabled={isFormDisabled}
          {...register('password')}
        />
        {errors.password?.message && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {mode === 'signup' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={isFormDisabled}
              {...register('confirmPassword')}
            />
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
        </>
      )}

      <Button type="submit" className="w-full" disabled={isFormDisabled}>
        {isSubmitting
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
