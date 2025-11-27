import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Lock, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase, userService } from '@/lib/services';

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Use a mix of letters and numbers for a stronger password'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    let isMounted = true;

    const initialiseSession = async () => {
      setCheckingSession(true);

      try {
        const hash = typeof window !== 'undefined' ? window.location.hash : '';

        if (hash.includes('type=recovery')) {
          const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
          if (error) {
            if (!isMounted) {
              return;
            }
            setSessionError(
              'This password reset link is invalid or has expired. Please request a new one.',
            );
            setCheckingSession(false);
            return;
          }

          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.hash = '';
            window.history.replaceState({}, document.title, url.toString());
          }
        }

        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) {
          return;
        }

        if (error || !data?.user) {
          setSessionError('We could not validate your session. Please request a new reset link.');
          setCheckingSession(false);
          return;
        }

        setSessionError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setSessionError('Something went wrong while preparing your password reset. Please try again.');
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    initialiseSession();

    return () => {
      isMounted = false;
    };
  }, [location]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeout = window.setTimeout(() => {
      navigate('/signin');
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [success, navigate]);

  const onSubmit = handleSubmit(async ({ password }) => {
    setSubmitting(true);
    setSessionError(null);

    try {
      const { error } = await userService.updatePassword(password);

      if (error) {
        const message = error.message || 'We could not update your password. Please try again.';
        setSessionError(message);
        toast({
          variant: 'destructive',
          title: 'Password update failed',
          description: message,
        });
        return;
      }

      reset();
      setSuccess(true);
      toast({
        title: 'Password updated',
        description: 'Your password has been changed successfully. Redirecting to sign in…',
      });
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 py-16 px-4">
      <div className="mx-auto w-full max-w-md">
        <Card className="shadow-xl border border-emerald-100">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Reset Password</CardTitle>
            <CardDescription className="text-gray-600">
              Create a new password for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checkingSession ? (
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-gray-600">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                <p>Preparing your password reset…</p>
              </div>
            ) : success ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">Password updated</h2>
                  <p className="text-gray-600">
                    You will be redirected to the sign in page. If nothing happens, click the button below.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link to="/signin">Go to sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                {sessionError && (
                  <Alert variant="destructive">
                    <AlertDescription>{sessionError}</AlertDescription>
                  </Alert>
                )}
                {sessionError && (
                  <p className="text-sm text-gray-600">
                    Need a fresh link?{' '}
                    <Link to="/forgot-password" className="font-medium text-orange-600 hover:text-orange-700">
                      Request another password reset
                    </Link>
                    .
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-left text-gray-700 font-medium">
                    New password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Enter a new password"
                      {...register('password')}
                      className={`pl-10 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 ${
                        errors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''
                      }`}
                      aria-invalid={errors.password ? 'true' : 'false'}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-left text-gray-700 font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      {...register('confirmPassword')}
                      className={`pl-10 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400 ${
                        errors.confirmPassword ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''
                      }`}
                      aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-600 to-orange-600 hover:from-emerald-700 hover:to-orange-700 text-white py-3"
                  disabled={submitting || !!sessionError}
                >
                  {submitting ? 'Updating password…' : 'Update password'}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <Link to="/signin" className="font-medium text-orange-600 hover:text-orange-700">
                    Back to sign in
                  </Link>
                </div>

                {!sessionError && (
                  <p className="text-xs text-gray-500 text-center">
                    Passwords must be at least 8 characters long and include a mix of letters and numbers.
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
