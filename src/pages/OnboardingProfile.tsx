import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Check, Sparkles, User, Building, TrendingUp, Landmark, Briefcase, MapPin, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';
import { BaseInfoStep } from '@/components/onboarding/steps/BaseInfoStep';
import { SMEStep } from '@/components/onboarding/steps/SMEStep';
import { FreelancerStep } from '@/components/onboarding/steps/FreelancerStep';
import { InvestorStep } from '@/components/onboarding/steps/InvestorStep';
import { GovernmentStep } from '@/components/onboarding/steps/GovernmentStep';
import { 
  baseProfileSchema, 
  smeProfileSchema, 
  freelancerProfileSchema, 
  investorProfileSchema, 
  governmentProfileSchema,
  type BaseProfileData,
  type SMEProfileData,
  type FreelancerProfileData,
  type InvestorProfileData,
  type GovernmentProfileData
} from '@/lib/validations/onboarding';

type AccountType = 'sme' | 'freelancer' | 'investor' | 'government';

const STEPS = [
  { id: 1, name: 'Account Type', description: 'Choose your role' },
  { id: 2, name: 'Basic Info', description: 'Your details' },
  { id: 3, name: 'Role Details', description: 'Specific information' },
  { id: 4, name: 'Review', description: 'Confirm & submit' },
];

