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
import { upsertProfile, saveProfessionalNeedsAssessment } from '@/lib/onboarding';
import { getProfessionalProfile } from '@/lib/api/profile-onboarding';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

const professionalAssessmentSchema = z.object({
  full_name: z.string().min(2, 'Full name is required'),
  expertise_areas: z.array(z.string()).min(1, 'Select at least one area of expertise'),
  years_of_experience: z.number().min(0, 'Years of experience is required'),
  preferred_sme_segments: z.array(z.string()).min(1, 'Select at least one SME segment'),
  availability: z.string().min(1, 'Please specify your availability'),
  engagement_type: z.string().min(1, 'Please select engagement type'),
  msisdn: z.string().regex(/^\+?[0-9]{9,15}$/, 'Enter a valid mobile number (9-15 digits)'),
});

type AssessmentFormData = z.infer<typeof professionalAssessmentSchema>;

export const ProfessionalNeedsAssessmentPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  
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
    resolver: zodResolver(professionalAssessmentSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    const checkProfile = async () => {
      const profileRecord = await getProfessionalProfile();
      if (!profileRecord) {
        navigate('/onboarding/professional');
      }
    };

    void checkProfile();
  }, [user, navigate]);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const expertiseAreas = [
    'Financial management',
    'Legal & compliance',
    'Marketing & sales',
    'Operations management',
    'Technology / IT',
    'Human resources',
    'Business strategy',
    'Product development',
  ];

  const smeSegments = [
    'Early-stage startups',
    'Growth-stage SMEs',
    'Technology companies',
    'Retail businesses',
    'Manufacturing',
    'Agriculture',
    'Services',
    'Healthcare',
  ];

  const engagementTypes = [
    { value: 'paid', label: 'Paid consultancy' },
    { value: 'pro_bono', label: 'Pro bono (volunteer)' },
    { value: 'hybrid', label: 'Hybrid (mix of paid and pro bono)' },
  ];

  const handleExpertiseToggle = (area: string) => {
    const updated = selectedExpertise.includes(area)
      ? selectedExpertise.filter((e) => e !== area)
      : [...selectedExpertise, area];
    setSelectedExpertise(updated);
    setValue('expertise_areas', updated);
  };

  const handleSegmentToggle = (segment: string) => {
    const updated = selectedSegments.includes(segment)
      ? selectedSegments.filter((s) => s !== segment)
      : [...selectedSegments, segment];
    setSelectedSegments(updated);
    setValue('preferred_sme_segments', updated);
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
        account_type: 'professional',
        full_name: data.full_name,
        msisdn: data.msisdn,
      });

      await saveProfessionalNeedsAssessment({
        expertise_areas: data.expertise_areas,
        years_of_experience: data.years_of_experience,
        preferred_sme_segments: data.preferred_sme_segments,
        availability: data.availability,
        engagement_type: data.engagement_type,
      });

      toast({
        title: 'Success!',
        description: 'Your professional profile has been saved.',
      });

      navigate('/professional-assessment?view=results');
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Professional Profile</h1>
            <p className="text-gray-600">Tell us about your expertise</p>
          </div>

          <Progress value={progress} className="mb-4" />
          <p className="text-sm text-gray-600 text-center">Step {currentStep} of {totalSteps}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Basic Information'}
                {currentStep === 2 && 'Expertise & Preferences'}
                {currentStep === 3 && 'Payment Information'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Your professional details'}
                {currentStep === 2 && 'Areas where you can help SMEs'}
                {currentStep === 3 && 'Mobile money information'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <>
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      {...register('full_name')}
                      placeholder="Enter your full name"
                    />
                    {errors.full_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="years_of_experience">Years of Experience *</Label>
                    <Input
                      id="years_of_experience"
                      type="number"
                      {...register('years_of_experience', { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                    />
                    {errors.years_of_experience && (
                      <p className="text-sm text-red-600 mt-1">{errors.years_of_experience.message}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div>
                    <Label className="mb-3 block">Areas of Expertise *</Label>
                    <div className="space-y-2">
                      {expertiseAreas.map((area) => (
                        <div key={area} className="flex items-center space-x-2">
                          <Checkbox
                            id={`expertise-${area}`}
                            checked={selectedExpertise.includes(area)}
                            onCheckedChange={() => handleExpertiseToggle(area)}
                          />
                          <Label
                            htmlFor={`expertise-${area}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {area}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.expertise_areas && (
                      <p className="text-sm text-red-600 mt-1">{errors.expertise_areas.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-3 block">Preferred SME Segments *</Label>
                    <div className="space-y-2">
                      {smeSegments.map((segment) => (
                        <div key={segment} className="flex items-center space-x-2">
                          <Checkbox
                            id={`segment-${segment}`}
                            checked={selectedSegments.includes(segment)}
                            onCheckedChange={() => handleSegmentToggle(segment)}
                          />
                          <Label
                            htmlFor={`segment-${segment}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {segment}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.preferred_sme_segments && (
                      <p className="text-sm text-red-600 mt-1">{errors.preferred_sme_segments.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="availability">Availability (hours per week/month) *</Label>
                    <Input
                      id="availability"
                      {...register('availability')}
                      placeholder="e.g., 10 hours per week"
                    />
                    {errors.availability && (
                      <p className="text-sm text-red-600 mt-1">{errors.availability.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="engagement_type">Engagement Type *</Label>
                    <Select onValueChange={(value) => setValue('engagement_type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select engagement type" />
                      </SelectTrigger>
                      <SelectContent>
                        {engagementTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.engagement_type && (
                      <p className="text-sm text-red-600 mt-1">{errors.engagement_type.message}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 3 && (
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
                      Required for receiving payments from SMEs
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
