import { useEffect, useMemo, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Building2, Briefcase, Heart, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { LoadingScreen } from '@/components/LoadingScreen';
import { upsertProfile, type ProfileParams } from '@/lib/onboarding';

const ACCOUNT_TYPE_OPTIONS = ['sme', 'professional', 'donor', 'investor'] as const;

export type AccountType = (typeof ACCOUNT_TYPE_OPTIONS)[number];

const accountTypeSchema = z.enum(ACCOUNT_TYPE_OPTIONS, {
  required_error: 'Please select an account type to continue.',
});

const getStartedSchema = z
  .object({
    accountType: accountTypeSchema,
    msisdn: z
      .string({ required_error: 'Mobile money number is required.' })
      .trim()
      .min(1, 'Mobile money number is required.')
      .regex(/^\+?\d{9,15}$/u, 'Enter a valid mobile money number (9-15 digits).'),
    businessName: z.string().optional(),
    professionalName: z.string().optional(),
    donorInvestorName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const ensureValue = (value: string | undefined) => value?.trim().length;

    if (data.accountType === 'professional' && !ensureValue(data.professionalName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Name or firm name is required for professionals.',
        path: ['professionalName'],
      });
    }

    if (data.accountType === 'donor' && !ensureValue(data.donorInvestorName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Donor name is required to continue.',
        path: ['donorInvestorName'],
      });
    }

    if (data.accountType === 'investor' && !ensureValue(data.donorInvestorName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Investor name is required to continue.',
        path: ['donorInvestorName'],
      });
    }

    if (data.accountType === 'sme' && !ensureValue(data.businessName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Business name is required for SMEs.',
        path: ['businessName'],
      });
    }
  });

export type GetStartedFormValues = z.infer<typeof getStartedSchema>;

const accountTypeRoutes: Record<AccountType, string> = {
  sme: '/onboarding/sme/needs-assessment',
  professional: '/onboarding/professional/needs-assessment',
  donor: '/onboarding/donor/needs-assessment',
  investor: '/onboarding/investor/needs-assessment',
};

const identityFieldConfig: Record<
  AccountType,
  | {
      name: 'professionalName' | 'businessName' | 'donorInvestorName';
      label: string;
      placeholder: string;
      description?: string;
    }
  | null
> = {
  sme: {
    name: 'businessName',
    label: 'Business Name',
    placeholder: 'e.g. BrightFuture Enterprises',
    description: 'Provide the registered or trading name of your business.',
  },
  professional: {
    name: 'professionalName',
    label: 'Name or Firm Name',
    placeholder: 'e.g. Ama Mensah Consulting',
    description: 'We use this to set up your professional profile.',
  },
  donor: {
    name: 'donorInvestorName',
    label: 'Donor Name',
    placeholder: 'e.g. Impact Builders Foundation',
    description: 'Tell us how you would like your donor profile to appear.',
  },
  investor: {
    name: 'donorInvestorName',
    label: 'Investor Name',
    placeholder: 'e.g. Growth Catalyst Partners',
    description: 'This helps us personalise the investor onboarding experience.',
  },
};

const accountTypeCards: Array<{
  value: AccountType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    value: 'sme',
    label: 'SME',
    description: 'Structured onboarding for established small and medium enterprises.',
    icon: Building2,
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Designed for consultants, advisors, and service providers.',
    icon: Briefcase,
  },
  {
    value: 'donor',
    label: 'Donor',
    description: 'Tailored setup for foundations, NGOs, and philanthropic funders.',
    icon: Heart,
  },
  {
    value: 'investor',
    label: 'Investor',
    description: 'Guided flow for angels, funds, and investment teams.',
    icon: TrendingUp,
  },
];

