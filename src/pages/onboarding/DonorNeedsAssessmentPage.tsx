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
import { upsertProfile, saveDonorNeedsAssessment } from '@/lib/onboarding';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import OnboardingGraceBanner from '@/components/OnboardingGraceBanner';

const donorAssessmentSchema = z.object({
  organization_name: z.string().min(2, 'Organization name is required'),
  focus_areas: z.array(z.string()).min(1, 'Select at least one focus area'),
  ticket_size_range: z.string().min(1, 'Please select ticket size range'),
  geography_preferences: z.array(z.string()).min(1, 'Select at least one geography'),
  reporting_requirements: z.string().min(1, 'Please specify reporting requirements'),
  preferred_payment_method: z.string().min(1, 'Please select payment method'),
  msisdn: z.string().regex(/^\+?[0-9]{9,15}$/, 'Enter a valid mobile number (9-15 digits)'),
});

type AssessmentFormData = z.infer<typeof donorAssessmentSchema>;

export const DonorNeedsAssessmentPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [selectedGeographies, setSelectedGeographies] = useState<string[]>([]);
  
  const { user } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(donorAssessmentSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const focusAreas = [
    'Youth entrepreneurship',
    'Women-led businesses',
    'Climate & sustainability',
    'Agriculture',
    'Technology',
    'Healthcare',
    'Education',
    'Financial inclusion',
  ];

  const ticketSizeRanges = [
    '0 - 5,000',
    '5,000 - 20,000',
    '20,000 - 50,000',
    '50,000 - 100,000',
    '100,000+',
  ];

  const geographies = [
    'Zambia',
    'East Africa',
    'Southern Africa',
    'West Africa',
    'Africa-wide',
    'Global',
  ];

  const reportingOptions = [
    { value: 'monthly', label: 'Monthly reports' },
    { value: 'quarterly', label: 'Quarterly reports' },
    { value: 'annual', label: 'Annual reports' },
    { value: 'minimal', label: 'Minimal reporting' },
  ];

  const paymentMethods = [
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'card', label: 'Card' },
  ];

  const handleFocusAreaToggle = (area: string) => {
    const updated = selectedFocusAreas.includes(area)
      ? selectedFocusAreas.filter((a) => a !== area)
      : [...selectedFocusAreas, area];
    setSelectedFocusAreas(updated);
    setValue('focus_areas', updated);
  };

  const handleGeographyToggle = (geo: string) => {
    const updated = selectedGeographies.includes(geo)
      ? selectedGeographies.filter((g) => g !== geo)
      : [...selectedGeographies, geo];
    setSelectedGeographies(updated);
    setValue('geography_preferences', updated);
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
      await upsertProfile({
        account_type: 'donor',
        business_name: data.organization_name,
        msisdn: data.msisdn,
      });

      await saveDonorNeedsAssessment({
        focus_areas: data.focus_areas,
        geography_preferences: data.geography_preferences,
        reporting_requirements: data.reporting_requirements,
        preferred_payment_method: data.preferred_payment_method,
      });

      toast({
        title: 'Success!',
        description: 'Your donor profile has been saved.',
      });

      navigate('/donor-assessment?view=results');
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Donor Profile</h1>
            <p className="text-gray-600">Tell us about your funding priorities</p>
          </div>

          <OnboardingGraceBanner />

          <Progress value={progress} className="mb-4" />
          <p className="text-sm text-gray-600 text-center">Step {currentStep} of {totalSteps}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Organization Information'}
                {currentStep === 2 && 'Funding Priorities'}
                {currentStep === 3 && 'Payment Information'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Your organization details'}
                {currentStep === 2 && 'Where you want to make an impact'}
                {currentStep === 3 && 'Mobile money information'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <>
                  <div>
                    <Label htmlFor="organization_name">Organization Name *</Label>
                    <Input
                      id="organization_name"
                      {...register('organization_name')}
                      placeholder="Enter your organization name"
                    />
                    {errors.organization_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.organization_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="ticket_size_range">Typical Grant/Donation Size *</Label>
                    <Select onValueChange={(value) => setValue('ticket_size_range', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size range" />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketSizeRanges.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.ticket_size_range && (
                      <p className="text-sm text-red-600 mt-1">{errors.ticket_size_range.message}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div>
                    <Label className="mb-3 block">Focus Areas *</Label>
                    <div className="space-y-2">
                      {focusAreas.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            id={`focus-${area}`}
                            checked={selectedFocusAreas.includes(area)}
                            onCheckedChange={() => handleFocusAreaToggle(area)}
                          />
                          <Label
                            htmlFor={`focus-${area}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {area}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.focus_areas && (
                      <p className="text-sm text-red-600 mt-1">{errors.focus_areas.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-3 block">Geography Preferences *</Label>
                    <div className="space-y-2">
                      {geographies.map((geo) => (
                        <div key={geo} className="flex items-center space-x-2">
                          <Checkbox
                            id={`geo-${geo}`}
                            checked={selectedGeographies.includes(geo)}
                            onCheckedChange={() => handleGeographyToggle(geo)}
                          />
                          <Label
                            htmlFor={`geo-${geo}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {geo}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.geography_preferences && (
                      <p className="text-sm text-red-600 mt-1">{errors.geography_preferences.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="reporting_requirements">Reporting Requirements *</Label>
                    <Select onValueChange={(value) => setValue('reporting_requirements', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reporting requirements" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportingOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.reporting_requirements && (
                      <p className="text-sm text-red-600 mt-1">{errors.reporting_requirements.message}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div>
                    <Label htmlFor="preferred_payment_method">Preferred Payment Method *</Label>
                    <Select onValueChange={(value) => setValue('preferred_payment_method', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.preferred_payment_method && (
                      <p className="text-sm text-red-600 mt-1">{errors.preferred_payment_method.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="msisdn">Mobile Money Number (MSISDN) *</Label>
                    <Input
                      id="msisdn"
                      {...register('msisdn')}
                      placeholder="+260XXXXXXXXX"
                      type="tel"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Required for payment processing
                    </p>
                    {errors.msisdn && (
                      <p className="text-sm text-red-600 mt-1">{errors.msisdn.message}</p>
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
                    Complete Profile
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
