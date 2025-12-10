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
  User, 
  BriefcaseIcon,
  Target,
  BookOpen,
  Network,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';

// Assessment form validation schema
const assessmentSchema = z.object({
  // Professional Background
  primary_profession: z.string().min(1, 'Please specify your primary profession'),
  years_of_experience: z.number().min(0, 'Experience must be positive'),
  specialization_areas: z.array(z.string()).min(1, 'Select at least one specialization'),
  current_employment_status: z.enum(['employed', 'self_employed', 'consultant', 'unemployed', 'retired']),
  
  // Service Offerings
  services_offered: z.array(z.string()).min(1, 'Select at least one service'),
  service_delivery_modes: z.array(z.string()).min(1, 'Select at least one delivery mode'),
  hourly_rate_min: z.number().min(0, 'Rate must be positive'),
  hourly_rate_max: z.number().min(0, 'Rate must be positive'),
  
  // Target Clients
  target_client_types: z.array(z.string()).min(1, 'Select at least one client type'),
  client_size_preference: z.array(z.string()),
  industry_focus: z.array(z.string()),
  
  // Availability & Capacity
  availability_hours_per_week: z.number().min(1).max(168),
  project_duration_preference: z.enum(['short_term', 'medium_term', 'long_term', 'flexible']),
  travel_willingness: z.enum(['local_only', 'regional', 'national', 'international']),
  remote_work_capability: z.boolean(),
  
  // Skills & Development
  key_skills: z.array(z.string()).min(1, 'Select at least one key skill'),
  certification_status: z.array(z.string()),
  continuous_learning_interest: z.boolean(),
  mentorship_interest: z.enum(['provide', 'receive', 'both', 'none']),
  
  // Business Development
  client_acquisition_challenges: z.array(z.string()),
  marketing_channels: z.array(z.string()),
  business_development_support_needed: z.array(z.string()),
  networking_preferences: z.array(z.string()),
  
  // Collaboration & Partnerships
  collaboration_interest: z.boolean(),
  partnership_types: z.array(z.string()),
  referral_system_interest: z.boolean(),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface ProfessionalNeedsAssessmentProps {
  onComplete: (data: any) => void;
  onSkip: () => void;
}

export const ProfessionalNeedsAssessment = ({ onComplete, onSkip }: ProfessionalNeedsAssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDeliveryModes, setSelectedDeliveryModes] = useState<string[]>([]);
  const [selectedClientTypes, setSelectedClientTypes] = useState<string[]>([]);
  const [selectedClientSizes, setSelectedClientSizes] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedSupport, setSelectedSupport] = useState<string[]>([]);
  const [selectedNetworking, setSelectedNetworking] = useState<string[]>([]);
  const [selectedPartnerships, setSelectedPartnerships] = useState<string[]>([]);
  
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

  const specializations = [
    'Business Strategy',
    'Financial Management',
    'Marketing & Sales',
    'Human Resources',
    'Operations Management',
    'Legal Services',
    'IT & Technology',
    'Engineering',
    'Healthcare',
    'Education & Training',
    'Project Management',
    'Research & Development',
    'Quality Assurance',
    'Supply Chain Management',
    'International Trade',
    'Risk Management'
  ];

  const servicesOffered = [
    'Consulting',
    'Training & Workshops',
    'Mentoring & Coaching',
    'Project Management',
    'Implementation Support',
    'Strategic Planning',
    'Process Improvement',
    'Technology Solutions',
    'Financial Advisory',
    'Legal Advisory',
    'Market Research',
    'Business Planning',
    'Compliance Support',
    'Audit Services'
  ];

  const deliveryModes = [
    'On-site/In-person',
    'Remote/Virtual',
    'Hybrid (On-site + Remote)',
    'Self-paced Online',
    'Group Sessions',
    'One-on-one Sessions',
    'Workshop Format',
    'Long-term Engagement'
  ];

  const clientTypes = [
    'Small & Medium Enterprises',
    'Large Corporations',
    'Startups',
    'Non-profit Organizations',
    'Government Institutions',
    'International Organizations',
    'Individual Entrepreneurs',
    'Professional Associations',
    'Educational Institutions',
    'Healthcare Organizations'
  ];

  const clientSizes = [
    'Micro (1-5 employees)',
    'Small (6-20 employees)',
    'Medium (21-100 employees)',
    'Large (100+ employees)',
    'Enterprise (500+ employees)'
  ];

  const industries = [
    'Agriculture & Agritech',
    'Manufacturing',
    'Technology & Software',
    'Healthcare',
    'Education',
    'Financial Services',
    'Retail & E-commerce',
    'Tourism & Hospitality',
    'Mining',
    'Construction',
    'Transportation',
    'Energy & Utilities',
    'Government',
    'Non-profit'
  ];

  const keySkills = [
    'Strategic Planning',
    'Financial Analysis',
    'Project Management',
    'Team Leadership',
    'Communication',
    'Problem Solving',
    'Data Analysis',
    'Digital Marketing',
    'Process Optimization',
    'Change Management',
    'Risk Assessment',
    'Quality Management',
    'Compliance',
    'Training & Development',
    'Negotiation',
    'Cross-cultural Communication'
  ];

  const certifications = [
    'PMP (Project Management)',
    'CPA (Certified Public Accountant)',
    'MBA',
    'Professional Certification in Field',
    'ISO Certifications',
    'Industry-specific Licenses',
    'Digital Marketing Certifications',
    'IT Certifications',
    'Six Sigma',
    'PRINCE2',
    'Agile/Scrum Certifications',
    'None Currently'
  ];

  const acquisitionChallenges = [
    'Finding Quality Clients',
    'Pricing Services Competitively',
    'Building Credibility',
    'Marketing & Promotion',
    'Network Building',
    'Competition from Established Firms',
    'Cash Flow Management',
    'Time Management',
    'Skill Gap Identification',
    'Technology Adoption'
  ];

  const marketingChannels = [
    'Word of Mouth',
    'Professional Networks',
    'Social Media',
    'Company Website',
    'Industry Events',
    'Online Platforms',
    'Cold Outreach',
    'Partnerships',
    'Referrals',
    'Content Marketing',
    'Print Media',
    'Radio/TV'
  ];

  const businessSupport = [
    'Business Plan Development',
    'Marketing Strategy',
    'Financial Management',
    'Legal Structure Setup',
    'Technology Implementation',
    'Quality Systems',
    'Compliance Support',
    'Network Building',
    'Skill Development',
    'Mentorship Access'
  ];

  const networkingPreferences = [
    'Professional Associations',
    'Industry Events',
    'Online Communities',
    'Business Meetups',
    'Training Workshops',
    'Trade Shows',
    'Alumni Networks',
    'Government Programs',
    'NGO Partnerships',
    'International Programs'
  ];

  const partnershipTypes = [
    'Service Partnerships',
    'Referral Partnerships',
    'Joint Ventures',
    'Subcontracting',
    'Consortiums',
    'Mentorship Programs',
    'Training Partnerships',
    'Technology Partnerships',
    'International Partnerships'
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

  const calculateProfessionalProfile = (data: AssessmentFormData): any => {
    const experienceLevel = data.years_of_experience >= 10 ? 'senior' : 
                           data.years_of_experience >= 5 ? 'mid_level' : 'junior';
    const serviceRange = data.services_offered.length;
    const marketReach = data.travel_willingness === 'international' ? 4 : 
                       data.travel_willingness === 'national' ? 3 : 
                       data.travel_willingness === 'regional' ? 2 : 1;
    
    return {
      experience_level: experienceLevel,
      service_diversification: serviceRange,
      market_reach: marketReach,
      availability_score: data.availability_hours_per_week,
      collaboration_readiness: data.collaboration_interest,
      rate_range: { min: data.hourly_rate_min, max: data.hourly_rate_max }
    };
  };

  const generateProfessionalStrategy = (data: AssessmentFormData): string[] => {
    const strategies = [];
    
    if (data.client_acquisition_challenges.includes('Finding Quality Clients')) {
      strategies.push('Focus on building strong referral network and online presence');
    }
    if (data.continuous_learning_interest) {
      strategies.push('Pursue continuous learning and certification opportunities');
    }
    if (data.collaboration_interest) {
      strategies.push('Explore partnership opportunities with complementary professionals');
    }
    if (data.remote_work_capability) {
      strategies.push('Leverage remote service delivery to expand market reach');
    }
    
    return strategies;
  };

  const onSubmit = async (data: AssessmentFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Calculate professional profile and strategy
      const professionalProfile = calculateProfessionalProfile(data);
      const professionalStrategy = generateProfessionalStrategy(data);
      
      // Prepare assessment data for database
      const assessmentData = {
        user_id: user.id,
        primary_profession: data.primary_profession,
        years_of_experience: data.years_of_experience,
        specialization_areas: data.specialization_areas,
        current_employment_status: data.current_employment_status,
        services_offered: data.services_offered,
        service_delivery_modes: data.service_delivery_modes,
        hourly_rate_min: data.hourly_rate_min,
        hourly_rate_max: data.hourly_rate_max,
        target_client_types: data.target_client_types,
        client_size_preference: data.client_size_preference,
        industry_focus: data.industry_focus,
        availability_hours_per_week: data.availability_hours_per_week,
        project_duration_preference: data.project_duration_preference,
        travel_willingness: data.travel_willingness,
        remote_work_capability: data.remote_work_capability,
        key_skills: data.key_skills,
        certification_status: data.certification_status,
        continuous_learning_interest: data.continuous_learning_interest,
        mentorship_interest: data.mentorship_interest,
        client_acquisition_challenges: data.client_acquisition_challenges,
        marketing_channels: data.marketing_channels,
        business_development_support_needed: data.business_development_support_needed,
        networking_preferences: data.networking_preferences,
        collaboration_interest: data.collaboration_interest,
        partnership_types: data.partnership_types,
        referral_system_interest: data.referral_system_interest,
        professional_profile: professionalProfile,
        professional_strategy: professionalStrategy,
        completed_at: new Date().toISOString(),
      };

      // Save to database
      const { data: savedAssessment, error } = await supabase
        .from('professional_needs_assessments')
        .insert([assessmentData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Assessment completed!",
        description: "Your professional profile has been saved successfully.",
      });

      onComplete({
        assessment: savedAssessment,
        profile: professionalProfile,
        strategy: professionalStrategy
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
  const handleSpecializationChange = (spec: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedSpecializations, spec]
      : selectedSpecializations.filter(s => s !== spec);
    setSelectedSpecializations(updated);
    setValue('specialization_areas', updated);
  };

  const handleServiceChange = (service: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedServices, service]
      : selectedServices.filter(s => s !== service);
    setSelectedServices(updated);
    setValue('services_offered', updated);
  };

  const handleDeliveryModeChange = (mode: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedDeliveryModes, mode]
      : selectedDeliveryModes.filter(m => m !== mode);
    setSelectedDeliveryModes(updated);
    setValue('service_delivery_modes', updated);
  };

  const handleClientTypeChange = (type: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedClientTypes, type]
      : selectedClientTypes.filter(t => t !== type);
    setSelectedClientTypes(updated);
    setValue('target_client_types', updated);
  };

  const handleClientSizeChange = (size: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedClientSizes, size]
      : selectedClientSizes.filter(s => s !== size);
    setSelectedClientSizes(updated);
    setValue('client_size_preference', updated);
  };

  const handleIndustryChange = (industry: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedIndustries, industry]
      : selectedIndustries.filter(i => i !== industry);
    setSelectedIndustries(updated);
    setValue('industry_focus', updated);
  };

  const handleSkillChange = (skill: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedSkills, skill]
      : selectedSkills.filter(s => s !== skill);
    setSelectedSkills(updated);
    setValue('key_skills', updated);
  };

  const handleCertificationChange = (cert: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedCertifications, cert]
      : selectedCertifications.filter(c => c !== cert);
    setSelectedCertifications(updated);
    setValue('certification_status', updated);
  };

  const handleChallengeChange = (challenge: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedChallenges, challenge]
      : selectedChallenges.filter(c => c !== challenge);
    setSelectedChallenges(updated);
    setValue('client_acquisition_challenges', updated);
  };

  const handleChannelChange = (channel: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedChannels, channel]
      : selectedChannels.filter(c => c !== channel);
    setSelectedChannels(updated);
    setValue('marketing_channels', updated);
  };

  const handleSupportChange = (support: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedSupport, support]
      : selectedSupport.filter(s => s !== support);
    setSelectedSupport(updated);
    setValue('business_development_support_needed', updated);
  };

  const handleNetworkingChange = (network: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedNetworking, network]
      : selectedNetworking.filter(n => n !== network);
    setSelectedNetworking(updated);
    setValue('networking_preferences', updated);
  };

  const handlePartnershipChange = (partnership: string, checked: boolean) => {
    const updated = checked 
      ? [...selectedPartnerships, partnership]
      : selectedPartnerships.filter(p => p !== partnership);
    setSelectedPartnerships(updated);
    setValue('partnership_types', updated);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                Professional Needs Assessment
              </CardTitle>
              <CardDescription>
                Help us understand your professional expertise and service preferences
              </CardDescription>
            </div>
            <Badge variant="outline">Step {currentStep} of {totalSteps}</Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Step 1: Professional Background */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <BriefcaseIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Professional Background</h3>
                  <p className="text-gray-600">Tell us about your professional experience and expertise</p>
                </div>

                <div>
                  <Label>Primary Profession</Label>
                  <Input
                    {...register('primary_profession')}
                    placeholder="e.g., Business Consultant, Financial Advisor, IT Specialist"
                  />
                  {errors.primary_profession && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.primary_profession.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    {...register('years_of_experience', { valueAsNumber: true })}
                    placeholder="e.g., 5"
                  />
                  {errors.years_of_experience && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.years_of_experience.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Specialization Areas</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {specializations.map((spec) => (
                      <div key={spec} className="flex items-center space-x-2">
                        <Checkbox
                          id={spec}
                          checked={selectedSpecializations.includes(spec)}
                          onCheckedChange={(checked) => 
                            handleSpecializationChange(spec, checked as boolean)
                          }
                        />
                        <Label htmlFor={spec} className="text-sm">{spec}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.specialization_areas && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.specialization_areas.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Current Employment Status</Label>
                  <Select onValueChange={(value) => setValue('current_employment_status', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your employment status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self_employed">Self-employed</SelectItem>
                      <SelectItem value="consultant">Independent Consultant</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Service Offerings */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Target className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Service Offerings</h3>
                  <p className="text-gray-600">What services do you offer and how do you deliver them?</p>
                </div>

                <div>
                  <Label>Services Offered</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {servicesOffered.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={service}
                          checked={selectedServices.includes(service)}
                          onCheckedChange={(checked) => 
                            handleServiceChange(service, checked as boolean)
                          }
                        />
                        <Label htmlFor={service} className="text-sm">{service}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.services_offered && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.services_offered.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Service Delivery Modes</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {deliveryModes.map((mode) => (
                      <div key={mode} className="flex items-center space-x-2">
                        <Checkbox
                          id={mode}
                          checked={selectedDeliveryModes.includes(mode)}
                          onCheckedChange={(checked) => 
                            handleDeliveryModeChange(mode, checked as boolean)
                          }
                        />
                        <Label htmlFor={mode} className="text-sm">{mode}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.service_delivery_modes && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.service_delivery_modes.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Minimum Hourly Rate (ZMW)</Label>
                    <Input
                      type="number"
                      {...register('hourly_rate_min', { valueAsNumber: true })}
                      placeholder="e.g., 100"
                    />
                    {errors.hourly_rate_min && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.hourly_rate_min.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div>
                    <Label>Maximum Hourly Rate (ZMW)</Label>
                    <Input
                      type="number"
                      {...register('hourly_rate_max', { valueAsNumber: true })}
                      placeholder="e.g., 300"
                    />
                    {errors.hourly_rate_max && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{errors.hourly_rate_max.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Target Clients */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Network className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Target Clients</h3>
                  <p className="text-gray-600">Who are your ideal clients and what industries do you serve?</p>
                </div>

                <div>
                  <Label>Target Client Types</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {clientTypes.map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedClientTypes.includes(type)}
                          onCheckedChange={(checked) => 
                            handleClientTypeChange(type, checked as boolean)
                          }
                        />
                        <Label htmlFor={type} className="text-sm">{type}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.target_client_types && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.target_client_types.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Client Size Preference (Optional)</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {clientSizes.map((size) => (
                      <div key={size} className="flex items-center space-x-2">
                        <Checkbox
                          id={size}
                          checked={selectedClientSizes.includes(size)}
                          onCheckedChange={(checked) => 
                            handleClientSizeChange(size, checked as boolean)
                          }
                        />
                        <Label htmlFor={size} className="text-sm">{size}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Industry Focus (Optional)</Label>
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
                </div>
              </div>
            )}

            {/* Step 4: Availability & Capacity */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <CheckCircle className="w-12 h-12 text-orange-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Availability & Capacity</h3>
                  <p className="text-gray-600">Tell us about your availability and working preferences</p>
                </div>

                <div>
                  <Label>Available Hours per Week</Label>
                  <Input
                    type="number"
                    min="1"
                    max="168"
                    {...register('availability_hours_per_week', { valueAsNumber: true })}
                    placeholder="e.g., 20"
                  />
                </div>

                <div>
                  <Label>Project Duration Preference</Label>
                  <Select onValueChange={(value) => setValue('project_duration_preference', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_term">Short-term (1-3 months)</SelectItem>
                      <SelectItem value="medium_term">Medium-term (3-12 months)</SelectItem>
                      <SelectItem value="long_term">Long-term (12+ months)</SelectItem>
                      <SelectItem value="flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Travel Willingness</Label>
                  <Select onValueChange={(value) => setValue('travel_willingness', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your travel preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local_only">Local only</SelectItem>
                      <SelectItem value="regional">Regional (within province)</SelectItem>
                      <SelectItem value="national">National (within Zambia)</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remote-work"
                    onCheckedChange={(checked) => setValue('remote_work_capability', checked as boolean)}
                  />
                  <Label htmlFor="remote-work">Capable of providing remote services</Label>
                </div>
              </div>
            )}

            {/* Step 5: Skills & Development */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <BookOpen className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Skills & Development</h3>
                  <p className="text-gray-600">What are your key skills and learning interests?</p>
                </div>

                <div>
                  <Label>Key Skills</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {keySkills.map((skill) => (
                      <div key={skill} className="flex items-center space-x-2">
                        <Checkbox
                          id={skill}
                          checked={selectedSkills.includes(skill)}
                          onCheckedChange={(checked) => 
                            handleSkillChange(skill, checked as boolean)
                          }
                        />
                        <Label htmlFor={skill} className="text-sm">{skill}</Label>
                      </div>
                    ))}
                  </div>
                  {errors.key_skills && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{errors.key_skills.message}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div>
                  <Label>Current Certifications</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {certifications.map((cert) => (
                      <div key={cert} className="flex items-center space-x-2">
                        <Checkbox
                          id={cert}
                          checked={selectedCertifications.includes(cert)}
                          onCheckedChange={(checked) => 
                            handleCertificationChange(cert, checked as boolean)
                          }
                        />
                        <Label htmlFor={cert} className="text-sm">{cert}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="continuous-learning"
                      onCheckedChange={(checked) => setValue('continuous_learning_interest', checked as boolean)}
                    />
                    <Label htmlFor="continuous-learning">Interested in continuous learning and upskilling</Label>
                  </div>
                </div>

                <div>
                  <Label>Mentorship Interest</Label>
                  <Select onValueChange={(value) => setValue('mentorship_interest', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your mentorship preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="provide">Provide mentorship to others</SelectItem>
                      <SelectItem value="receive">Receive mentorship</SelectItem>
                      <SelectItem value="both">Both provide and receive</SelectItem>
                      <SelectItem value="none">Not interested</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 6: Business Development & Collaboration */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Lightbulb className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                  <h3 className="text-xl font-semibold">Business Development & Collaboration</h3>
                  <p className="text-gray-600">How do you acquire clients and what support do you need?</p>
                </div>

                <div>
                  <Label>Client Acquisition Challenges</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {acquisitionChallenges.map((challenge) => (
                      <div key={challenge} className="flex items-center space-x-2">
                        <Checkbox
                          id={challenge}
                          checked={selectedChallenges.includes(challenge)}
                          onCheckedChange={(checked) => 
                            handleChallengeChange(challenge, checked as boolean)
                          }
                        />
                        <Label htmlFor={challenge} className="text-sm">{challenge}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Current Marketing Channels</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {marketingChannels.map((channel) => (
                      <div key={channel} className="flex items-center space-x-2">
                        <Checkbox
                          id={channel}
                          checked={selectedChannels.includes(channel)}
                          onCheckedChange={(checked) => 
                            handleChannelChange(channel, checked as boolean)
                          }
                        />
                        <Label htmlFor={channel} className="text-sm">{channel}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Business Development Support Needed</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {businessSupport.map((support) => (
                      <div key={support} className="flex items-center space-x-2">
                        <Checkbox
                          id={support}
                          checked={selectedSupport.includes(support)}
                          onCheckedChange={(checked) => 
                            handleSupportChange(support, checked as boolean)
                          }
                        />
                        <Label htmlFor={support} className="text-sm">{support}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Networking Preferences</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {networkingPreferences.map((network) => (
                      <div key={network} className="flex items-center space-x-2">
                        <Checkbox
                          id={network}
                          checked={selectedNetworking.includes(network)}
                          onCheckedChange={(checked) => 
                            handleNetworkingChange(network, checked as boolean)
                          }
                        />
                        <Label htmlFor={network} className="text-sm">{network}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="collaboration"
                      onCheckedChange={(checked) => setValue('collaboration_interest', checked as boolean)}
                    />
                    <Label htmlFor="collaboration">Interested in collaboration opportunities</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="referral"
                      onCheckedChange={(checked) => setValue('referral_system_interest', checked as boolean)}
                    />
                    <Label htmlFor="referral">Interested in referral system participation</Label>
                  </div>
                </div>

                <div>
                  <Label>Partnership Types (If interested in collaboration)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {partnershipTypes.map((partnership) => (
                      <div key={partnership} className="flex items-center space-x-2">
                        <Checkbox
                          id={partnership}
                          checked={selectedPartnerships.includes(partnership)}
                          onCheckedChange={(checked) => 
                            handlePartnershipChange(partnership, checked as boolean)
                          }
                        />
                        <Label htmlFor={partnership} className="text-sm">{partnership}</Label>
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