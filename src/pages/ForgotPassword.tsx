import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { userService } from '@/lib/services';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await userService.requestPasswordReset(normalizedEmail);

      if (error) {
        const message =
          error.message || 'We could not send a reset link right now. Please try again shortly.';
        setErrorMessage(message);
        toast({
          variant: 'destructive',
          title: 'Unable to send reset link',
          description: message,
        });
        return;
      }

      setSuccess(true);
      toast({
        title: 'Check your email',
        description: 'If an account exists for that email, we sent reset instructions.',
      });
    } finally {
      setLoading(false);
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-emerald-50 py-16 px-4">
      <div className="mx-auto w-full max-w-md">
        <Card className="shadow-xl border border-orange-100">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Forgot Password</CardTitle>
            <CardDescription className="text-gray-600">
              Enter the email address associated with your account and we'll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-gray-900">Reset link sent</h2>
                  <p className="text-gray-600">
                    If an account exists for that email, we sent reset instructions. The link will expire shortly for security
                    reasons.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link to="/signin">Return to sign in</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-left text-gray-700 font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your email"
                      {...register('email')}
                      className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 ${
                        errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''
                      }`}
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600" role="alert">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-3"
                  disabled={loading}
                >
                  {loading ? 'Sending reset link…' : 'Send reset link'}
                </Button>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <Link to="/signin" className="font-medium text-orange-600 hover:text-orange-700">
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
