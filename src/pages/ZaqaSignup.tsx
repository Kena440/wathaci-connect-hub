import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { accountTypes, type AccountTypeValue } from '@/data/accountTypes';
import { supabaseClient } from '@/lib/wathaciSupabaseClient';

/**
 * ZAQA-style Sign-Up Page for Wathaci
 * 
 * Modeled after ZAQA QMIS sign-up at https://zqmis.zaqa.gov.zm/auth/sign-up
 * 
 * Features:
 * - Headline: "Sign up. It is fast and easy."
 * - Account type selection (using existing Wathaci account types)
 * - Terms & Conditions acceptance (required)
 * - Newsletter opt-in (optional)
 * - Email + password authentication via Supabase
 * - Production-grade error handling
 */

export const ZaqaSignup = () => {
  // Step management
  const [step, setStep] = useState<'account-type' | 'form' | 'success'>('account-type');
  
  // Account type selection
  const [selectedAccountType, setSelectedAccountType] = useState<AccountTypeValue | null>(null);
  const [accountTypeError, setAccountTypeError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  /**
   * Step 1: Account Type Selection
   * User must select one of the existing Wathaci account types
   */
  const handleAccountTypeNext = () => {
    if (!selectedAccountType) {
      setAccountTypeError('Please select an account type to continue.');
      return;
    }
    setAccountTypeError(null);
    setStep('form');
  };

  /**
   * Step 2: Sign-Up Form Submission
   * Validates all fields, creates auth user, and inserts profile with new fields
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!selectedAccountType) {
      setError('Account type is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!acceptedTerms) {
      setError('You must accept the Terms & Conditions to sign up.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create auth user
      const { data: authData, error: signUpError } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            account_type: selectedAccountType,
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        console.error('Sign-up error:', signUpError);
        setError(signUpError.message);
        return;
      }

      if (!authData.user) {
        setError('Sign-up succeeded but user data is missing. Please try logging in.');
        return;
      }

      // Check if email confirmation is required
      // If session is null but user exists, email confirmation is required
      const requiresConfirmation = !authData.session && authData.user;
      setEmailConfirmationRequired(requiresConfirmation);

      // Step 2: Insert/update profile with new fields
      // Note: The trigger handle_new_auth_user() may have already created a basic profile
      // We'll use upsert to ensure the profile has all the data we need
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: email.trim(),
          account_type: selectedAccountType,
          first_name: fullName.trim().split(' ')[0] || fullName.trim(),
          last_name: fullName.trim().split(' ').slice(1).join(' ') || null,
          accepted_terms: acceptedTerms,
          newsletter_opt_in: newsletterOptIn,
          profile_completed: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't block signup success if profile update fails
        // User can complete profile later
        console.warn('Profile creation failed but auth succeeded:', profileError.message);
      }

      // Move to success screen
      setStep('success');
    } catch (err) {
      console.error('Unexpected error during signup:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white via-orange-50 to-green-100 p-6">
      <div className="w-full max-w-4xl">
        {/* Logo and Main Heading */}
        <div className="mb-8 text-center">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
            alt="Wathaci Connect"
            className="mx-auto h-16 w-auto"
            loading="lazy"
            decoding="async"
          />
          <h1 className="mt-6 text-4xl font-bold text-gray-900">
            Sign up. It is fast and easy.
          </h1>
          <p className="mt-2 text-gray-600">
            Join Wathaci Connect to access funding, professional services, and partnerships.
          </p>
        </div>

        {/* Step 1: Account Type Selection */}
        {step === 'account-type' && (
          <Card className="mx-auto max-w-4xl bg-white/90 shadow-xl ring-1 ring-orange-100/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl">Select Account Type</CardTitle>
              <CardDescription>
                Choose the account type that best describes you. This will help us personalize your experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={selectedAccountType || ''}
                onValueChange={(value) => {
                  setSelectedAccountType(value as AccountTypeValue);
                  setAccountTypeError(null);
                }}
                className="grid gap-4 md:grid-cols-2"
              >
                {accountTypes.map((accountType) => {
                  const Icon = accountType.icon;
                  const isSelected = accountType.value === selectedAccountType;

                  return (
                    <Label
                      key={accountType.value}
                      htmlFor={`account-type-${accountType.value}`}
                      className={`cursor-pointer rounded-lg transition-transform ${
                        isSelected ? '' : 'hover:-translate-y-0.5'
                      }`}
                    >
                      <RadioGroupItem
                        value={accountType.value}
                        id={`account-type-${accountType.value}`}
                        className="sr-only"
                      />
                      <Card
                        className={`h-full transition-shadow ${
                          isSelected
                            ? 'border-blue-500 shadow-lg ring-2 ring-blue-200'
                            : 'hover:border-blue-300 hover:shadow-md'
                        }`}
                      >
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`rounded-md p-2 ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{accountType.label}</CardTitle>
                              <CardDescription className="mt-1 text-sm">
                                {accountType.description}
                              </CardDescription>
                            </div>
                          </div>
                          {isSelected && (
                            <Badge className="border-blue-200 bg-blue-100 text-blue-700">
                              Selected
                            </Badge>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Ideal for
                            </p>
                            <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
                              {accountType.idealFor.slice(0, 2).map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </Label>
                  );
                })}
              </RadioGroup>

              {accountTypeError && (
                <Alert variant="destructive">
                  <AlertDescription>{accountTypeError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleAccountTypeNext}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue to Sign Up
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Sign-Up Form */}
        {step === 'form' && selectedAccountType && (
          <Card className="mx-auto max-w-2xl bg-white/90 shadow-xl ring-1 ring-orange-100/60 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription className="mt-1">
                    Account type:{' '}
                    <span className="font-semibold text-blue-600">
                      {accountTypes.find((at) => at.value === selectedAccountType)?.label}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('account-type')}
                  disabled={loading}
                >
                  Change
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john.doe@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Password <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Use at least 8 characters with a mix of letters and numbers.
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    disabled={loading}
                  />
                </div>

                {/* Terms & Conditions Checkbox (Required) */}
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      disabled={loading}
                      className="mt-1"
                    />
                    <Label
                      htmlFor="terms"
                      className="cursor-pointer text-sm font-normal leading-relaxed"
                    >
                      I have read and accept the{' '}
                      <Link
                        to="/terms-of-service"
                        target="_blank"
                        className="font-semibold text-blue-600 underline hover:text-blue-700"
                      >
                        Terms & Conditions
                      </Link>
                      . <span className="text-red-600">*</span>
                    </Label>
                  </div>

                  {/* Newsletter Opt-In Checkbox (Optional) */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="newsletter"
                      checked={newsletterOptIn}
                      onCheckedChange={(checked) => setNewsletterOptIn(checked === true)}
                      disabled={loading}
                      className="mt-1"
                    />
                    <Label
                      htmlFor="newsletter"
                      className="cursor-pointer text-sm font-normal leading-relaxed"
                    >
                      Send me the Wathaci newsletter monthly with updates, tips, and opportunities.
                    </Label>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Sign up now'}
                </Button>

                {/* Privacy Notice */}
                <p className="text-xs text-gray-500">
                  By signing up, you agree to our data processing practices. We will never share your
                  information without your consent.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success Screen */}
        {step === 'success' && (
          <Card className="mx-auto max-w-2xl bg-white/90 shadow-xl ring-1 ring-green-100/60 backdrop-blur">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-green-900">Account Created Successfully!</CardTitle>
                  <CardDescription className="mt-1">
                    Welcome to Wathaci Connect
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {emailConfirmationRequired ? (
                <>
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertDescription className="text-sm">
                      <strong className="font-semibold">Please check your email to confirm your account.</strong>
                      <br />
                      We've sent a confirmation link to <strong>{email}</strong>. Click the link in the email
                      to activate your account, then return here to log in.
                    </AlertDescription>
                  </Alert>
                  <p className="text-sm text-gray-600">
                    Didn't receive the email? Check your spam folder or contact support if you need assistance.
                  </p>
                </>
              ) : (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-sm">
                    Your account has been created and you're ready to go! You can now log in and start using
                    Wathaci Connect.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => (window.location.href = '/signin')}
                >
                  Go to Login
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => (window.location.href = '/')}
                >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Already have an account link - shown on account-type and form steps */}
        {(step === 'account-type' || step === 'form') && (
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/signin" className="font-semibold text-blue-600 hover:text-blue-700">
              Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ZaqaSignup;