const ACCOUNT_TYPES = [
  { 
    value: 'sme', 
    label: 'SME / Business', 
    description: 'Small or medium enterprise looking for funding, partners, or resources',
    icon: Building,
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-600'
  },
  { 
    value: 'freelancer', 
    label: 'Professional / Freelancer', 
    description: 'Individual offering professional services',
    icon: Briefcase,
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-600'
  },
  { 
    value: 'investor', 
    label: 'Investor', 
    description: 'Angel investor, VC, or funding organization',
    icon: TrendingUp,
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-600'
  },
  { 
    value: 'government', 
    label: 'Government Institution', 
    description: 'Government agency or public institution',
    icon: Landmark,
    color: 'from-amber-500/20 to-amber-600/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-600'
  },
];

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Base form
  const baseForm = useForm<BaseProfileData>({
    resolver: zodResolver(baseProfileSchema),
    defaultValues: {
      full_name: '',
      display_name: '',
      phone: '',
      country: 'Zambia',
      city: '',
      bio: '',
      website_url: '',
      linkedin_url: '',
    },
  });

  // Role-specific forms
  const smeForm = useForm<SMEProfileData>({
    resolver: zodResolver(smeProfileSchema),
    defaultValues: {
      business_name: '',
      industry: '',
      business_stage: undefined,
      services_or_products: '',
      top_needs: [],
      areas_served: [],
      registration_status: '',
      team_size_range: '',
      funding_needed: false,
      funding_range: '',
      preferred_support: [],
      sectors_of_interest: [],
    },
  });

  const freelancerForm = useForm<FreelancerProfileData>({
    resolver: zodResolver(freelancerProfileSchema),
    defaultValues: {
      professional_title: '',
      primary_skills: [],
      services_offered: '',
      experience_level: undefined,
      availability: undefined,
      work_mode: undefined,
      rate_type: undefined,
      rate_range: '',
      portfolio_url: '',
      certifications: [],
      languages: [],
      preferred_industries: [],
    },
  });

  const investorForm = useForm<InvestorProfileData>({
    resolver: zodResolver(investorProfileSchema),
    defaultValues: {
      investor_type: undefined,
      ticket_size_range: '',
      investment_stage_focus: [],
      sectors_of_interest: [],
      investment_preferences: [],
      geo_focus: [],
      thesis: '',
      decision_timeline: '',
    },
  });

  const governmentForm = useForm<GovernmentProfileData>({
    resolver: zodResolver(governmentProfileSchema),
    defaultValues: {
      institution_name: '',
      department_or_unit: '',
      institution_type: undefined,
      mandate_areas: [],
      services_or_programmes: '',
      collaboration_interests: [],
      contact_person_title: '',
      current_initiatives: '',
      eligibility_criteria: '',
    },
  });

  // Load existing profile data
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          if (profile.account_type) {
            setAccountType(profile.account_type as AccountType);
          }
          
          // Load avatar
          if (profile.avatar_url || profile.profile_image_url) {
            setAvatarUrl(profile.avatar_url || profile.profile_image_url);
          }
          
          baseForm.reset({
            full_name: profile.full_name || '',
            display_name: profile.display_name || '',
            phone: profile.phone || '',
            country: profile.country || 'Zambia',
            city: profile.city || '',
            bio: profile.bio || '',
            website_url: profile.website_url || '',
            linkedin_url: profile.linkedin_url || '',
          });

          // Load role-specific data
          if (profile.account_type === 'sme') {
            const { data: smeData } = await supabase
              .from('sme_profiles')
              .select('*')
              .eq('profile_id', user.id)
              .maybeSingle();
            if (smeData) {
              smeForm.reset({
                business_name: smeData.business_name || '',
                industry: smeData.industry || '',
                business_stage: (smeData.business_stage as SMEProfileData['business_stage']) || undefined,
                services_or_products: smeData.services_or_products || '',
                top_needs: smeData.top_needs || [],
                areas_served: smeData.areas_served || [],
                registration_status: smeData.registration_status || '',
                team_size_range: smeData.team_size_range || '',
                funding_needed: smeData.funding_needed || false,
                funding_range: smeData.funding_range || '',
                preferred_support: smeData.preferred_support || [],
                sectors_of_interest: smeData.sectors_of_interest || [],
              });
            }
          } else if (profile.account_type === 'freelancer') {
            const { data: freelancerData } = await supabase
              .from('freelancer_profiles')
              .select('*')
              .eq('profile_id', user.id)
              .maybeSingle();
            if (freelancerData) {
              freelancerForm.reset({
                professional_title: freelancerData.professional_title || '',
                primary_skills: freelancerData.primary_skills || [],
                services_offered: freelancerData.services_offered || '',
                experience_level: (freelancerData.experience_level as FreelancerProfileData['experience_level']) || undefined,
                availability: (freelancerData.availability as FreelancerProfileData['availability']) || undefined,
                work_mode: (freelancerData.work_mode as FreelancerProfileData['work_mode']) || undefined,
                rate_type: (freelancerData.rate_type as FreelancerProfileData['rate_type']) || undefined,
                rate_range: freelancerData.rate_range || '',
                portfolio_url: freelancerData.portfolio_url || '',
                certifications: freelancerData.certifications || [],
                languages: freelancerData.languages || [],
                preferred_industries: freelancerData.preferred_industries || [],
              });
            }
          } else if (profile.account_type === 'investor') {
            const { data: investorData } = await supabase
              .from('investor_profiles')
              .select('*')
              .eq('profile_id', user.id)
              .maybeSingle();
            if (investorData) {
              investorForm.reset({
                investor_type: (investorData.investor_type as InvestorProfileData['investor_type']) || undefined,
                ticket_size_range: investorData.ticket_size_range || '',
                investment_stage_focus: investorData.investment_stage_focus || [],
                sectors_of_interest: investorData.sectors_of_interest || [],
                investment_preferences: investorData.investment_preferences || [],
                geo_focus: investorData.geo_focus || [],
                thesis: investorData.thesis || '',
                decision_timeline: investorData.decision_timeline || '',
              });
            }
          } else if (profile.account_type === 'government') {
            const { data: govData } = await supabase
              .from('government_profiles')
              .select('*')
              .eq('profile_id', user.id)
              .maybeSingle();
            if (govData) {
              governmentForm.reset({
                institution_name: govData.institution_name || '',
                department_or_unit: govData.department_or_unit || '',
                institution_type: (govData.institution_type as GovernmentProfileData['institution_type']) || undefined,
                mandate_areas: govData.mandate_areas || [],
                services_or_programmes: govData.services_or_programmes || '',
                collaboration_interests: govData.collaboration_interests || [],
                contact_person_title: govData.contact_person_title || '',
                current_initiatives: govData.current_initiatives || '',
                eligibility_criteria: govData.eligibility_criteria || '',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExistingData();
  }, [user]);

  const saveProgress = async (complete = false) => {
    if (!user || !accountType) return false;

    setSaving(true);
    try {
      const baseData = baseForm.getValues();

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          account_type: accountType,
          full_name: baseData.full_name,
          display_name: baseData.display_name || null,
          phone: baseData.phone || null,
          country: baseData.country,
          city: baseData.city,
          bio: baseData.bio,
          website_url: baseData.website_url || null,
          linkedin_url: baseData.linkedin_url || null,
          avatar_url: avatarUrl,
          is_profile_complete: complete,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (profileError) throw profileError;

      // Upsert role-specific data
      if (accountType === 'sme') {
        const smeData = smeForm.getValues();
        const { error } = await supabase
          .from('sme_profiles')
          .upsert({
            profile_id: user.id,
            business_name: smeData.business_name,
            industry: smeData.industry,
            business_stage: smeData.business_stage,
            services_or_products: smeData.services_or_products,
            top_needs: smeData.top_needs,
            areas_served: smeData.areas_served,
            registration_status: smeData.registration_status || null,
            team_size_range: smeData.team_size_range || null,
            funding_needed: smeData.funding_needed || false,
            funding_range: smeData.funding_range || null,
            preferred_support: smeData.preferred_support || [],
            sectors_of_interest: smeData.sectors_of_interest || [],
          }, { onConflict: 'profile_id' });
        if (error) throw error;
      } else if (accountType === 'freelancer') {
        const freelancerData = freelancerForm.getValues();
        const { error } = await supabase
          .from('freelancer_profiles')
          .upsert({
            profile_id: user.id,
            professional_title: freelancerData.professional_title,
            primary_skills: freelancerData.primary_skills,
            services_offered: freelancerData.services_offered,
            experience_level: freelancerData.experience_level,
            availability: freelancerData.availability,
            work_mode: freelancerData.work_mode,
            rate_type: freelancerData.rate_type,
            rate_range: freelancerData.rate_range,
            portfolio_url: freelancerData.portfolio_url || null,
            certifications: freelancerData.certifications || [],
            languages: freelancerData.languages || [],
            preferred_industries: freelancerData.preferred_industries || [],
          }, { onConflict: 'profile_id' });
        if (error) throw error;
      } else if (accountType === 'investor') {
        const investorData = investorForm.getValues();
        const { error } = await supabase
          .from('investor_profiles')
          .upsert({
            profile_id: user.id,
            investor_type: investorData.investor_type,
            ticket_size_range: investorData.ticket_size_range,
            investment_stage_focus: investorData.investment_stage_focus,
            sectors_of_interest: investorData.sectors_of_interest,
            investment_preferences: investorData.investment_preferences,
            geo_focus: investorData.geo_focus,
            thesis: investorData.thesis || null,
            decision_timeline: investorData.decision_timeline || null,
          }, { onConflict: 'profile_id' });
        if (error) throw error;
      } else if (accountType === 'government') {
        const govData = governmentForm.getValues();
        const { error } = await supabase
          .from('government_profiles')
          .upsert({
            profile_id: user.id,
            institution_name: govData.institution_name,
            department_or_unit: govData.department_or_unit,
            institution_type: govData.institution_type,
            mandate_areas: govData.mandate_areas,
            services_or_programmes: govData.services_or_programmes,
            collaboration_interests: govData.collaboration_interests,
            contact_person_title: govData.contact_person_title,
            current_initiatives: govData.current_initiatives || null,
            eligibility_criteria: govData.eligibility_criteria || null,
          }, { onConflict: 'profile_id' });
        if (error) throw error;
      }

      return true;
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!accountType) {
        toast.error('Please select an account type');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await baseForm.trigger();
      if (!valid) {
        toast.error('Please fill in all required fields');
        return;
      }
      await saveProgress();
      setCurrentStep(3);
    } else if (currentStep === 3) {
      let valid = false;
      if (accountType === 'sme') {
        valid = await smeForm.trigger();
      } else if (accountType === 'freelancer') {
        valid = await freelancerForm.trigger();
      } else if (accountType === 'investor') {
        valid = await investorForm.trigger();
      } else if (accountType === 'government') {
        valid = await governmentForm.trigger();
      }
      if (!valid) {
        toast.error('Please fill in all required fields');
        return;
      }
      await saveProgress();
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    const baseValid = await baseForm.trigger();
    if (!baseValid) {
      toast.error('Please complete all basic info fields');
      setCurrentStep(2);
      return;
    }

    let roleValid = false;
    if (accountType === 'sme') {
      roleValid = await smeForm.trigger();
    } else if (accountType === 'freelancer') {
      roleValid = await freelancerForm.trigger();
    } else if (accountType === 'investor') {
      roleValid = await investorForm.trigger();
    } else if (accountType === 'government') {
      roleValid = await governmentForm.trigger();
    }

    if (!roleValid) {
      toast.error('Please complete all role-specific fields');
      setCurrentStep(3);
      return;
    }

    const success = await saveProgress(true);
    if (success) {
      await refreshProfile();
      toast.success('Profile completed successfully!');
      navigate('/');
    }
  };

  const getPreviewData = (): Record<string, any> => {
    const base = baseForm.getValues() as Record<string, any>;
    let roleData: Record<string, any> = {};

    if (accountType === 'sme') {
      roleData = smeForm.getValues();
    } else if (accountType === 'freelancer') {
      roleData = freelancerForm.getValues();
    } else if (accountType === 'investor') {
      roleData = investorForm.getValues();
    } else if (accountType === 'government') {
      roleData = governmentForm.getValues();
    }

    return { ...base, ...roleData };
  };

  const selectedAccountTypeInfo = ACCOUNT_TYPES.find(t => t.value === accountType);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/30">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-muted-foreground mt-4 animate-pulse">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8 px-4 sm:py-12">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Complete Your Profile</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Welcome to <span className="gradient-text">WATHACI Connect</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-base sm:text-lg">
            Set up your profile to unlock funding opportunities, partnerships, and professional connections
          </p>
        </div>

        <OnboardingStepper 
          steps={STEPS} 
          currentStep={currentStep} 
          onStepClick={(step) => step < currentStep && setCurrentStep(step)}
        />

        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
          {/* Step Header */}
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b pb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{currentStep}</span>
              </div>
              <div>
                <CardTitle className="text-xl">{STEPS[currentStep - 1].name}</CardTitle>
                <CardDescription className="text-base">{STEPS[currentStep - 1].description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 sm:p-8">
            {/* Step 1: Account Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <p className="text-sm text-muted-foreground">Select the option that best describes you</p>
                </div>
                <div className="grid gap-4">
                  {ACCOUNT_TYPES.map((type) => {
                    const Icon = type.icon;
                    const isSelected = accountType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAccountType(type.value as AccountType)}
                        className={`group relative p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                          isSelected
                            ? `border-primary bg-gradient-to-br ${type.color} shadow-lg shadow-primary/10`
                            : 'border-border hover:border-primary/40 hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl transition-all ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground shadow-md' 
                              : `bg-gradient-to-br ${type.color} ${type.iconColor}`
                          }`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground text-lg">{type.label}</div>
                            <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{type.description}</div>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="h-4 w-4" strokeWidth={3} />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Base Info */}
            {currentStep === 2 && (
              <Form {...baseForm}>
                <form className="space-y-6">
                  <BaseInfoStep 
                    form={baseForm} 
                    currentAvatar={avatarUrl}
                    onAvatarChange={setAvatarUrl}
                  />
                </form>
              </Form>
            )}

            {/* Step 3: Role-specific */}
            {currentStep === 3 && accountType === 'sme' && (
              <Form {...smeForm}>
                <form className="space-y-6">
                  <SMEStep form={smeForm} />
                </form>
              </Form>
            )}
            {currentStep === 3 && accountType === 'freelancer' && (
              <Form {...freelancerForm}>
                <form className="space-y-6">
                  <FreelancerStep form={freelancerForm} />
                </form>
              </Form>
            )}
            {currentStep === 3 && accountType === 'investor' && (
              <Form {...investorForm}>
                <form className="space-y-6">
                  <InvestorStep form={investorForm} />
                </form>
              </Form>
            )}
            {currentStep === 3 && accountType === 'government' && (
              <Form {...governmentForm}>
                <form className="space-y-6">
                  <GovernmentStep form={governmentForm} />
                </form>
              </Form>
            )}

            {/* Step 4: Preview */}
            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Success indicator */}
                <div className="flex items-center justify-center mb-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-zambia-green/20 to-zambia-green/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-zambia-green" />
                  </div>
                </div>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-foreground">Almost there!</h3>
                  <p className="text-muted-foreground mt-1">Review your profile before completing</p>
                </div>

                {/* Profile Preview Card */}
                <div className="bg-gradient-to-br from-muted/60 to-muted/40 rounded-2xl p-6 space-y-5">
                  {/* Account Type Badge */}
                  {selectedAccountTypeInfo && (
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedAccountTypeInfo.color}`}>
                        <selectedAccountTypeInfo.icon className={`h-5 w-5 ${selectedAccountTypeInfo.iconColor}`} />
                      </div>
                      <Badge variant="secondary" className="text-sm capitalize">
                        {accountType?.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}

                  <Separator />

                  {/* Profile Details */}
                  {(() => {
                    const data = getPreviewData();
                    return (
                      <dl className="space-y-4">
                        {/* Basic Info */}
                        <div className="grid gap-3">
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground font-medium">{data.full_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground">{data.city}, {data.country}</span>
                          </div>
                          {data.website_url && (
                            <div className="flex items-center gap-3">
                              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{data.website_url}</span>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Bio */}
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bio</dt>
                          <dd className="text-foreground text-sm leading-relaxed">{data.bio}</dd>
                        </div>

                        {/* Role-specific details */}
                        {accountType === 'sme' && (
                          <>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Business</dt>
                                <dd className="text-foreground font-medium">{data.business_name}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Industry</dt>
                                <dd className="text-foreground">{data.industry}</dd>
                              </div>
                            </div>
                          </>
                        )}
                        {accountType === 'freelancer' && (
                          <>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Title</dt>
                                <dd className="text-foreground font-medium">{data.professional_title}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Skills</dt>
                                <dd className="text-foreground text-sm">{data.primary_skills?.slice(0, 3).join(', ')}{data.primary_skills?.length > 3 ? '...' : ''}</dd>
                              </div>
                            </div>
                          </>
                        )}
                        {accountType === 'investor' && (
                          <>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Type</dt>
                                <dd className="text-foreground font-medium capitalize">{data.investor_type?.replace('_', ' ')}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Ticket Size</dt>
                                <dd className="text-foreground">{data.ticket_size_range}</dd>
                              </div>
                            </div>
                          </>
                        )}
                        {accountType === 'government' && (
                          <>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Institution</dt>
                                <dd className="text-foreground font-medium">{data.institution_name}</dd>
                              </div>
                              <div>
                                <dt className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Department</dt>
                                <dd className="text-foreground">{data.department_or_unit}</dd>
                              </div>
                            </div>
                          </>
                        )}
                      </dl>
                    );
                  })()}
                </div>

                <p className="text-xs text-center text-muted-foreground px-4">
                  By completing your profile, you agree to make your public information visible to other users for matching and discovery purposes.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-10 pt-6 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1 || saving}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {currentStep < 4 ? (
                <Button 
                  type="button" 
                  onClick={handleNext} 
                  disabled={saving}
                  size="lg"
                  className="gap-2 px-8 shadow-lg shadow-primary/20"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleComplete} 
                  disabled={saving}
                  size="lg"
                  className="gap-2 px-8 bg-gradient-to-r from-zambia-green to-zambia-green/90 hover:from-zambia-green/90 hover:to-zambia-green/80 shadow-lg shadow-zambia-green/20"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" strokeWidth={3} />
                      Complete Profile
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Help text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Need help? <a href="/resources" className="text-primary hover:underline">Visit our resources</a> or contact support
        </p>
      </div>
    </div>
  );
}
