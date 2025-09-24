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
  Building2, 
  Users,
  Target,
  FileText,
  Network,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-enhanced';
import { useAppContext } from '@/contexts/AppContext';

// Assessment form validation schema
const assessmentSchema = z.object({
  // Institution Details
  institution_name: z.string().min(1, 'Institution name is required'),
  institution_type: z.enum(['ministry', 'agency', 'council', 'commission', 'parastate', 'other']),
  department_division: z.string().min(1, 'Department/Division is required'),
  geographic_jurisdiction: z.array(z.string()).min(1, 'Select at least one jurisdiction'),
  
  // Support Programs
  current_programs: z.array(z.string()).min(1, 'Select at least one current program'),
  target_beneficiaries: z.array(z.string()).min(1, 'Select at least one beneficiary type'),
  annual_budget_allocation: z.number().min(0, 'Budget must be positive'),
  program_reach: z.enum(['local', 'provincial', 'national', 'regional']),
  
  // Partnership & Collaboration
  partnership_interests: z.array(z.string()).min(1, 'Select at least one partnership interest'),
  collaboration_types: z.array(z.string()),
  preferred_partners: z.array(z.string()),
  
  // Capacity Building Needs
  capacity_building_areas: z.array(z.string()),
  staff_development_priorities: z.array(z.string()),
  technical_assistance_needs: z.array(z.string()),
  
  // Policy & Regulatory
  policy_development_focus: z.array(z.string()),
  regulatory_challenges: z.array(z.string()),
  stakeholder_engagement_priorities: z.array(z.string()),
  
  // Innovation & Technology
  digitalization_priorities: z.array(z.string()),
  innovation_focus_areas: z.array(z.string()),
  technology_adoption_challenges: z.array(z.string()),
  
  // Monitoring & Evaluation
  monitoring_systems: z.boolean(),
  evaluation_frequency: z.enum(['monthly', 'quarterly', 'annually', 'project_based']),
  impact_measurement_priorities: z.array(z.string()),
  reporting_requirements: z.array(z.string()),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface GovernmentNeedsAssessmentProps {
  onComplete: (data: any) => void;
  onSkip: () => void;
}

export const GovernmentNeedsAssessment = ({ onComplete, onSkip }: GovernmentNeedsAssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedJurisdictions, setSelectedJurisdictions] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([]);
  const [selectedPartnerships, setSelectedPartnerships] = useState<string[]>([]);
  const [selectedCollaborations, setSelectedCollaborations] = useState<string[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [selectedCapacityBuilding, setSelectedCapacityBuilding] = useState<string[]>([]);
  const [selectedStaffDev, setSelectedStaffDev] = useState<string[]>([]);
  const [selectedTechAssistance, setSelectedTechAssistance] = useState<string[]>([]);
  const [selectedPolicyFocus, setSelectedPolicyFocus] = useState<string[]>([]);
  const [selectedRegChallenges, setSelectedRegChallenges] = useState<string[]>([]);
  const [selectedEngagement, setSelectedEngagement] = useState<string[]>([]);
  const [selectedDigital, setSelectedDigital] = useState<string[]>([]);
  const [selectedInnovation, setSelectedInnovation] = useState<string[]>([]);
  const [selectedTechChallenges, setSelectedTechChallenges] = useState<string[]>([]);
  const [selectedImpactMeasurement, setSelectedImpactMeasurement] = useState<string[]>([]);
  const [selectedReporting, setSelectedReporting] = useState<string[]>([]);
  
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

  const jurisdictions = [
    'Lusaka Province',
    'Copperbelt Province',
    'Southern Province',
    'Eastern Province',
    'Western Province',
    'Northern Province',
    'Luapula Province',
    'North-Western Province',
    'Muchinga Province',
    'Central Province',
    'National Coverage',
    'Cross-border/Regional'
  ];

  const currentPrograms = [
    'Economic Development',
    'Small Business Support',
    'Agriculture & Rural Development',
    'Education & Skills Development',
    'Healthcare Services',
    'Infrastructure Development',
    'Environmental Conservation',
    'Youth Empowerment',
    'Women Empowerment',
    'Technology & Innovation',
    'Tourism Development',
    'Trade & Export Promotion',
    'Financial Inclusion',
    'Disaster Risk Management'
  ];

  const targetBeneficiaries = [
    'Small & Medium Enterprises',
    'Individual Entrepreneurs',
    'Farmers & Agricultural Cooperatives',
    'Youth (18-35 years)',
    'Women Groups',
    'Persons with Disabilities',
    'Rural Communities',
    'Urban Poor',
    'Students & Educational Institutions',
    'Healthcare Workers',
    'Civil Society Organizations',
    'Private Sector Companies'
  ];

  const partnershipInterests = [
    'Private Sector Partnerships',
    'Development Partner Collaboration',
    'NGO/Civil Society Partnerships',
    'Academic Institution Partnerships',
    'International Organization Partnerships',
    'Regional Government Partnerships',
    'Community-based Partnerships',
    'Technology Provider Partnerships',
    'Financial Institution Partnerships',
    'Research Institution Partnerships'
  ];

  const collaborationTypes = [
    'Policy Development',
    'Program Implementation',
    'Capacity Building',
    'Technical Assistance',
    'Resource Sharing',
    'Knowledge Exchange',
    'Joint Funding',
    'Monitoring & Evaluation',
    'Research & Development',
    'Public-Private Partnerships'
  ];

  const preferredPartners = [
    'World Bank',
    'African Development Bank',
    'United Nations Agencies',
    'European Union',
    'USAID',
    'UK Aid',
    'German Development Cooperation',
    'Japanese Development Cooperation',
    'Private Foundations',
    'International NGOs',
    'Regional Organizations (SADC, COMESA)',
    'Bilateral Government Partners'
  ];

  const capacityBuildingAreas = [
    'Project Management',
    'Financial Management',
    'Strategic Planning',
    'Policy Analysis',
    'Data Management & Analytics',
    'Digital Literacy',
    'Leadership Development',
    'Change Management',
    'Communication & Outreach',
    'Monitoring & Evaluation',
    'Risk Management',
    'Procurement & Contract Management'
  ];

  const staffDevelopmentPriorities = [
    'Technical Skills Training',
    'Management Training',
    'Professional Certifications',
    'Leadership Development',
    'Digital Skills',
    'Language Training',
    'Cross-cultural Competence',
    'Innovation & Creativity',
    'Customer Service',
    'Ethics & Governance'
  ];

  const technicalAssistanceNeeds = [
    'Policy Development',
    'System Design & Implementation',
    'Process Improvement',
    'Technology Implementation',
    'Quality Assurance',
    'Legal & Regulatory Support',
    'Financial Management',
    'Strategic Planning',
    'Organizational Development',
    'Change Management'
  ];

  const policyDevelopmentFocus = [
    'Economic Policy',
    'Social Policy',
    'Environmental Policy',
    'Technology & Innovation Policy',
    'Trade & Investment Policy',
    'Education Policy',
    'Healthcare Policy',
    'Agriculture Policy',
    'Infrastructure Policy',
    'Governance & Transparency'
  ];

  const regulatoryChallenges = [
    'Outdated Regulations',
    'Regulatory Compliance',
    'Cross-sector Coordination',
    'Enforcement Mechanisms',
    'Stakeholder Consultation',
    'Impact Assessment',
    'International Standards Alignment',
    'Digital Transformation',
    'Public Participation',
    'Resource Constraints'
  ];

  const stakeholderEngagement = [
    'Public Consultation',
    'Private Sector Engagement',
    'Civil Society Engagement',
    'Community Outreach',
    'Media Relations',
    'Parliamentary Liaison',
    'Inter-governmental Coordination',
    'International Relations',
    'Academic Partnerships',
    'Traditional Leadership Engagement'
  ];

  const digitalizationPriorities = [
    'Digital Service Delivery',
    'Data Management Systems',
    'E-governance Platforms',
    'Digital Payment Systems',
    'Online Public Services',
    'Digital Identity Systems',
    'Cybersecurity',
    'Digital Infrastructure',
    'Staff Digital Literacy',
    'Public Digital Literacy'
  ];

  const innovationFocusAreas = [
    'Public Service Innovation',
    'Technology Adoption',
    'Process Innovation',
    'Service Design',
    'Digital Transformation',
    'Data-driven Decision Making',
    'Citizen-centric Services',
    'Automation',
    'AI & Machine Learning',
    'Blockchain Applications'
  ];

  const technologyAdoptionChallenges = [
    'Limited Budget',
    'Staff Resistance to Change',
    'Lack of Technical Skills',
    'Infrastructure Constraints',
    'Security Concerns',
    'Integration Challenges',
    'Vendor Management',
    'Change Management',
    'User Adoption',
    'Maintenance & Support'
  ];

  const impactMeasurementPriorities = [
    'Program Effectiveness',
    'Cost-benefit Analysis',
    'Citizen Satisfaction',
    'Service Quality',
    'Economic Impact',
    'Social Impact',
    'Environmental Impact',
    'Efficiency Metrics',
    'Outcome Indicators',
    'Long-term Sustainability'
  ];

  const reportingRequirements = [
    'Performance Reports',
    'Financial Reports',
    'Impact Assessment Reports',
    'Compliance Reports',
    'Audit Reports',
    'Parliamentary Reports',
    'Donor Reports',
    'Public Reports',
    'Statistical Reports',
    'Annual Reports'
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

  const calculateGovernmentProfile = (data: AssessmentFormData): any => {
    const programDiversity = data.current_programs.length;
    const partnershipReadiness = data.partnership_interests.length;
    const innovationOrientation = data.innovation_focus_areas.length + data.digitalization_priorities.length;
    
    return {
      program_scope: programDiversity,
      collaboration_readiness: partnershipReadiness >= 3,
      innovation_score: innovationOrientation,
      capacity_development_needs: data.capacity_building_areas.length,
      geographic_reach: data.program_reach,
      budget_capacity: data.annual_budget_allocation
    };
  };

  const generateGovernmentStrategy = (data: AssessmentFormData): string[] => {
    const strategies = [];
    
    if (data.partnership_interests.includes('Private Sector Partnerships')) {
      strategies.push('Develop public-private partnership frameworks');
    }
    if (data.digitalization_priorities.length > 0) {
      strategies.push('Prioritize digital transformation initiatives');
    }
    if (data.capacity_building_areas.length >= 5) {
      strategies.push('Implement comprehensive capacity building program');
    }
    if (data.program_reach === 'national') {
      strategies.push('Leverage national scale for impact and efficiency');
    }
    
    return strategies;
  };

  const onSubmit = async (data: AssessmentFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Calculate government profile and strategy
      const governmentProfile = calculateGovernmentProfile(data);
      const governmentStrategy = generateGovernmentStrategy(data);
      
      // Prepare assessment data for database
      const assessmentData = {
        user_id: user.id,
        institution_name: data.institution_name,
        institution_type: data.institution_type,
        department_division: data.department_division,
        geographic_jurisdiction: data.geographic_jurisdiction,
        current_programs: data.current_programs,
        target_beneficiaries: data.target_beneficiaries,
        annual_budget_allocation: data.annual_budget_allocation,
        program_reach: data.program_reach,
        partnership_interests: data.partnership_interests,
        collaboration_types: data.collaboration_types,
        preferred_partners: data.preferred_partners,
        capacity_building_areas: data.capacity_building_areas,
        staff_development_priorities: data.staff_development_priorities,
        technical_assistance_needs: data.technical_assistance_needs,
        policy_development_focus: data.policy_development_focus,
        regulatory_challenges: data.regulatory_challenges,
        stakeholder_engagement_priorities: data.stakeholder_engagement_priorities,
        digitalization_priorities: data.digitalization_priorities,
        innovation_focus_areas: data.innovation_focus_areas,
        technology_adoption_challenges: data.technology_adoption_challenges,
        monitoring_systems: data.monitoring_systems,
        evaluation_frequency: data.evaluation_frequency,
        impact_measurement_priorities: data.impact_measurement_priorities,
        reporting_requirements: data.reporting_requirements,
        government_profile: governmentProfile,
        government_strategy: governmentStrategy,
        completed_at: new Date().toISOString(),
      };

      // Save to database
      const { data: savedAssessment, error } = await supabase
        .from('government_needs_assessments')
        .insert([assessmentData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Assessment completed!",
        description: "Your government institution profile has been saved successfully.",
      });

      onComplete({
        assessment: savedAssessment,
        profile: governmentProfile,
        strategy: governmentStrategy
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
  const handleJurisdictionChange = (jurisdiction: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedJurisdictions, jurisdiction]
      : selectedJurisdictions.filter(j => j !== jurisdiction);
    setSelectedJurisdictions(updated);
    setValue('geographic_jurisdiction', updated);
  };

  const handleProgramChange = (program: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedPrograms, program]
      : selectedPrograms.filter(p => p !== program);
    setSelectedPrograms(updated);
    setValue('current_programs', updated);
  };

  const handleBeneficiaryChange = (beneficiary: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedBeneficiaries, beneficiary]
      : selectedBeneficiaries.filter(b => b !== beneficiary);
    setSelectedBeneficiaries(updated);
    setValue('target_beneficiaries', updated);
  };

  const handlePartnershipChange = (partnership: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedPartnerships, partnership]
      : selectedPartnerships.filter(p => p !== partnership);
    setSelectedPartnerships(updated);
    setValue('partnership_interests', updated);
  };

  const handleCollaborationChange = (collaboration: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedCollaborations, collaboration]
      : selectedCollaborations.filter(c => c !== collaboration);
    setSelectedCollaborations(updated);
    setValue('collaboration_types', updated);
  };

  const handlePartnerChange = (partner: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedPartners, partner]
      : selectedPartners.filter(p => p !== partner);
    setSelectedPartners(updated);
    setValue('preferred_partners', updated);
  };

  const handleCapacityBuildingChange = (area: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedCapacityBuilding, area]
      : selectedCapacityBuilding.filter(a => a !== area);
    setSelectedCapacityBuilding(updated);
    setValue('capacity_building_areas', updated);
  };

  const handleStaffDevChange = (priority: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedStaffDev, priority]
      : selectedStaffDev.filter(p => p !== priority);
    setSelectedStaffDev(updated);
    setValue('staff_development_priorities', updated);
  };

  const handleTechAssistanceChange = (need: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedTechAssistance, need]
      : selectedTechAssistance.filter(n => n !== need);
    setSelectedTechAssistance(updated);
    setValue('technical_assistance_needs', updated);
  };

  const handlePolicyFocusChange = (focus: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedPolicyFocus, focus]
      : selectedPolicyFocus.filter(f => f !== focus);
    setSelectedPolicyFocus(updated);
    setValue('policy_development_focus', updated);
  };

  const handleRegChallengeChange = (challenge: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedRegChallenges, challenge]
      : selectedRegChallenges.filter(c => c !== challenge);
    setSelectedRegChallenges(updated);
    setValue('regulatory_challenges', updated);
  };

  const handleEngagementChange = (engagement: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedEngagement, engagement]
      : selectedEngagement.filter(e => e !== engagement);
    setSelectedEngagement(updated);
    setValue('stakeholder_engagement_priorities', updated);
  };

  const handleDigitalChange = (digital: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedDigital, digital]
      : selectedDigital.filter(d => d !== digital);
    setSelectedDigital(updated);
    setValue('digitalization_priorities', updated);
  };

  const handleInnovationChange = (innovation: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedInnovation, innovation]
      : selectedInnovation.filter(i => i !== innovation);
    setSelectedInnovation(updated);
    setValue('innovation_focus_areas', updated);
  };

  const handleTechChallengeChange = (challenge: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedTechChallenges, challenge]
      : selectedTechChallenges.filter(c => c !== challenge);
    setSelectedTechChallenges(updated);
    setValue('technology_adoption_challenges', updated);
  };

  const handleImpactMeasurementChange = (impact: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedImpactMeasurement, impact]
      : selectedImpactMeasurement.filter(i => i !== impact);
    setSelectedImpactMeasurement(updated);
    setValue('impact_measurement_priorities', updated);
  };

  const handleReportingChange = (reporting: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedReporting, reporting]
      : selectedReporting.filter(r => r !== reporting);
    setSelectedReporting(updated);
    setValue('reporting_requirements', updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Government Institution Needs Assessment
              </CardTitle>
              <CardDescription>
                Help us understand your institution's programs and partnership needs
              </CardDescription>
            </div>
            <Badge variant="outline">Step {currentStep} of {totalSteps}</Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Institution Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Institution Details</h3>
                  <p className="text-gray-600">Tell us about your government institution</p>
                </div>

                <div>
                  <Label>Institution Name</Label>
                  <Input
                    {...register('institution_name')}
                    placeholder="e.g., Ministry of Commerce, Trade and Industry"
                  />
                  {errors.institution_name && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.institution_name.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Institution Type</Label>
                  <Select onValueChange={(value) => setValue('institution_type', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select institution type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ministry">Ministry</SelectItem>
                      <SelectItem value="agency">Government Agency</SelectItem>
                      <SelectItem value="council">Council</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="parastate">Parastate Organization</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Department/Division</Label>
                  <Input
                    {...register('department_division')}
                    placeholder="e.g., Small and Medium Enterprise Development"
                  />
                  {errors.department_division && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.department_division.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Geographic Jurisdiction</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {jurisdictions.map((jurisdiction) => (
                      <div key={jurisdiction} className="flex items-center space-x-2">
                        <Checkbox
                          id={jurisdiction}
                          checked={selectedJurisdictions.includes(jurisdiction)}
                          onCheckedChange={(checked) => 
                            handleJurisdictionChange(jurisdiction, checked as boolean)
                          }
                        />
                        <Label htmlFor={jurisdiction} className="text-sm">{jurisdiction}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.geographic_jurisdiction && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.geographic_jurisdiction.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Support Programs */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Users className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Support Programs & Beneficiaries</h3>
                  <p className="text-gray-600">What programs do you run and who do you serve?</p>
                </div>

                <div>
                  <Label>Current Programs</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {currentPrograms.map((program) => (
                      <div key={program} className="flex items-center space-x-2">
                        <Checkbox
                          id={program}
                          checked={selectedPrograms.includes(program)}
                          onCheckedChange={(checked) => 
                            handleProgramChange(program, checked as boolean)
                          }
                        />
                        <Label htmlFor={program} className="text-sm">{program}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.current_programs && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.current_programs.message}</AlertDescription>
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
                  <Label>Annual Budget Allocation (ZMW)</Label>
                  <Input
                    type="number"
                    {...register('annual_budget_allocation', { valueAsNumber: true })}
                    placeholder="e.g., 10000000"
                  />
                  {errors.annual_budget_allocation && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.annual_budget_allocation.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Program Reach</Label>
                  <Select onValueChange={(value) => setValue('program_reach', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select program reach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="provincial">Provincial</SelectItem>
                      <SelectItem value="national">National</SelectItem>
                      <SelectItem value="regional">Regional/International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 3: Partnership & Collaboration */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Network className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Partnership & Collaboration</h3>
                  <p className="text-gray-600">What types of partnerships are you interested in?</p>
                </div>

                <div>
                  <Label>Partnership Interests</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {partnershipInterests.map((interest) => (
                      <div key={interest} className="flex items-center space-x-2">
                        <Checkbox
                          id={interest}
                          checked={selectedPartnerships.includes(interest)}
                          onCheckedChange={(checked) => 
                            handlePartnershipChange(interest, checked as boolean)
                          }
                        />
                        <Label htmlFor={interest} className="text-sm">{interest}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.partnership_interests && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.partnership_interests.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Collaboration Types</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {collaborationTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedCollaborations.includes(type)}
                          onCheckedChange={(checked) => 
                            handleCollaborationChange(type, checked as boolean)
                          }
                        />
                        <Label htmlFor={type} className="text-sm">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Preferred Partners</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {preferredPartners.map((partner) => (
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

            {/* Step 4: Capacity Building Needs */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Target className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Capacity Building Needs</h3>
                  <p className="text-gray-600">What capacity building support does your institution need?</p>
                </div>

                <div>
                  <Label>Capacity Building Areas</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {capacityBuildingAreas.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={area}
                          checked={selectedCapacityBuilding.includes(area)}
                          onCheckedChange={(checked) => 
                            handleCapacityBuildingChange(area, checked as boolean)
                          }
                        />
                        <Label htmlFor={area} className="text-sm">{area}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Staff Development Priorities</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {staffDevelopmentPriorities.map((priority) => (
                      <div key={priority} className="flex items-center space-x-2">
                        <Checkbox
                          id={priority}
                          checked={selectedStaffDev.includes(priority)}
                          onCheckedChange={(checked) => 
                            handleStaffDevChange(priority, checked as boolean)
                          }
                        />
                        <Label htmlFor={priority} className="text-sm">{priority}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Technical Assistance Needs</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {technicalAssistanceNeeds.map((need) => (
                      <div key={need} className="flex items-center space-x-2">
                        <Checkbox
                          id={need}
                          checked={selectedTechAssistance.includes(need)}
                          onCheckedChange={(checked) => 
                            handleTechAssistanceChange(need, checked as boolean)
                          }
                        />
                        <Label htmlFor={need} className="text-sm">{need}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Policy & Innovation */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <FileText className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Policy & Innovation</h3>
                  <p className="text-gray-600">What are your policy development and innovation priorities?</p>
                </div>

                <div>
                  <Label>Policy Development Focus</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {policyDevelopmentFocus.map((focus) => (
                      <div key={focus} className="flex items-center space-x-2">
                        <Checkbox
                          id={focus}
                          checked={selectedPolicyFocus.includes(focus)}
                          onCheckedChange={(checked) => 
                            handlePolicyFocusChange(focus, checked as boolean)
                          }
                        />
                        <Label htmlFor={focus} className="text-sm">{focus}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Regulatory Challenges</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {regulatoryChallenges.map((challenge) => (
                      <div key={challenge} className="flex items-center space-x-2">
                        <Checkbox
                          id={challenge}
                          checked={selectedRegChallenges.includes(challenge)}
                          onCheckedChange={(checked) => 
                            handleRegChallengeChange(challenge, checked as boolean)
                          }
                        />
                        <Label htmlFor={challenge} className="text-sm">{challenge}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Digitalization Priorities</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {digitalizationPriorities.map((priority) => (
                      <div key={priority} className="flex items-center space-x-2">
                        <Checkbox
                          id={priority}
                          checked={selectedDigital.includes(priority)}
                          onCheckedChange={(checked) => 
                            handleDigitalChange(priority, checked as boolean)
                          }
                        />
                        <Label htmlFor={priority} className="text-sm">{priority}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Innovation Focus Areas</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {innovationFocusAreas.map((area) => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox
                          id={area}
                          checked={selectedInnovation.includes(area)}
                          onCheckedChange={(checked) => 
                            handleInnovationChange(area, checked as boolean)
                          }
                        />
                        <Label htmlFor={area} className="text-sm">{area}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Monitoring & Evaluation */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Monitoring & Evaluation</h3>
                  <p className="text-gray-600">How do you measure and report on your programs?</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="monitoring-systems"
                    onCheckedChange={(checked) => setValue('monitoring_systems', checked as boolean)}
                  />
                  <Label htmlFor="monitoring-systems">Have established monitoring systems in place</Label>
                </div>

                <div>
                  <Label>Evaluation Frequency</Label>
                  <Select onValueChange={(value) => setValue('evaluation_frequency', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="How often do you evaluate programs?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="project_based">Project-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Impact Measurement Priorities</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {impactMeasurementPriorities.map((priority) => (
                      <div key={priority} className="flex items-center space-x-2">
                        <Checkbox
                          id={priority}
                          checked={selectedImpactMeasurement.includes(priority)}
                          onCheckedChange={(checked) => 
                            handleImpactMeasurementChange(priority, checked as boolean)
                          }
                        />
                        <Label htmlFor={priority} className="text-sm">{priority}</Label>
                      </div>
                    ))}
                  </div>
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