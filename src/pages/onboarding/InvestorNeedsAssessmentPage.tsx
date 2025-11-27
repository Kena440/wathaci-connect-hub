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
import { upsertProfile, saveInvestorNeedsAssessment } from '@/lib/onboarding';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

const investorAssessmentSchema = z.object({
  organization_name: z.string().min(2, 'Name/Organization is required'),
  investment_types: z.array(z.string()).min(1, 'Select at least one investment type'),
  ticket_size_range: z.string().min(1, 'Please select ticket size range'),
  sector_preferences: z.array(z.string()).min(1, 'Select at least one sector'),
  stage_preferences: z.array(z.string()).min(1, 'Select at least one stage'),
  geography: z.string().min(1, 'Please specify geography'),
  time_horizon: z.string().min(1, 'Please select time horizon'),
  involvement_level: z.string().min(1, 'Please select involvement level'),
  msisdn: z.string().regex(/^\+?[0-9]{9,15}$/, 'Enter a valid mobile number (9-15 digits)'),
});

type AssessmentFormData = z.infer<typeof investorAssessmentSchema>;

export const InvestorNeedsAssessmentPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedInvestmentTypes, setSelectedInvestmentTypes] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  
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
    resolver: zodResolver(investorAssessmentSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    }
  }, [user, navigate]);

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const investmentTypes = [
    'Debt',
    'Equity',
    'Convertible note',
    'Revenue-based financing',
    'SAFE',
  ];

  const ticketSizeRanges = [
    '0 - 50,000',
    '50,000 - 100,000',
    '100,000 - 500,000',
    '500,000 - 1,000,000',
    '1,000,000+',
  ];

  const sectors = [
    'Technology',
    'Agriculture',
    'Manufacturing',
    'Healthcare',
    'Education',
    'Finance',
    'Retail',
    'Energy',
  ];

  const stages = [
    'Pre-seed',
    'Seed',
    'Early growth',
    'Growth',
    'Late stage',
  ];

  const timeHorizons = [
    { value: '1-3', label: '1-3 years' },
    { value: '3-5', label: '3-5 years' },
    { value: '5-7', label: '5-7 years' },
    { value: '7+', label: '7+ years' },
  ];

  const involvementLevels = [
    { value: 'hands_off', label: 'Hands off (financial only)' },
    { value: 'board', label: 'Board observer/member' },
    { value: 'active', label: 'Active advisor' },
    { value: 'operational', label: 'Operational involvement' },
  ];

  const handleInvestmentTypeToggle = (type: string) => {
    const updated = selectedInvestmentTypes.includes(type)
      ? selectedInvestmentTypes.filter((t) => t !== type)
      : [...selectedInvestmentTypes, type];
    setSelectedInvestmentTypes(updated);
    setValue('investment_types', updated);
  };

  const handleSectorToggle = (sector: string) => {
    const updated = selectedSectors.includes(sector)
      ? selectedSectors.filter((s) => s !== sector)
      : [...selectedSectors, sector];
    setSelectedSectors(updated);
    setValue('sector_preferences', updated);
  };

  const handleStageToggle = (stage: string) => {
    const updated = selectedStages.includes(stage)
      ? selectedStages.filter((s) => s !== stage)
      : [...selectedStages, stage];
    setSelectedStages(updated);
    setValue('stage_preferences', updated);
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
        account_type: 'investor',
        business_name: data.organization_name,
        msisdn: data.msisdn,
      });

      await saveInvestorNeedsAssessment({
        investment_types: data.investment_types,
        sector_preferences: data.sector_preferences,
        stage_preferences: data.stage_preferences,
        geography: data.geography,
        time_horizon: data.time_horizon,
        involvement_level: data.involvement_level,
      });

      toast({
        title: 'Success!',
        description: 'Your investor profile has been saved.',
      });

      navigate('/investor-assessment?view=results');
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
    <AppLayout>
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/get-started')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Get Started
          </Button>
          
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Investor Profile</h1>
            <p className="text-gray-600">Tell us about your investment preferences</p>
          </div>

          <Progress value={progress} className="mb-4" />
          <p className="text-sm text-gray-600 text-center">Step {currentStep} of {totalSteps}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>
                {currentStep === 1 && 'Basic Information'}
                {currentStep === 2 && 'Investment Preferences'}
                {currentStep === 3 && 'Payment Information'}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && 'Your investor details'}
                {currentStep === 2 && 'Types of investments you make'}
                {currentStep === 3 && 'Mobile money information'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {currentStep === 1 && (
                <>
                  <div>
                    <Label htmlFor="organization_name">Name/Organization *</Label>
                    <Input
                      id="organization_name"
                      {...register('organization_name')}
                      placeholder="Your name or organization"
                    />
                    {errors.organization_name && (
                      <p className="text-sm text-red-600 mt-1">{errors.organization_name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="ticket_size_range">Typical Investment Size *</Label>
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

                  <div>
                    <Label htmlFor="geography">Geography Focus *</Label>
                    <Input
                      id="geography"
                      {...register('geography')}
                      placeholder="e.g., Zambia, East Africa, Africa"
                    />
                    {errors.geography && (
                      <p className="text-sm text-red-600 mt-1">{errors.geography.message}</p>
                    )}
                  </div>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div>
                    <Label className="mb-3 block">Investment Types *</Label>
                    <div className="space-y-2">
                      {investmentTypes.map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={selectedInvestmentTypes.includes(type)}
                            onCheckedChange={() => handleInvestmentTypeToggle(type)}
                          />
                          <Label
                            htmlFor={`type-${type}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {type}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.investment_types && (
                      <p className="text-sm text-red-600 mt-1">{errors.investment_types.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-3 block">Sector Preferences *</Label>
                    <div className="space-y-2">
                      {sectors.map((sector) => (
                        <div key={sector} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sector-${sector}`}
                            checked={selectedSectors.includes(sector)}
                            onCheckedChange={() => handleSectorToggle(sector)}
                          />
                          <Label
                            htmlFor={`sector-${sector}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {sector}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.sector_preferences && (
                      <p className="text-sm text-red-600 mt-1">{errors.sector_preferences.message}</p>
                    )}
                  </div>

                  <div>
                    <Label className="mb-3 block">Stage Preferences *</Label>
                    <div className="space-y-2">
                      {stages.map((stage) => (
                        <div key={stage} className="flex items-center space-x-2">
                          <Checkbox
                            id={`stage-${stage}`}
                            checked={selectedStages.includes(stage)}
                            onCheckedChange={() => handleStageToggle(stage)}
                          />
                          <Label
                            htmlFor={`stage-${stage}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {stage}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {errors.stage_preferences && (
                      <p className="text-sm text-red-600 mt-1">{errors.stage_preferences.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="time_horizon">Time Horizon *</Label>
                    <Select onValueChange={(value) => setValue('time_horizon', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time horizon" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeHorizons.map((horizon) => (
                          <SelectItem key={horizon.value} value={horizon.value}>
                            {horizon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.time_horizon && (
                      <p className="text-sm text-red-600 mt-1">{errors.time_horizon.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="involvement_level">Involvement Level *</Label>
                    <Select onValueChange={(value) => setValue('involvement_level', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select involvement level" />
                      </SelectTrigger>
                      <SelectContent>
                        {involvementLevels.map((level) => (
                          <SelectItem key={level.value} value={level.value}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.involvement_level && (
                      <p className="text-sm text-red-600 mt-1">{errors.involvement_level.message}</p>
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
    </AppLayout>
  );
};
