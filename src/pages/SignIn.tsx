import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, ArrowRight, RotateCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// Validation schema
const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters long'),
});

type SignInFormData = z.infer<typeof signInSchema>;

const SignIn = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const { initiateSignIn, verifyOtp, resendOtp } = useAppContext();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    setError('');
    setOtpError('');

    try {
      const result = await initiateSignIn(data.email.trim(), data.password.trim());

      if (result.offlineState) {
        reset();
        navigate('/');
        return;
      }

      setPendingEmail(data.email.trim());
      setStep('otp');
      setOtpCode('');
      setResendCountdown(30);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to sign in. Please try again.';
      setError(errorMessage);
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingEmail) {
      setOtpError('Please restart the sign-in process.');
      return;
    }

    if (otpCode.trim().length < 6) {
      setOtpError('Enter the 6-digit verification code.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      await verifyOtp(pendingEmail, otpCode.trim());
      reset();
      setStep('credentials');
      setPendingEmail('');
      setOtpCode('');
      setResendCountdown(0);
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.message || 'We could not verify the code. Please try again.';
      setOtpError(errorMessage);
      console.error('OTP verification error:', err);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail || resendCountdown > 0) {
      return;
    }

    setOtpError('');
    setResendLoading(true);

    try {
      await resendOtp(pendingEmail);
      setResendCountdown(30);
    } catch (err: any) {
      const errorMessage = err.message || 'Unable to resend verification code. Please try again.';
      setOtpError(errorMessage);
      console.error('OTP resend error:', err);
    } finally {
      setResendLoading(false);
    }
  };

  const handleUseDifferentEmail = () => {
    setStep('credentials');
    setPendingEmail('');
    setOtpCode('');
    setOtpError('');
    setError('');
    setResendCountdown(0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div 
        className="fixed inset-0 bg-center bg-cover"
        style={{
          backgroundImage: "url('/images/Partnership%20Hub.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white/60 to-green-50/70" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
            alt="WATHACI CONNECT"
            loading="lazy"
            decoding="async"
            className="h-20 w-auto mx-auto mb-6 drop-shadow-lg"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your WATHACI account</p>
        </div>

        <Card className="border-2 border-orange-100 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-gray-900">
              {step === 'otp' ? 'Verify Sign In' : 'Sign In'}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {step === 'otp'
                ? `Enter the verification code sent to ${pendingEmail}.`
                : 'Enter your credentials to access your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'credentials' ? (
              <>
                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit(onSubmit)} autoComplete="on" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        {...register('email')}
                        className={`pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 ${
                          errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        {...register('password')}
                        className={`pl-10 pr-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400 ${
                          errors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Link to="/forgot-password" className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-3"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-gray-600">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-orange-600 hover:text-orange-700 font-medium">
                      Create one
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <>
                {otpError && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{otpError}</AlertDescription>
                  </Alert>
                )}

                <div className="mb-4 text-sm text-gray-600 text-center">
                  We sent a verification code to{' '}
                  <span className="font-medium break-all">{pendingEmail}</span>. Enter it below to continue.
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="flex justify-center">
                    <InputOTP
                      value={otpCode}
                      onChange={value => setOtpCode(value)}
                      maxLength={6}
                      inputMode="numeric"
                      pattern="\d*"
                      autoFocus
                      aria-label="One-time password"
                      containerClassName="gap-3"
                    >
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-3"
                      disabled={otpLoading}
                    >
                      {otpLoading ? 'Verifying…' : 'Verify and Continue'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResend}
                        disabled={resendLoading || resendCountdown > 0}
                        className="flex items-center gap-2"
                      >
                        <RotateCw className="h-4 w-4" />
                        {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                      </Button>

                      <Button type="button" variant="ghost" size="sm" onClick={handleUseDifferentEmail}>
                        Use a different email
                      </Button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link to="/" className="text-gray-600 hover:text-gray-800 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export { SignIn };
export default SignIn;