export const GetStartedPage = () => {
  const { user, loading } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<GetStartedFormValues>({
    resolver: zodResolver(getStartedSchema),
    mode: 'onSubmit',
    shouldUnregister: true,
    defaultValues: {
      accountType: undefined as unknown as AccountType,
      msisdn: '',
    },
  });

  const accountType = form.watch('accountType');
  const identityField = useMemo(() => {
    if (!accountType) return null;
    return identityFieldConfig[accountType];
  }, [accountType]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [loading, user, navigate]);

  const handleSubmitForm = async (values: GetStartedFormValues) => {
    if (!user) {
      toast({
        title: 'Please sign in to continue',
        description: 'Sign in or create an account before completing onboarding.',
        variant: 'destructive',
      });
      navigate('/signin');
      return;
    }

    const payload: ProfileParams = {
      account_type: values.accountType,
      msisdn: values.msisdn.trim(),
    };

    if (values.accountType === 'professional') {
      const name = values.professionalName?.trim();
      if (name) {
        payload.full_name = name;
        payload.business_name = name;
      }
    }

    if (values.accountType === 'donor' || values.accountType === 'investor') {
      const identity = values.donorInvestorName?.trim();
      if (identity) {
        payload.business_name = identity;
        payload.full_name = identity;
      }
    }

    if (values.accountType === 'sme') {
      const businessName = values.businessName?.trim();
      if (businessName) {
        payload.business_name = businessName;
      }
    }

    try {
      await upsertProfile(payload);
      toast({
        title: 'Profile details saved',
        description: 'Next, let’s complete your needs assessment.',
      });
      navigate(accountTypeRoutes[values.accountType]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast({
        title: 'Unable to continue',
        description: message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <LoadingScreen message="Preparing your onboarding experience..." />;
  }

  if (!user) {
    return null;
  }

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = form;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 py-12 px-4">
      <div className="mx-auto w-full max-w-4xl">
        <Card className="border-orange-100 shadow-xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-semibold text-gray-900">Get Started</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Choose your account type, share a few details, and we’ll take you to the right needs
              assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-8">
                <FormField
                  control={control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">Account type</FormLabel>
                      <FormDescription>
                        The experience is customised for each account type. Pick the one that best
                        matches your goals.
                      </FormDescription>
                      <div
                        role="radiogroup"
                        aria-label="Account type"
                        className="mt-4 grid gap-4 md:grid-cols-2"
                      >
                        {accountTypeCards.map(({ value, label, description, icon: Icon }) => {
                          const isActive = field.value === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={isActive}
                              onClick={() => field.onChange(value)}
                              className={cn(
                                'flex h-full w-full flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                                isActive
                                  ? 'border-orange-400 bg-orange-50 shadow-md'
                                  : 'border-orange-100 hover:border-orange-200 hover:shadow-sm'
                              )}
                            >
                              <span className="flex items-center justify-center rounded-full bg-orange-100 p-3 text-orange-600">
                                <Icon className="h-6 w-6" aria-hidden="true" />
                              </span>
                              <div>
                                <p className="text-lg font-semibold text-gray-900">{label}</p>
                                <p className="mt-1 text-sm text-gray-600">{description}</p>
                              </div>
                              <span className="mt-auto text-sm font-medium text-orange-600">
                                {isActive ? 'Selected' : 'Select'} {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {identityField ? (
                  <FormField
                    key={identityField.name}
                    control={control}
                    name={identityField.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{identityField.label} *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ''}
                            placeholder={identityField.placeholder}
                            autoComplete="organization"
                          />
                        </FormControl>
                        {identityField.description ? (
                          <FormDescription>{identityField.description}</FormDescription>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                <FormField
                  control={control}
                  name="msisdn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile money number *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="e.g. +233501234567"
                        />
                      </FormControl>
                      <FormDescription>
                        We’ll use this MSISDN for transactions and to pre-fill your payment details.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-600">
                    After this step you’ll complete a short needs assessment tailored to your
                    account type.
                  </p>
                  <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                    {isSubmitting ? 'Saving...' : 'Continue'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GetStartedPage;
