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
  Heart, 
  HandHeart,
  Target,
  Users,
  Globe,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';

// Assessment form validation schema
const assessmentSchema = z.object({
  // Donation Capacity
  annual_donation_budget: z.number().min(0, 'Budget must be positive'),
  donation_frequency: z.enum(['one_time', 'monthly', 'quarterly', 'annually']),
  donation_amount_per_recipient: z.number().min(0, 'Amount must be positive'),
  
  // Focus Areas
  focus_areas: z.array(z.string()).min(1, 'Select at least one focus area'),
  target_beneficiaries: z.array(z.string()).min(1, 'Select at least one beneficiary type'),
  geographic_focus: z.array(z.string()),
  
  // Support Types
  support_types: z.array(z.string()).min(1, 'Select at least one support type'),
  capacity_building_interest: z.boolean(),
  mentorship_availability: z.boolean(),
  
  // Impact & Measurement
  impact_measurement_importance: z.number().min(1).max(5),
  reporting_requirements: z.array(z.string()),
  follow_up_engagement: z.boolean(),
  
  // Organization Preferences
  organization_size_preference: z.array(z.string()),
  organization_stage_preference: z.array(z.string()),
  religious_affiliation_preference: z.enum(['any', 'christian', 'muslim', 'other', 'secular_only']),
  
  // Selection Criteria
  selection_criteria: z.array(z.string()),
  application_process: z.string().min(1, 'Please describe your application process'),
  decision_timeline: z.string().min(1, 'Please specify decision timeline'),
  
  // Collaboration
  collaborative_funding: z.boolean(),
  partner_organizations: z.array(z.string()),
  volunteer_opportunities: z.boolean(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface DonorNeedsAssessmentProps {
  onComplete: (data: any) => void;
  onSkip: () => void;
}

export const DonorNeedsAssessment = ({ onComplete, onSkip }: DonorNeedsAssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);
  const [selectedGeographic, setSelectedGeographic] = useState<string[]>([]);
  const [selectedSupportTypes, setSelectedSupportTypes] = useState<string[]>([]);
  const [selectedReporting, setSelectedReporting] = useState<string[]>([]);
  const [selectedOrgSize, setSelectedOrgSize] = useState<string[]>([]);
  const [selectedOrgStage, setSelectedOrgStage] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  
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

  const focusAreas = [
    'Education',
    'Healthcare',
    'Women Empowerment',
    'Youth Development',
    'Small Business Support',
    'Agriculture & Food Security',
    'Environmental Conservation',
    'Technology Access',
    'Community Development',
    'Disaster Relief',
    'Arts & Culture',
    'Sports & Recreation'
  ];

  const targetBeneficiaries = [
    'Women Entrepreneurs',
    'Youth (18-35)',
    'Rural Communities',
    'Urban Poor',
    'Persons with Disabilities',
    'Orphans & Vulnerable Children',
    'Elderly',
    'Refugees/Displaced Persons',
    'Students/Educational Institutions',
    'Healthcare Workers',
    'Small-scale Farmers',
    'Community Organizations'
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
    'Rural Areas',
    'Urban Areas',
    'National Coverage'
  ];

  const supportTypes = [
    'Direct Financial Support',
    'Equipment & Supplies',
    'Capacity Building/Training',
    'Mentorship & Guidance',
    'Technical Assistance',
    'Infrastructure Development',
    'Scholarship/Educational Support',
    'Emergency Relief',
    'Microfinance/Loans',
    'In-kind Donations'
  ];

  const reportingRequirements = [
    'Financial Reports',
    'Impact Reports',
    'Beneficiary Stories/Testimonials',
    'Photo/Video Documentation',
    'Progress Updates (Monthly)',
    'Progress Updates (Quarterly)',
    'Annual Reports',
    'Audit Reports',
    'Compliance Certificates',
    'Community Feedback'
  ];

  const organizationSizes = [
    'Individual/Personal',
    'Small (1-10 people)',
    'Medium (11-50 people)',
    'Large (50+ people)',
    'Established NGOs',
    'Community Groups',
    'Religious Organizations',
    'Government Institutions'
  ];

  const organizationStages = [
    'Just Starting',
    'Early Stage (1-2 years)',
    'Growing (3-5 years)',
    'Established (5+ years)',
    'Expanding/Scaling',
    'Need Emergency Support'
  ];

  const selectionCriteria = [
    'Clear Mission & Vision',
    'Demonstrated Impact',
    'Financial Transparency',
    'Community Support',
    'Leadership Quality',
    'Sustainability Plan',
    'Innovation/Creativity',
    'Measurable Outcomes',
    'Ethical Practices',
    'Local Ownership'
  ];

  const partnerOrganizations = [
    'United Nations Agencies',
    'International NGOs',
    'Local NGOs',
    'Government Departments',
    'Religious Organizations',
    'Corporate Partners',
    'Foundation Partners',
    'Academic Institutions',
    'Community Leaders',
    'Other Donors'
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

  const calculateDonorProfile = (data: AssessmentFormData): any => {
    const diversificationScore = data.focus_areas.length;
    const engagementLevel = (data.capacity_building_interest ? 1 : 0) + 
                           (data.mentorship_availability ? 1 : 0) + 
                           (data.follow_up_engagement ? 1 : 0);
    
    return {
      donation_capacity: data.annual_donation_budget,
      diversification_level: diversificationScore,
      hands_on_engagement: engagementLevel >= 2,
      impact_focus_score: data.impact_measurement_importance,
      collaboration_readiness: data.collaborative_funding,
      geographic_reach: data.geographic_focus.length
    };
  };

  const generateDonorStrategy = (data: AssessmentFormData): string[] => {
    const strategies = [];
    
    if (data.capacity_building_interest) {
      strategies.push('Focus on capacity building and institutional strengthening');
    }
    if (data.mentorship_availability) {
      strategies.push('Provide ongoing mentorship alongside financial support');
    }
    if (data.collaborative_funding) {
      strategies.push('Participate in collaborative funding initiatives');
    }
    if (data.impact_measurement_importance >= 4) {
      strategies.push('Prioritize organizations with strong impact measurement systems');
    }
    
    return strategies;
  };

  const onSubmit = async (data: AssessmentFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Calculate donor profile and strategy
      const donorProfile = calculateDonorProfile(data);
      const donorStrategy = generateDonorStrategy(data);
      
      // Prepare assessment data for database
      const assessmentData = {
        user_id: user.id,
        annual_donation_budget: data.annual_donation_budget,
        donation_frequency: data.donation_frequency,
        donation_amount_per_recipient: data.donation_amount_per_recipient,
        focus_areas: data.focus_areas,
        target_beneficiaries: data.target_beneficiaries,
        geographic_focus: data.geographic_focus,
        support_types: data.support_types,
        capacity_building_interest: data.capacity_building_interest,
        mentorship_availability: data.mentorship_availability,
        impact_measurement_importance: data.impact_measurement_importance,
        reporting_requirements: data.reporting_requirements,
        follow_up_engagement: data.follow_up_engagement,
        organization_size_preference: data.organization_size_preference,
        organization_stage_preference: data.organization_stage_preference,
        religious_affiliation_preference: data.religious_affiliation_preference,
        selection_criteria: data.selection_criteria,
        application_process: data.application_process,
        decision_timeline: data.decision_timeline,
        collaborative_funding: data.collaborative_funding,
        partner_organizations: data.partner_organizations,
        volunteer_opportunities: data.volunteer_opportunities,
        donor_profile: donorProfile,
        donor_strategy: donorStrategy,
        completed_at: new Date().toISOString(),
      };

      // Save to database
      const { data: savedAssessment, error } = await supabase
        .from('donor_needs_assessments')
        .insert([assessmentData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Assessment completed!",
        description: "Your donation preferences have been saved successfully.",
      });

      onComplete({
        assessment: savedAssessment,
        profile: donorProfile,
        strategy: donorStrategy
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
  const handleFocusAreaChange = (area: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedFocusAreas, area]
      : selectedFocusAreas.filter(a => a !== area);
    setSelectedFocusAreas(updated);
    setValue('focus_areas', updated);
  };

  const handleBeneficiaryChange = (beneficiary: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedBeneficiaries, beneficiary]
      : selectedBeneficiaries.filter(b => b !== beneficiary);
    setSelectedBeneficiaries(updated);
    setValue('target_beneficiaries', updated);
  };

  const handleGeographicChange = (location: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedGeographic, location]
      : selectedGeographic.filter(l => l !== location);
    setSelectedGeographic(updated);
    setValue('geographic_focus', updated);
  };

  const handleSupportTypeChange = (type: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedSupportTypes, type]
      : selectedSupportTypes.filter(t => t !== type);
    setSelectedSupportTypes(updated);
    setValue('support_types', updated);
  };

  const handleReportingChange = (requirement: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedReporting, requirement]
      : selectedReporting.filter(r => r !== requirement);
    setSelectedReporting(updated);
    setValue('reporting_requirements', updated);
  };

  const handleOrgSizeChange = (size: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedOrgSize, size]
      : selectedOrgSize.filter(s => s !== size);
    setSelectedOrgSize(updated);
    setValue('organization_size_preference', updated);
  };

  const handleOrgStageChange = (stage: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedOrgStage, stage]
      : selectedOrgStage.filter(s => s !== stage);
    setSelectedOrgStage(updated);
    setValue('organization_stage_preference', updated);
  };

  const handleCriteriaChange = (criteria: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedCriteria, criteria]
      : selectedCriteria.filter(c => c !== criteria);
    setSelectedCriteria(updated);
    setValue('selection_criteria', updated);
  };

  const handlePartnerChange = (partner: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedPartners, partner]
      : selectedPartners.filter(p => p !== partner);
    setSelectedPartners(updated);
    setValue('partner_organizations', updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-600" />
                Donor Needs Assessment
              </CardTitle>
              <CardDescription>
                Help us understand your donation preferences and impact goals
              </CardDescription>
            </div>
            <Badge variant="outline">Step {currentStep} of {totalSteps}</Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Donation Capacity */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <HandHeart className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Donation Capacity</h3>
                  <p className="text-gray-600">Tell us about your donation budget and frequency</p>
                </div>

                <div>
                  <Label>Annual Donation Budget (ZMW)</Label>
                  <Input
                    type="number"
                    {...register('annual_donation_budget', { valueAsNumber: true })}
                    placeholder="e.g., 50000"
                  />
                  {errors.annual_donation_budget && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.annual_donation_budget.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Donation Frequency</Label>
                  <Select onValueChange={(value) => setValue('donation_frequency', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="How often do you donate?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One-time donations</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Average Donation Amount per Recipient (ZMW)</Label>
                  <Input
                    type="number"
                    {...register('donation_amount_per_recipient', { valueAsNumber: true })}
                    placeholder="e.g., 5000"
                  />
                  {errors.donation_amount_per_recipient && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.donation_amount_per_recipient.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Focus Areas & Beneficiaries */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Target className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Focus Areas & Target Beneficiaries</h3>
                  <p className="text-gray-600">What causes and communities do you want to support?</p>
                </div>

                <div>
                  <Label>Focus Areas (Select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {focusAreas.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={area}
                          checked={selectedFocusAreas.includes(area)}
                          onCheckedChange={(checked) => 
                            handleFocusAreaChange(area, checked as boolean)
                          }
                        />
                        <Label htmlFor={area} className="text-sm">{area}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.focus_areas && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.focus_areas.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Target Beneficiaries</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {targetBeneficiaries.map((beneficiary) => (
                      <div key={beneficiary} className="flex items-center space-x-2">
                        <Checkbox
                          id={beneficiary}
                          checked={selectedBeneficiaries.includes(beneficiary)}
                          onCheckedChange={(checked) => 
                            handleBeneficiaryChange(beneficiary, checked as boolean)
                          }
                        />
                        <Label htmlFor={beneficiary} className="text-sm">{beneficiary}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.target_beneficiaries && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.target_beneficiaries.message}</AlertDescription>
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
                          checked={selectedGeographic.includes(location)}
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

            {/* Step 3: Support Types */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Users className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Types of Support</h3>
                  <p className="text-gray-600">What types of support do you provide?</p>
                </div>

                <div>
                  <Label>Support Types</Label>
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

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="capacity-building"
                      onCheckedChange={(checked) => setValue('capacity_building_interest', checked as boolean)}
                    />
                    <Label htmlFor="capacity-building">Interested in providing capacity building support</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mentorship"
                      onCheckedChange={(checked) => setValue('mentorship_availability', checked as boolean)}
                    />
                    <Label htmlFor="mentorship">Available for ongoing mentorship</Label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Impact & Measurement */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Globe className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Impact & Measurement</h3>
                  <p className="text-gray-600">How important is impact measurement and reporting?</p>
                </div>

                <div>
                  <Label>Impact Measurement Importance (1-5 scale)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    {...register('impact_measurement_importance', { valueAsNumber: true })}
                    placeholder="5 = Extremely important, 1 = Not important"
                  />
                </div>

                <div>
                  <Label>Reporting Requirements</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {reportingRequirements.map((requirement) => (
                      <div key={requirement} className="flex items-center space-x-2">
                        <Checkbox
                          id={requirement}
                          checked={selectedReporting.includes(requirement)}
                          onCheckedChange={(checked) => 
                            handleReportingChange(requirement, checked as boolean)
                          }
                        />
                        <Label htmlFor={requirement} className="text-sm">{requirement}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="follow-up"
                    onCheckedChange={(checked) => setValue('follow_up_engagement', checked as boolean)}
                  />
                  <Label htmlFor="follow-up">Interested in follow-up engagement with recipients</Label>
                </div>
              </div>
            )}

            {/* Step 5: Organization Preferences */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Organization Preferences</h3>
                  <p className="text-gray-600">What types of organizations do you prefer to support?</p>
                </div>

                <div>
                  <Label>Organization Size Preference</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {organizationSizes.map((size) => (
                      <div key={size} className="flex items-center space-x-2">
                        <Checkbox
                          id={size}
                          checked={selectedOrgSize.includes(size)}
                          onCheckedChange={(checked) => 
                            handleOrgSizeChange(size, checked as boolean)
                          }
                        />
                        <Label htmlFor={size} className="text-sm">{size}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Organization Stage Preference</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {organizationStages.map((stage) => (
                      <div key={stage} className="flex items-center space-x-2">
                        <Checkbox
                          id={stage}
                          checked={selectedOrgStage.includes(stage)}
                          onCheckedChange={(checked) => 
                            handleOrgStageChange(stage, checked as boolean)
                          }
                        />
                        <Label htmlFor={stage} className="text-sm">{stage}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Religious Affiliation Preference</Label>
                  <Select onValueChange={(value) => setValue('religious_affiliation_preference', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any/No preference</SelectItem>
                      <SelectItem value="christian">Christian organizations</SelectItem>
                      <SelectItem value="muslim">Muslim organizations</SelectItem>
                      <SelectItem value="other">Other religious organizations</SelectItem>
                      <SelectItem value="secular_only">Secular organizations only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 6: Selection Process & Collaboration */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Lightbulb className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Selection Process & Collaboration</h3>
                  <p className="text-gray-600">How do you select recipients and collaborate with others?</p>
                </div>

                <div>
                  <Label>Selection Criteria</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {selectionCriteria.map((criteria) => (
                      <div key={criteria} className="flex items-center space-x-2">
                        <Checkbox
                          id={criteria}
                          checked={selectedCriteria.includes(criteria)}
                          onCheckedChange={(checked) => 
                            handleCriteriaChange(criteria, checked as boolean)
                          }
                        />
                        <Label htmlFor={criteria} className="text-sm">{criteria}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Application Process Description</Label>
                  <Textarea
                    {...register('application_process')}
                    placeholder="Describe how organizations should apply for your support..."
                    rows={3}
                  />
                  {errors.application_process && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.application_process.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Decision Timeline</Label>
                  <Textarea
                    {...register('decision_timeline')}
                    placeholder="e.g., 30 days after receiving complete application"
                    rows={2}
                  />
                  {errors.decision_timeline && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.decision_timeline.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="collaborative"
                      onCheckedChange={(checked) => setValue('collaborative_funding', checked as boolean)}
                    />
                    <Label htmlFor="collaborative">Interested in collaborative funding with other donors</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="volunteer"
                      onCheckedChange={(checked) => setValue('volunteer_opportunities', checked as boolean)}
                    />
                    <Label htmlFor="volunteer">Offer volunteer opportunities alongside donations</Label>
                  </div>
                </div>

                <div>
                  <Label>Partner Organizations (If applicable)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {partnerOrganizations.map((partner) => (
                      <div key={partner} className="flex items-center space-x-2">
                        <Checkbox
                          id={partner}
                          checked={selectedPartners.includes(partner)}
                          onCheckedChange={(checked) => 
                            handlePartnerChange(partner, checked as boolean)
                          }
                        />
                        <Label htmlFor={partner} className="text-sm">{partner}</Label>
                      </div>
                    ))}
                  </div>
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