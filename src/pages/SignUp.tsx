import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Building2, Phone, UserRound } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AccountTypeSelection } from '@/components/AccountTypeSelection';
import { accountTypes } from '@/data/accountTypes';
import { registerUser } from '@/lib/api/register-user';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const signUpSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(72, 'Password must be 72 characters or fewer'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    accountType: z.enum(
      ['sole_proprietor', 'professional', 'sme', 'investor', 'donor', 'government'],
      { errorMap: () => ({ message: 'Select an account type' }) },
    ),
    company: z.string().max(200, 'Company name is too long').optional().or(z.literal('')),
    mobileNumber: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        value => !value || /[\d+()\s-]{6,20}/.test(value),
        'Enter a valid phone number or leave blank',
      ),
    termsAccepted: z.literal(true, { errorMap: () => ({ message: 'You must agree to the terms and conditions' }) }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAppContext();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      company: '',
      mobileNumber: '',
      termsAccepted: false,
    },
  });

  const onSubmit = handleSubmit(async values => {
    setSubmitError(null);

    const normalizedCompany = values.company?.trim() || null;
    const normalizedMobile = values.mobileNumber?.trim() || null;

    // Try to record registration in backend (optional - don't block on this)
    try {
      await registerUser({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        accountType: values.accountType,
        company: normalizedCompany,
        mobileNumber: normalizedMobile,
      });
    } catch (error: any) {
      // Log registration tracking failure but continue with sign-up
      console.warn('Registration tracking failed (non-critical):', error.message);
    }

    // Create the actual user account in Supabase
    try {
      await signUp(values.email.trim(), values.password, {
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        full_name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
        account_type: values.accountType,
        company: normalizedCompany,
        mobile_number: normalizedMobile,
        profile_completed: false,
      });

      navigate('/profile-setup?mode=edit');
    } catch (error: any) {
      const message = error?.message ?? 'Unable to create your account. Please try again later.';
      setSubmitError(message);
      toast({ title: 'Sign up failed', description: message, variant: 'destructive' });
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div
        className="fixed inset-0 bg-center bg-cover"
        style={{
          backgroundImage: "url('/images/Partnership%20Hub.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white/60 to-green-50/70" />
      <div className="w-full max-w-5xl relative z-10">
        <div className="text-center mb-10">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
            alt="WATHACI CONNECT"
            loading="lazy"
            decoding="async"
            className="h-20 w-auto mx-auto mb-6 drop-shadow-lg"
          />
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Create your WATHACI CONNECT account</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Join our ecosystem of entrepreneurs, professionals, investors, donors, and public sector partners.
            Tell us a little about yourself to get the right onboarding experience.
          </p>
        </div>

        <Card className="border-2 border-orange-100 shadow-xl bg-white/95">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-gray-900">Let&apos;s get started</CardTitle>
            <CardDescription className="text-gray-600">
              We&apos;ll use these details to personalize your dashboard and connect you with the right opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              {submitError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700 font-medium flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-orange-500" />
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    placeholder="Jane"
                    {...register('firstName')}
                  />
                  {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700 font-medium flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-orange-500" />
                    Last name
                  </Label>
                  <Input id="lastName" autoComplete="family-name" placeholder="Doe" {...register('lastName')} />
                  {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      className="pl-9"
                      placeholder="you@example.com"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-gray-700 font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    Company or organization (optional)
                  </Label>
                  <Input id="company" placeholder="WATHACI Ventures" {...register('company')} />
                  {errors.company && <p className="text-sm text-red-600">{errors.company.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-orange-500" />
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pl-9 pr-10"
                      placeholder="Create a strong password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-orange-500" />
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" aria-hidden="true" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="pl-9 pr-10"
                      placeholder="Re-enter your password"
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(prev => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mobileNumber" className="text-gray-700 font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-orange-500" />
                    Mobile number (optional)
                  </Label>
                  <Input
                    id="mobileNumber"
                    type="tel"
                    inputMode="tel"
                    placeholder="e.g. +260 977 000 000"
                    {...register('mobileNumber')}
                  />
                  {errors.mobileNumber && <p className="text-sm text-red-600">{errors.mobileNumber.message}</p>}
                </div>
              </div>

              <Controller
                control={control}
                name="accountType"
                render={({ field }) => (
                  <AccountTypeSelection
                    options={accountTypes}
                    selected={field.value}
                    onSelect={value => field.onChange(value)}
                    error={errors.accountType?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="termsAccepted"
                render={({ field }) => (
                  <div className="flex items-start gap-3 rounded-lg border border-orange-100 bg-orange-50/40 p-4">
                    <Checkbox
                      id="termsAccepted"
                      checked={field.value}
                      onCheckedChange={checked => field.onChange(Boolean(checked))}
                    />
                    <div className="space-y-1 text-sm text-gray-700">
                      <Label htmlFor="termsAccepted" className="font-medium text-gray-900">
                        I agree to the Terms of Service and Privacy Policy
                      </Label>
                      <p>
                        By creating an account you consent to WATHACI CONNECT storing your information in accordance with our{' '}
                        <Link to="/terms-of-service" className="text-orange-600 hover:underline font-medium">
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy-policy" className="text-orange-600 hover:underline font-medium">
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                )}
              />
              {errors.termsAccepted && <p className="text-sm text-red-600">{errors.termsAccepted.message}</p>}

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/signin" className="text-orange-600 hover:text-orange-700 font-medium">
                    Sign in
                  </Link>
                </p>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8"
                  disabled={isSubmitting || !isValid}
                >
                  {isSubmitting ? 'Creating account…' : 'Create account'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
