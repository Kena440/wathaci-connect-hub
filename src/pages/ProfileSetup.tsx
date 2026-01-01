import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProfileForm } from '@/components/profile-forms';
import { DueDiligenceUpload } from '@/components/DueDiligenceUpload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserTypeSubscriptions } from '@/components/UserTypeSubscriptions';
import { User, Building, Briefcase, TrendingUp, Heart, Landmark, ArrowRight, Check, Sparkles, FileCheck, Loader2 } from 'lucide-react';

const accountTypes = [
  {
    value: 'sole_proprietor',
    label: 'Sole Proprietor',
    description: 'Individual business owner running their own venture',
    icon: User,
    color: 'from-violet-500/20 to-violet-600/10',
    borderColor: 'border-violet-500/30',
    iconColor: 'text-violet-600',
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Expert offering specialized services (lawyers, accountants, consultants)',
    icon: Briefcase,
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    iconColor: 'text-purple-600',
  },
  {
    value: 'sme',
    label: 'SME',
    description: 'Small & Medium Enterprise with registered company',
    icon: Building,
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-600',
  },
  {
    value: 'investor',
    label: 'Investor',
    description: 'Individual or firm looking to invest in businesses',
    icon: TrendingUp,
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    iconColor: 'text-emerald-600',
  },
  {
    value: 'donor',
    label: 'Donor',
    description: 'Philanthropist or organization providing grants/funding',
    icon: Heart,
    color: 'from-rose-500/20 to-rose-600/10',
    borderColor: 'border-rose-500/30',
    iconColor: 'text-rose-600',
  },
  {
    value: 'government',
    label: 'Government Institution',
    description: 'Government agency or public sector organization',
    icon: Landmark,
    color: 'from-amber-500/20 to-amber-600/10',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-600',
  },
];

export const ProfileSetup = () => {
  const [selectedAccountType, setSelectedAccountType] = useState<string>('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isCompliant, setIsCompliant] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, refreshProfile } = useAuth();

  const activeTab = searchParams.get('tab') || 'profile';

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    checkExistingProfile();
  }, [user, navigate]);

  const checkExistingProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (profile) {
        setExistingProfile(profile);
        if (profile.account_type) {
          setSelectedAccountType(profile.account_type);
          if (profile.profile_completed) {
            setShowProfileForm(true);
          }
        }
      }
    } catch (error: any) {
      console.error('Error checking profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive",
      });
    }
  };

  const handleAccountTypeSelect = async () => {
    if (!selectedAccountType || !user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          email: user.email,
          account_type: selectedAccountType,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      await refreshProfile();
      setShowProfileForm(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setShowProfileForm(false);
  };

  const handleProfileSubmit = async (profileData: any) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const cleanedData: Record<string, any> = {};
      
      const allowedFields = [
        'first_name', 'last_name', 'full_name', 'phone', 'country', 'province', 
        'city', 'address', 'coordinates', 'profile_image_url', 'avatar_url',
        'title', 'bio', 'description', 'specialization', 'experience_years',
        'qualifications', 'certifications', 'license_number', 'skills',
        'services_offered', 'hourly_rate', 'currency', 'availability_status',
        'business_name', 'registration_number', 'industry_sector', 'ownership_structure',
        'employee_count', 'annual_revenue', 'funding_stage', 'funding_needed',
        'years_in_business', 'business_model', 'sectors', 'target_market',
        'website_url', 'linkedin_url', 'twitter_url', 'facebook_url', 'portfolio_url',
        'payment_method', 'payment_phone', 'use_same_phone',
        'rating', 'reviews_count', 'total_jobs_completed',
        'compliance_verified', 'verification_date', 'documents_submitted',
        'total_invested', 'total_donated', 'investment_portfolio', 'preferred_sectors',
        'preferred_contact_method', 'notification_preferences',
        'account_type', 'gaps_identified'
      ];

      for (const key of allowedFields) {
        if (profileData[key] !== undefined && profileData[key] !== '') {
          cleanedData[key] = profileData[key];
        }
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...cleanedData,
          profile_completed: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      await refreshProfile();

      toast({
        title: "Profile completed!",
        description: "Your profile has been successfully saved.",
      });

      navigate('/profile-review');
    } catch (error: any) {
      console.error('Profile save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeInfo = accountTypes.find(t => t.value === selectedAccountType);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted/30">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-muted-foreground mt-4 animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!showProfileForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 py-8 px-4 sm:py-12">
        {/* Background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              <span>Get Started</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Welcome to <span className="gradient-text">WATHACI</span>
            </h1>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-base sm:text-lg">
              Choose the account type that best describes your role to unlock personalized features
            </p>
          </div>
          
          <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b pb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">I am a...</CardTitle>
                  <CardDescription className="text-base">Select one to continue</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="grid gap-4">
                {accountTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedAccountType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedAccountType(type.value)}
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
                      
                      {isSelected && (
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <Button
                onClick={handleAccountTypeSelect}
                disabled={!selectedAccountType || loading}
                className="w-full gap-2 shadow-lg shadow-primary/20"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
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
      
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            <span>Complete Your Profile</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Set Up Your <span className="gradient-text">Profile</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Complete your profile and due diligence to access all platform features
          </p>
          
          {/* Account type badge */}
          {selectedTypeInfo && (
            <div className="mt-4 inline-flex items-center gap-2">
              <Badge variant="secondary" className="text-sm gap-2 py-1.5 px-3">
                <selectedTypeInfo.icon className={`h-4 w-4 ${selectedTypeInfo.iconColor}`} />
                {selectedTypeInfo.label}
              </Badge>
            </div>
          )}
        </div>
        
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
            <UserTypeSubscriptions userType={selectedAccountType} />
          </CardHeader>
          
          <CardContent className="p-0">
            <Tabs value={activeTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-muted/30 h-14">
                <TabsTrigger 
                  value="profile" 
                  className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none h-full"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile Information</span>
                  <span className="sm:hidden">Profile</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="documents"
                  className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-none h-full"
                >
                  <FileCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">Due Diligence Documents</span>
                  <span className="sm:hidden">Documents</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="p-6 sm:p-8 mt-0">
                <EnhancedProfileForm
                  accountType={selectedAccountType}
                  onSubmit={handleProfileSubmit}
                  onPrevious={handlePrevious}
                  loading={loading}
                  initialData={existingProfile}
                />
              </TabsContent>
              
              <TabsContent value="documents" className="p-6 sm:p-8 mt-0">
                <DueDiligenceUpload onComplianceChange={setIsCompliant} />
                {isCompliant && (
                  <div className="mt-6 p-5 bg-gradient-to-br from-zambia-green/10 to-zambia-green/5 border border-zambia-green/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-zambia-green/20 flex items-center justify-center">
                        <Check className="h-5 w-5 text-zambia-green" strokeWidth={3} />
                      </div>
                      <div>
                        <span className="font-semibold text-zambia-green">Compliance Complete</span>
                        <p className="text-sm text-zambia-green/80 mt-0.5">
                          You can now offer products and services on the marketplace.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
