import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { upsertProfile, saveSmeNeedsAssessment } from '@/lib/onboarding';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import OnboardingGraceBanner from '@/components/OnboardingGraceBanner';

// Validation schema
const smeAssessmentSchema = z.object({
  business_name: z.string().min(2, 'Business name is required'),
  sector: z.string().min(1, 'Please select a sector'),
  stage: z.string().min(1, 'Please select a stage'),
  monthly_revenue_range: z.string().min(1, 'Please select a revenue range'),
  employees_count: z.number().min(0, 'Number of employees is required'),
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  main_challenges: z.array(z.string()).min(1, 'Select at least one challenge'),
  funding_amount_range: z.string().min(1, 'Please select funding amount range'),
  funding_type: z.string().min(1, 'Please select preferred funding type'),
  support_needs: z.array(z.string()).min(1, 'Select at least one support area'),
  msisdn: z.string().regex(/^\+?[0-9]{9,15}$/, 'Enter a valid mobile number (9-15 digits)'),
  has_card: z.enum(['yes', 'no']),
});

type AssessmentFormData = z.infer<typeof smeAssessmentSchema>;

export const SmeNeedsAssessmentPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [selectedSupportNeeds, setSelectedSupportNeeds] = useState<string[]>([]);
  
  const { user } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(smeAssessmentSchema),
    mode: 'onChange',
    defaultValues: {
      has_card: 'no',
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const sectors = [
    'Agriculture',
    'Manufacturing',
    'Technology',
    'Retail',
    'Services',
    'Healthcare',
    'Education',
    'Finance',
    'Tourism',
    'Other',
  ];

  const stages = [
    { value: 'idea', label: 'Idea Stage' },
    { value: 'early', label: 'Early Stage (0-2 years)' },
    { value: 'growth', label: 'Growth Stage (2-5 years)' },
    { value: 'scaling', label: 'Scaling (5+ years)' },
  ];

  const revenueRanges = [
    '0 - 5,000',
    '5,000 - 20,000',
    '20,000 - 50,000',
    '50,000 - 100,000',
    '100,000+',
  ];

  const challenges = [
    'Working capital',
    'Rent',
    'Inventory',
    'Staffing',
    'Marketing',
    'Compliance / legal',
    'Technology',
    'Other',
  ];

  const fundingAmountRanges = [
    '0 - 10,000',
    '10,000 - 50,000',
    '50,000 - 100,000',
    '100,000 - 500,000',
    '500,000+',
  ];

  const fundingTypes = [
    { value: 'grant', label: 'Grant' },
    { value: 'loan', label: 'Loan' },
    { value: 'equity', label: 'Equity Investment' },
    { value: 'revenue_based', label: 'Revenue-Based Financing' },
  ];

  const supportAreas = [
    'Financial management',
    'Legal & compliance',
    'Sales & marketing',
    'Operations',
    'Technology / digital',
    'Human resources',
    'Business strategy',
  ];

  const handleChallengeToggle = (challenge: string) => {
    const updated = selectedChallenges.includes(challenge)
      ? selectedChallenges.filter((c) => c !== challenge)
      : [...selectedChallenges, challenge];
    setSelectedChallenges(updated);
    setValue('main_challenges', updated);
  };

  const handleSupportToggle = (support: string) => {
    const updated = selectedSupportNeeds.includes(support)
      ? selectedSupportNeeds.filter((s) => s !== support)
      : [...selectedSupportNeeds, support];
    setSelectedSupportNeeds(updated);
    setValue('support_needs', updated);
  };

  const handleNext = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const onSubmit = async (data: AssessmentFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      // Step 1: Create/update profile with msisdn
      await upsertProfile({
        account_type: 'sme',
        business_name: data.business_name,
        msisdn: data.msisdn,
      });

      // Step 2: Save needs assessment
      await saveSmeNeedsAssessment({
        sector: data.sector,
        stage: data.stage,
        monthly_revenue_range: data.monthly_revenue_range,
        employees_count: data.employees_count,
        country: data.country,
        city: data.city,
        main_challenges: data.main_challenges,
        funding_amount_range: data.funding_amount_range,
        funding_type: data.funding_type,
        support_needs: data.support_needs,
      });

      toast({
        title: 'Success!',
        description: 'Your SME profile and needs assessment have been saved.',
      });

      // Redirect to dashboard or assessment results
      navigate('/sme-assessment?view=results');
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save your assessment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/get-started')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Get Started
          </Button>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SME Needs Assessment</h1>
            <p className="text-gray-600">Help us understand your business needs</p>
          </div>

          <OnboardingGraceBanner />

          <Progress value={progress} className="mb-4" />
          <p className="text-sm text-gray-600 text-center">Step {currentStep} of {totalSteps}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Business Information'}
                {currentStep === 2 && 'Challenges & Needs'}
                {currentStep === 3 && 'Funding Requirements'}
                {currentStep === 4 && 'Payment Information'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Tell us about your business'}
                {currentStep === 2 && 'What challenges are you facing?'}
                {currentStep === 3 && 'What kind of funding do you need?'}
                {currentStep === 4 && 'Mobile money information for payments'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <>
                  <div>
                    <Label htmlFor="business_name">Business Name *</Label>
                    <Input
                      id="business_name"
                      {...register('business_name')}
                      placeholder="Enter your business name"
                    />
                    {errors.business_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.business_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="sector">Sector/Industry *</Label>
                    <Select onValueChange={(value) => setValue('sector', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((sector) => (
                          <SelectItem key={sector} value={sector.toLowerCase()}>
                            {sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.sector && (
                      <p className="text-sm text-red-600 mt-1">{errors.sector.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="stage">Business Stage *</Label>
                    <Select onValueChange={(value) => setValue('stage', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.stage && (
                      <p className="text-sm text-red-600 mt-1">{errors.stage.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="monthly_revenue_range">Monthly Revenue Range *</Label>
                    <Select onValueChange={(value) => setValue('monthly_revenue_range', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select revenue range" />
                      </SelectTrigger>
                      <SelectContent>
                        {revenueRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.monthly_revenue_range && (
                      <p className="text-sm text-red-600 mt-1">{errors.monthly_revenue_range.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="employees_count">Number of Employees *</Label>
                    <Input
                      id="employees_count"
                      type="number"
                      {...register('employees_count', { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                    />
                    {errors.employees_count && (
                      <p className="text-sm text-red-600 mt-1">{errors.employees_count.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        {...register('country')}
                        placeholder="Enter country"
                      />
                      {errors.country && (
                        <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="Enter city"
                      />
                      {errors.city && (
                        <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div>
                    <Label className="mb-3 block">Main Challenges *</Label>
                    <div className="space-y-2">
                      {challenges.map((challenge) => (
                        <div key={challenge} className="flex items-center space-x-2">
                          <Checkbox
                            id={`challenge-${challenge}`}
                            checked={selectedChallenges.includes(challenge)}
                            onCheckedChange={() => handleChallengeToggle(challenge)}
                          />
                          <Label
                            htmlFor={`challenge-${challenge}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {challenge}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.main_challenges && (
                      <p className="text-sm text-red-600 mt-1">{errors.main_challenges.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-3 block">Support Needs *</Label>
                    <div className="space-y-2">
                      {supportAreas.map((support) => (
                        <div key={support} className="flex items-center space-x-2">
                          <Checkbox
                            id={`support-${support}`}
                            checked={selectedSupportNeeds.includes(support)}
                            onCheckedChange={() => handleSupportToggle(support)}
                          />
                          <Label
                            htmlFor={`support-${support}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {support}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.support_needs && (
                      <p className="text-sm text-red-600 mt-1">{errors.support_needs.message}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div>
                    <Label htmlFor="funding_amount_range">Funding Amount Needed *</Label>
                    <Select onValueChange={(value) => setValue('funding_amount_range', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select amount range" />
                      </SelectTrigger>
                      <SelectContent>
                        {fundingAmountRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.funding_amount_range && (
                      <p className="text-sm text-red-600 mt-1">{errors.funding_amount_range.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="funding_type">Preferred Funding Type *</Label>
                    <Select onValueChange={(value) => setValue('funding_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select funding type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fundingTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.funding_type && (
                      <p className="text-sm text-red-600 mt-1">{errors.funding_type.message}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div>
                    <Label htmlFor="msisdn">Mobile Money Number (MSISDN) *</Label>
                    <Input
                      id="msisdn"
                      {...register('msisdn')}
                      placeholder="+260XXXXXXXXX"
                      type="tel"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your mobile money number for payment processing
                    </p>
                    {errors.msisdn && (
                      <p className="text-sm text-red-600 mt-1">{errors.msisdn.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="has_card">Do you have a debit/credit card?</Label>
                    <Select onValueChange={(value) => setValue('has_card', value as 'yes' | 'no')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    {watch('has_card') === 'yes' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Card details can be added later in your profile
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-6">
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {currentStep < totalSteps ? (
              <Button type="button" onClick={handleNext} className="ml-auto">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={loading} className="ml-auto">
                {loading ? 'Saving...' : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Assessment
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
