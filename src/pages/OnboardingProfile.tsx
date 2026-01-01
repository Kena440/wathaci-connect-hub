import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Check, Sparkles, User, Building, TrendingUp, Landmark, Briefcase, MapPin, Globe, CheckCircle2, PartyPopper } from 'lucide-react';
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
  const location = useLocation();
  const { user, profile, profileLoading } = useAuth();
  const { completeProfile, saveDraft, isCompleting } = useProfileCompletion();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  // Redirect if profile is already complete
  useEffect(() => {
    if (!profileLoading && profile?.is_profile_complete) {
      console.log('[Onboarding] Profile already complete, redirecting...');
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [profile, profileLoading, navigate, location.state]);

  // Load existing profile data
  useEffect(() => {
    const loadExistingData = async () => {
      if (!user) return;

      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          if (profileData.account_type) {
            setAccountType(profileData.account_type as AccountType);
          }
          
          // Load avatar
          if (profileData.avatar_url || profileData.profile_image_url) {
            setAvatarUrl(profileData.avatar_url || profileData.profile_image_url);
          }
          
          baseForm.reset({
            full_name: profileData.full_name || '',
            display_name: profileData.display_name || '',
            phone: profileData.phone || '',
            country: profileData.country || 'Zambia',
            city: profileData.city || '',
            bio: profileData.bio || '',
            website_url: profileData.website_url || '',
            linkedin_url: profileData.linkedin_url || '',
          });

          // Load role-specific data
          if (profileData.account_type === 'sme') {
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
          } else if (profileData.account_type === 'freelancer') {
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
          } else if (profileData.account_type === 'investor') {
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
          } else if (profileData.account_type === 'government') {
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

          // Restore step from localStorage if available
          const savedStep = localStorage.getItem(`onboarding_step_${user.id}`);
          if (savedStep && !profileData.is_profile_complete) {
            const step = parseInt(savedStep, 10);
            if (step >= 1 && step <= 4) {
              setCurrentStep(step);
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

  // Save step to localStorage
  const saveStep = useCallback((step: number) => {
    if (user) {
      localStorage.setItem(`onboarding_step_${user.id}`, step.toString());
    }
  }, [user]);

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!accountType) {
        toast.error('Please select an account type');
        return;
      }
      saveStep(2);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const valid = await baseForm.trigger();
      if (!valid) {
        toast.error('Please fill in all required fields');
        return;
      }
      // Save draft
      setSaving(true);
      await saveDraft(baseForm.getValues(), accountType || undefined);
      setSaving(false);
      saveStep(3);
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
      saveStep(4);
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1;
      saveStep(newStep);
      setCurrentStep(newStep);
    }
  };

  const handleComplete = async () => {
    // Validate base form
    const baseValid = await baseForm.trigger();
    if (!baseValid) {
      toast.error('Please complete all basic info fields');
      setCurrentStep(2);
      return;
    }

    // Validate role form
    let roleValid = false;
    let roleData: Record<string, any> = {};
    
    if (accountType === 'sme') {
      roleValid = await smeForm.trigger();
      roleData = smeForm.getValues();
    } else if (accountType === 'freelancer') {
      roleValid = await freelancerForm.trigger();
      roleData = freelancerForm.getValues();
    } else if (accountType === 'investor') {
      roleValid = await investorForm.trigger();
      roleData = investorForm.getValues();
    } else if (accountType === 'government') {
      roleValid = await governmentForm.trigger();
      roleData = governmentForm.getValues();
    }

    if (!roleValid) {
      toast.error('Please complete all role-specific fields');
      setCurrentStep(3);
      return;
    }

    if (!accountType) {
      toast.error('Please select an account type');
      setCurrentStep(1);
      return;
    }

    // Use the transaction-safe completion hook
    const result = await completeProfile({
      baseData: {
        ...baseForm.getValues(),
        avatar_url: avatarUrl || undefined,
      },
      roleData,
      accountType,
    });

    if (result.success) {
      setShowSuccess(true);
      toast.success('Profile completed successfully!');
      
      // Short delay to show success animation
      setTimeout(() => {
        const from = (location.state as any)?.from?.pathname || '/';
        navigate(from, { replace: true });
      }, 2000);
    }
    // Error is already handled in the hook
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

  // Show success celebration
  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/30">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <div className="relative z-10 h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <PartyPopper className="h-12 w-12 text-primary-foreground animate-bounce" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to WATHACI Connect!</h1>
          <p className="text-muted-foreground">Your profile is complete. Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading || profileLoading) {
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
                <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            {/* Step 1: Account Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-foreground">What describes you best?</h3>
                  <p className="text-sm text-muted-foreground mt-1">This helps us personalize your experience</p>
                </div>
                <div className="grid gap-4">
                  {ACCOUNT_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    const isSelected = accountType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAccountType(type.value as AccountType)}
                        className={`
                          relative group p-5 rounded-xl border-2 text-left transition-all duration-300
                          ${isSelected 
                            ? `${type.borderColor} bg-gradient-to-r ${type.color} shadow-lg scale-[1.02]` 
                            : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                          }
                        `}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`
                            p-3 rounded-xl transition-colors
                            ${isSelected ? `bg-background/80 ${type.iconColor}` : 'bg-muted text-muted-foreground group-hover:text-foreground'}
                          `}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">{type.label}</span>
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 2 && (
              <Form {...baseForm}>
                <form className="space-y-6">
                  <BaseInfoStep 
                    form={baseForm} 
                    onAvatarChange={setAvatarUrl}
                    currentAvatar={avatarUrl}
                  />
                </form>
              </Form>
            )}

            {/* Step 3: Role-specific Info */}
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

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Review Your Profile</h3>
                  <p className="text-sm text-muted-foreground mt-1">Make sure everything looks correct before submitting</p>
                </div>

                {/* Profile Preview */}
                <div className="space-y-6">
                  {/* Account Type Badge */}
                  {selectedAccountTypeInfo && (
                    <div className="flex items-center justify-center">
                      <Badge variant="secondary" className={`gap-2 px-4 py-2 text-base ${selectedAccountTypeInfo.iconColor}`}>
                        {React.createElement(selectedAccountTypeInfo.icon, { className: 'h-4 w-4' })}
                        {selectedAccountTypeInfo.label}
                      </Badge>
                    </div>
                  )}

                  <Separator />

                  {/* Basic Info Preview */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Basic Information
                    </h4>
                    <div className="grid gap-3 text-sm">
                      {Object.entries(getPreviewData()).slice(0, 8).map(([key, value]) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) return null;
                        const displayValue = Array.isArray(value) ? value.join(', ') : value;
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        return (
                          <div key={key} className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium text-foreground text-right max-w-[60%]">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Role-specific Preview */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      {selectedAccountTypeInfo && React.createElement(selectedAccountTypeInfo.icon, { className: 'h-4 w-4' })}
                      {selectedAccountTypeInfo?.label} Details
                    </h4>
                    <div className="grid gap-3 text-sm">
                      {Object.entries(getPreviewData()).slice(8).map(([key, value]) => {
                        if (!value || (Array.isArray(value) && value.length === 0) || typeof value === 'boolean') return null;
                        const displayValue = Array.isArray(value) ? value.join(', ') : value;
                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        return (
                          <div key={key} className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium text-foreground text-right max-w-[60%]">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 1 || saving || isCompleting}
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
                  className="gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleComplete}
                  disabled={isCompleting}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isCompleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Complete Profile
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}