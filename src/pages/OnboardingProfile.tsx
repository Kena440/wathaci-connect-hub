import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
  { value: 'sme', label: 'SME / Business', description: 'Small or medium enterprise looking for funding, partners, or resources' },
  { value: 'freelancer', label: 'Professional / Freelancer', description: 'Individual offering professional services' },
  { value: 'investor', label: 'Investor', description: 'Angel investor, VC, or funding organization' },
  { value: 'government', label: 'Government Institution', description: 'Government agency or public institution' },
];

export default function OnboardingProfile() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
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

  // Role-specific forms - use undefined for enum fields
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
        // Load base profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          if (profile.account_type) {
            setAccountType(profile.account_type as AccountType);
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

      // Upsert base profile
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
    // Validate all forms
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

  const getRoleForm = () => {
    switch (accountType) {
      case 'sme':
        return <SMEStep form={smeForm} />;
      case 'freelancer':
        return <FreelancerStep form={freelancerForm} />;
      case 'investor':
        return <InvestorStep form={investorForm} />;
      case 'government':
        return <GovernmentStep form={governmentForm} />;
      default:
        return null;
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
  const getActiveRoleForm = () => {
    if (accountType === 'sme') return smeForm;
    if (accountType === 'freelancer') return freelancerForm;
    if (accountType === 'investor') return investorForm;
    if (accountType === 'government') return governmentForm;
    return smeForm; // fallback
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-muted-foreground mt-2">
            Set up your profile to get the most out of WATHACI Connect
          </p>
        </div>

        <OnboardingStepper 
          steps={STEPS} 
          currentStep={currentStep} 
          onStepClick={(step) => step < currentStep && setCurrentStep(step)}
        />

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Account Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Label>What best describes you? *</Label>
                <div className="grid gap-3">
                  {ACCOUNT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setAccountType(type.value as AccountType)}
                      className={`p-4 rounded-lg border-2 text-left transition-all ${
                        accountType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-foreground">{type.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Base Info */}
            {currentStep === 2 && (
              <Form {...baseForm}>
                <form className="space-y-6">
                  <BaseInfoStep form={baseForm} />
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
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold">Profile Summary</h3>
                  {(() => {
                    const data = getPreviewData();
                    return (
                      <dl className="grid gap-3 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                          <dt className="text-muted-foreground">Account Type:</dt>
                          <dd className="col-span-2 font-medium capitalize">{accountType}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <dt className="text-muted-foreground">Name:</dt>
                          <dd className="col-span-2">{data.full_name}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <dt className="text-muted-foreground">Location:</dt>
                          <dd className="col-span-2">{data.city}, {data.country}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <dt className="text-muted-foreground">Bio:</dt>
                          <dd className="col-span-2">{data.bio}</dd>
                        </div>
                        {accountType === 'sme' && (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Business:</dt>
                              <dd className="col-span-2">{data.business_name}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Industry:</dt>
                              <dd className="col-span-2">{data.industry}</dd>
                            </div>
                          </>
                        )}
                        {accountType === 'freelancer' && (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Title:</dt>
                              <dd className="col-span-2">{data.professional_title}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Skills:</dt>
                              <dd className="col-span-2">{data.primary_skills?.join(', ')}</dd>
                            </div>
                          </>
                        )}
                        {accountType === 'investor' && (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Type:</dt>
                              <dd className="col-span-2">{data.investor_type}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Ticket Size:</dt>
                              <dd className="col-span-2">{data.ticket_size_range}</dd>
                            </div>
                          </>
                        )}
                        {accountType === 'government' && (
                          <>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Institution:</dt>
                              <dd className="col-span-2">{data.institution_name}</dd>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <dt className="text-muted-foreground">Department:</dt>
                              <dd className="col-span-2">{data.department_or_unit}</dd>
                            </div>
                          </>
                        )}
                      </dl>
                    );
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  By completing your profile, you agree to make your public information visible to other users for matching and discovery purposes.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || saving}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep < 4 ? (
                <Button type="button" onClick={handleNext} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Continue
                </Button>
              ) : (
                <Button type="button" onClick={handleComplete} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Complete Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
