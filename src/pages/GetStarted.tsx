import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Building, Eye, EyeOff, Phone } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { validatePhoneNumber } from '@/lib/payment-config';

// Validation schema
const getStartedSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    mobileNumber: z
      .string()
      .optional()
      .refine((phone) => {
        if (!phone || phone.trim() === '') return true; // Optional field
        return validatePhoneNumber(phone);
      }, {
        message: 'Please enter a valid mobile money number (e.g., +260 96 1234567)',
      }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/\d/, 'Password must include a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    company: z.string().optional(),
    accountType: z.string().min(1, 'Account type is required'),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: 'You must agree to the terms and conditions',
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type GetStartedFormData = z.infer<typeof getStartedSchema>;

export const GetStarted = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { signUp } = useAppContext();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<GetStartedFormData>({
    resolver: zodResolver(getStartedSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: '',
      password: '',
      confirmPassword: '',
      company: '',
      accountType: '',
      agreeToTerms: false,
    },
  });

  const onSubmit = async (data: GetStartedFormData) => {
    setLoading(true);
    setServerError('');

    try {
      await signUp(data.email, data.password, {
        first_name: data.firstName,
        last_name: data.lastName,
        company: data.company,
        account_type: data.accountType,
        mobile_number: data.mobileNumber || null,
        full_name: `${data.firstName} ${data.lastName}`,
        profile_completed: false,
      });

      navigate('/profile-setup');
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-center bg-cover flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: "url('/images/Partnership%20Hub.png')",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white/60 to-green-50/70" />
      <Card className="w-full max-w-lg relative z-10">
      <CardHeader className="text-center">
        <img
          src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
          alt="WATHACI CONNECT"
          loading="lazy"
          decoding="async"
          className="h-20 w-auto mx-auto mb-4 drop-shadow-lg"
        />
        <CardTitle className="text-2xl">Get Started</CardTitle>
        <CardDescription>Create your WATHACI account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="firstName"
                  placeholder="First name"
                  {...register('firstName')}
                  className={`pl-10 ${errors.firstName ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {errors.firstName && (
                <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                {...register('lastName')}
                className={errors.lastName ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email')}
                className={`pl-10 ${errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobileNumber">Mobile Number (Optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="mobileNumber"
                type="tel"
                placeholder="e.g., +260 96 1234567"
                {...register('mobileNumber')}
                className={`pl-10 ${errors.mobileNumber ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
              />
            </div>
            {errors.mobileNumber && (
              <p className="text-sm text-red-600 mt-1">{errors.mobileNumber.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Add your mobile number for mobile money payments (MTN, Airtel, Zamtel)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Company (Optional)</Label>
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="company"
                placeholder="Company name"
                {...register('company')}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountType">Account Type</Label>
            <Controller
              name="accountType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="sme">Small & Medium Enterprise</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="donor">Donor</SelectItem>
                    <SelectItem value="government">Government Institution</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accountType && (
              <p className="text-sm text-red-600 mt-1">{errors.accountType.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  {...register('password')}
                  className={`pl-10 pr-10 ${errors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  {...register('confirmPassword')}
                  className={`pr-10 ${errors.confirmPassword ? 'border-red-300 focus:border-red-400 focus:ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="agreeToTerms"
              control={control}
              render={({ field }) => (
                <Checkbox id="terms" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="terms" className="text-sm">
              I agree to the{' '}
              <Link to="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </Label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600 mt-1">{errors.agreeToTerms.message}</p>
          )}

          <Button type="submit" className="w-full" disabled={!isValid || loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/signin" className="text-blue-600 hover:underline font-medium">
            Sign In
          </Link>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};

