import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp,
  Target,
  HandHeart,
  Building,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';

// Assessment form validation schema
const assessmentSchema = z.object({
  // Investment Preferences
  investment_amount_min: z.number().min(0, 'Minimum investment amount must be positive'),
  investment_amount_max: z.number().min(0, 'Maximum investment amount must be positive'),
  investment_horizon: z.enum(['short_term', 'medium_term', 'long_term']),
  risk_tolerance: z.enum(['low', 'moderate', 'high']),
  
  // Support Types
  support_types: z.array(z.string()).min(1, 'Select at least one support type'),
  technical_assistance_areas: z.array(z.string()),
  mentorship_availability: z.boolean(),
  
  // Business Preferences
  preferred_industries: z.array(z.string()).min(1, 'Select at least one industry'),
  business_stages: z.array(z.string()).min(1, 'Select at least one business stage'),
  geographic_focus: z.array(z.string()),
  
  // Investment Structure
  equity_percentage_min: z.number().min(0).max(100),
  equity_percentage_max: z.number().min(0).max(100),
  board_participation: z.boolean(),
  follow_on_investment: z.boolean(),
  
  // Due Diligence
  due_diligence_requirements: z.array(z.string()),
  decision_timeline: z.string().min(1, 'Please specify decision timeline'),
  investment_committee: z.boolean(),
  
  // Impact & ESG
  impact_focus: z.boolean(),
  esg_criteria: z.array(z.string()),
  social_impact_importance: z.number().min(1).max(5),
  
  // Co-investment
  co_investment_interest: z.boolean(),
  lead_investor_preference: z.enum(['lead', 'follow', 'either']),
  syndicate_participation: z.boolean(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface InvestorNeedsAssessmentProps {
  onComplete: (data: any) => void;
  onSkip: () => void;
}

export const InvestorNeedsAssessment = ({ onComplete, onSkip }: InvestorNeedsAssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedSupportTypes, setSelectedSupportTypes] = useState<string[]>([]);
  const [selectedTechAreas, setSelectedTechAreas] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedBusinessStages, setSelectedBusinessStages] = useState<string[]>([]);
  const [selectedGeographicFocus, setSelectedGeographicFocus] = useState<string[]>([]);
  const [selectedDueDiligence, setSelectedDueDiligence] = useState<string[]>([]);
  const [selectedESGCriteria, setSelectedESGCriteria] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { user } = useAppContext();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    mode: 'onChange',
  });

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const supportTypes = [
    'Financial Investment',
    'Technical Assistance',
    'Mentorship',
    'Strategic Guidance',
    'Network Access',
    'Market Connections',
    'Operational Support',
    'Technology Transfer'
  ];

  const technicalAssistanceAreas = [
    'Business Strategy',
    'Financial Management',
    'Marketing & Sales',
    'Operations',
    'Technology Implementation',
    'Legal & Compliance',
    'Human Resources',
    'Export/International Trade'
  ];

  const industries = [
    'Agriculture & Agritech',
    'Technology & Software',
    'Manufacturing',
    'Healthcare',
    'Education',
    'Financial Services',
    'Renewable Energy',
    'Transportation',
    'Retail & E-commerce',
    'Tourism & Hospitality',
    'Mining',
    'Construction'
  ];

  const businessStages = [
    'Idea/Concept Stage',
    'Early Stage/Startup',
    'Growth Stage',
    'Expansion Stage',
    'Mature/Established'
  ];

  const geographicOptions = [
    'Lusaka',
    'Copperbelt',
    'Southern Province',
    'Eastern Province',
    'Western Province',
    'Northern Province',
    'Luapula Province',
    'North-Western Province',
    'Muchinga Province',
    'Central Province',
    'Regional (SADC)',
    'International'
  ];

  const dueDiligenceRequirements = [
    'Financial Statements (3 years)',
    'Business Plan',
    'Management Team CVs',
    'Market Analysis',
    'Legal Documentation',
    'Intellectual Property Portfolio',
    'Customer References',
    'Regulatory Compliance Certificates',
    'Insurance Documentation',
    'Tax Clearance'
  ];

  const esgCriteria = [
    'Environmental Impact',
    'Social Responsibility',
    'Corporate Governance',
    'Women Empowerment',
    'Youth Employment',
    'Community Development',
    'Sustainable Practices',
    'Ethical Business Practices'
  ];

  const handleNext = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateInvestorProfile = (data: AssessmentFormData): any => {
    // Calculate investor profile metrics
    const avgInvestmentAmount = (data.investment_amount_min + data.investment_amount_max) / 2;
    const riskScore = data.risk_tolerance === 'high' ? 3 : data.risk_tolerance === 'moderate' ? 2 : 1;
    const impactScore = data.impact_focus ? data.social_impact_importance : 0;
    
    return {
      investment_capacity: avgInvestmentAmount,
      risk_profile: riskScore,
      impact_orientation: impactScore,
      diversification_level: data.preferred_industries.length,
      hands_on_involvement: data.mentorship_availability || data.board_participation,
      co_investment_readiness: data.co_investment_interest
    };
  };

  const generateInvestmentStrategy = (data: AssessmentFormData): string[] => {
    const strategies = [];
    
    if (data.risk_tolerance === 'low') {
      strategies.push('Focus on established businesses with proven track records');
    }
    if (data.impact_focus) {
      strategies.push('Prioritize investments with measurable social impact');
    }
    if (data.co_investment_interest) {
      strategies.push('Participate in syndicated investment opportunities');
    }
    if (data.mentorship_availability) {
      strategies.push('Leverage hands-on mentorship for portfolio companies');
    }
    
    return strategies;
  };

  const onSubmit = async (data: AssessmentFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Calculate investor profile and strategy
      const investorProfile = calculateInvestorProfile(data);
      const investmentStrategy = generateInvestmentStrategy(data);
      
      // Prepare assessment data for database
      const assessmentData = {
        user_id: user.id,
        investment_amount_min: data.investment_amount_min,
        investment_amount_max: data.investment_amount_max,
        investment_horizon: data.investment_horizon,
        risk_tolerance: data.risk_tolerance,
        support_types: data.support_types,
        technical_assistance_areas: data.technical_assistance_areas,
        mentorship_availability: data.mentorship_availability,
        preferred_industries: data.preferred_industries,
        business_stages: data.business_stages,
        geographic_focus: data.geographic_focus,
        equity_percentage_min: data.equity_percentage_min,
        equity_percentage_max: data.equity_percentage_max,
        board_participation: data.board_participation,
        follow_on_investment: data.follow_on_investment,
        due_diligence_requirements: data.due_diligence_requirements,
        decision_timeline: data.decision_timeline,
        investment_committee: data.investment_committee,
        impact_focus: data.impact_focus,
        esg_criteria: data.esg_criteria,
        social_impact_importance: data.social_impact_importance,
        co_investment_interest: data.co_investment_interest,
        lead_investor_preference: data.lead_investor_preference,
        syndicate_participation: data.syndicate_participation,
        investor_profile: investorProfile,
        investment_strategy: investmentStrategy,
        completed_at: new Date().toISOString(),
      };

      // Save to database
      const { data: savedAssessment, error } = await supabase
        .from('investor_needs_assessments')
        .insert([assessmentData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Assessment completed!",
        description: "Your investment preferences have been saved successfully.",
      });

      onComplete({
        assessment: savedAssessment,
        profile: investorProfile,
        strategy: investmentStrategy
      });
      
    } catch (error: any) {
      console.error('Assessment submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Multi-select checkbox handlers
  const handleSupportTypeChange = (type: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedSupportTypes, type]
      : selectedSupportTypes.filter(t => t !== type);
    setSelectedSupportTypes(updated);
    setValue('support_types', updated);
  };

  const handleTechAreaChange = (area: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedTechAreas, area]
      : selectedTechAreas.filter(a => a !== area);
    setSelectedTechAreas(updated);
    setValue('technical_assistance_areas', updated);
  };

  const handleIndustryChange = (industry: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedIndustries, industry]
      : selectedIndustries.filter(i => i !== industry);
    setSelectedIndustries(updated);
    setValue('preferred_industries', updated);
  };

  const handleBusinessStageChange = (stage: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedBusinessStages, stage]
      : selectedBusinessStages.filter(s => s !== stage);
    setSelectedBusinessStages(updated);
    setValue('business_stages', updated);
  };

  const handleGeographicChange = (location: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedGeographicFocus, location]
      : selectedGeographicFocus.filter(l => l !== location);
    setSelectedGeographicFocus(updated);
    setValue('geographic_focus', updated);
  };

  const handleDueDiligenceChange = (requirement: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedDueDiligence, requirement]
      : selectedDueDiligence.filter(r => r !== requirement);
    setSelectedDueDiligence(updated);
    setValue('due_diligence_requirements', updated);
  };

  const handleESGChange = (criteria: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedESGCriteria, criteria]
      : selectedESGCriteria.filter(c => c !== criteria);
    setSelectedESGCriteria(updated);
    setValue('esg_criteria', updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                Investor Needs Assessment
              </CardTitle>
              <CardDescription>
                Help us understand your investment preferences and criteria
              </CardDescription>
            </div>
            <Badge variant="outline">Step {currentStep} of {totalSteps}</Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Investment Capacity & Risk */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <DollarSign className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Investment Capacity & Risk Profile</h3>
                  <p className="text-gray-600">Tell us about your investment budget and risk tolerance</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Investment Amount (ZMW)</Label>
                    <Input
                      type="number"
                      {...register('investment_amount_min', { valueAsNumber: true })}
                      placeholder="e.g., 50000"
                    />
                    {errors.investment_amount_min && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.investment_amount_min.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div>
                    <Label>Maximum Investment Amount (ZMW)</Label>
                    <Input
                      type="number"
                      {...register('investment_amount_max', { valueAsNumber: true })}
                      placeholder="e.g., 500000"
                    />
                    {errors.investment_amount_max && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.investment_amount_max.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Investment Horizon</Label>
                  <Select onValueChange={(value) => setValue('investment_horizon', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your investment timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_term">Short Term (1-3 years)</SelectItem>
                      <SelectItem value="medium_term">Medium Term (3-7 years)</SelectItem>
                      <SelectItem value="long_term">Long Term (7+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Risk Tolerance</Label>
                  <RadioGroup 
                    onValueChange={(value) => setValue('risk_tolerance', value as any)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="risk-low" />
                      <Label htmlFor="risk-low">Low Risk - Prefer established, stable businesses</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="moderate" id="risk-moderate" />
                      <Label htmlFor="risk-moderate">Moderate Risk - Balanced growth opportunities</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="risk-high" />
                      <Label htmlFor="risk-high">High Risk - Early stage, high growth potential</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Step 2: Support Types */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <HandHeart className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Types of Support</h3>
                  <p className="text-gray-600">What types of support can you provide beyond financial investment?</p>
                </div>

                <div>
                  <Label>Support Types (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {supportTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedSupportTypes.includes(type)}
                          onCheckedChange={(checked) => 
                            handleSupportTypeChange(type, checked as boolean)
                          }
                        />
                        <Label htmlFor={type} className="text-sm">{type}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.support_types && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.support_types.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Technical Assistance Areas (If applicable)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {technicalAssistanceAreas.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={area}
                          checked={selectedTechAreas.includes(area)}
                          onCheckedChange={(checked) => 
                            handleTechAreaChange(area, checked as boolean)
                          }
                        />
                        <Label htmlFor={area} className="text-sm">{area}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mentorship"
                    onCheckedChange={(checked) => setValue('mentorship_availability', checked as boolean)}
                  />
                  <Label htmlFor="mentorship">Available for ongoing mentorship and guidance</Label>
                </div>
              </div>
            )}

            {/* Step 3: Business Preferences */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Building className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Business Preferences</h3>
                  <p className="text-gray-600">What types of businesses are you interested in supporting?</p>
                </div>

                <div>
                  <Label>Preferred Industries</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {industries.map((industry) => (
                      <div key={industry} className="flex items-center space-x-2">
                        <Checkbox
                          id={industry}
                          checked={selectedIndustries.includes(industry)}
                          onCheckedChange={(checked) => 
                            handleIndustryChange(industry, checked as boolean)
                          }
                        />
                        <Label htmlFor={industry} className="text-sm">{industry}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.preferred_industries && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.preferred_industries.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Business Stages</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {businessStages.map((stage) => (
                      <div key={stage} className="flex items-center space-x-2">
                        <Checkbox
                          id={stage}
                          checked={selectedBusinessStages.includes(stage)}
                          onCheckedChange={(checked) => 
                            handleBusinessStageChange(stage, checked as boolean)
                          }
                        />
                        <Label htmlFor={stage} className="text-sm">{stage}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.business_stages && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.business_stages.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Geographic Focus (Optional)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {geographicOptions.map((location) => (
                      <div key={location} className="flex items-center space-x-2">
                        <Checkbox
                          id={location}
                          checked={selectedGeographicFocus.includes(location)}
                          onCheckedChange={(checked) => 
                            handleGeographicChange(location, checked as boolean)
                          }
                        />
                        <Label htmlFor={location} className="text-sm">{location}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Investment Structure */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Target className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Investment Structure</h3>
                  <p className="text-gray-600">Define your preferred investment terms and structure</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Equity Percentage (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...register('equity_percentage_min', { valueAsNumber: true })}
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div>
                    <Label>Maximum Equity Percentage (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      {...register('equity_percentage_max', { valueAsNumber: true })}
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="board-participation"
                      onCheckedChange={(checked) => setValue('board_participation', checked as boolean)}
                    />
                    <Label htmlFor="board-participation">Interested in board participation</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="follow-on"
                      onCheckedChange={(checked) => setValue('follow_on_investment', checked as boolean)}
                    />
                    <Label htmlFor="follow-on">Open to follow-on investments</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Due Diligence & Decision Process */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Due Diligence & Decision Process</h3>
                  <p className="text-gray-600">What information do you need to make investment decisions?</p>
                </div>

                <div>
                  <Label>Required Due Diligence Documents</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {dueDiligenceRequirements.map((requirement) => (
                      <div key={requirement} className="flex items-center space-x-2">
                        <Checkbox
                          id={requirement}
                          checked={selectedDueDiligence.includes(requirement)}
                          onCheckedChange={(checked) => 
                            handleDueDiligenceChange(requirement, checked as boolean)
                          }
                        />
                        <Label htmlFor={requirement} className="text-sm">{requirement}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Decision Timeline</Label>
                  <Textarea
                    {...register('decision_timeline')}
                    placeholder="e.g., 30-45 days after receiving complete documentation"
                    rows={3}
                  />
                  {errors.decision_timeline && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.decision_timeline.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="investment-committee"
                    onCheckedChange={(checked) => setValue('investment_committee', checked as boolean)}
                  />
                  <Label htmlFor="investment-committee">Have an investment committee that reviews deals</Label>
                </div>
              </div>
            )}

            {/* Step 6: Impact & Co-investment */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Lightbulb className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Impact & Co-investment Preferences</h3>
                  <p className="text-gray-600">Tell us about your impact focus and co-investment preferences</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="impact-focus"
                    onCheckedChange={(checked) => setValue('impact_focus', checked as boolean)}
                  />
                  <Label htmlFor="impact-focus">Interested in impact investing with measurable social/environmental returns</Label>
                </div>

                <div>
                  <Label>ESG Criteria (If impact focused)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {esgCriteria.map((criteria) => (
                      <div key={criteria} className="flex items-center space-x-2">
                        <Checkbox
                          id={criteria}
                          checked={selectedESGCriteria.includes(criteria)}
                          onCheckedChange={(checked) => 
                            handleESGChange(criteria, checked as boolean)
                          }
                        />
                        <Label htmlFor={criteria} className="text-sm">{criteria}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Social Impact Importance (1-5 scale)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    {...register('social_impact_importance', { valueAsNumber: true })}
                    placeholder="5 = Extremely important, 1 = Not important"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="co-investment"
                      onCheckedChange={(checked) => setValue('co_investment_interest', checked as boolean)}
                    />
                    <Label htmlFor="co-investment">Interested in co-investment opportunities</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="syndicate"
                      onCheckedChange={(checked) => setValue('syndicate_participation', checked as boolean)}
                    />
                    <Label htmlFor="syndicate">Open to participating in investment syndicates</Label>
                  </div>
                </div>

                <div>
                  <Label>Lead Investor Preference</Label>
                  <Select onValueChange={(value) => setValue('lead_investor_preference', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Prefer to lead investments</SelectItem>
                      <SelectItem value="follow">Prefer to follow other investors</SelectItem>
                      <SelectItem value="either">Either lead or follow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onSkip}
                >
                  Skip Assessment
                </Button>
                
                {currentStep < totalSteps ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Complete Assessment'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};