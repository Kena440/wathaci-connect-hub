import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedProfileForm } from '@/components/profile-forms';
import { DueDiligenceUpload } from '@/components/DueDiligenceUpload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserTypeSubscriptions } from '@/components/UserTypeSubscriptions';
import { User, Building, Briefcase, TrendingUp, Heart, Landmark, ArrowRight } from 'lucide-react';

const accountTypes = [
  {
    value: 'sole_proprietor',
    label: 'Sole Proprietor',
    description: 'Individual business owner running their own venture',
    icon: User,
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Expert offering specialized services (lawyers, accountants, consultants)',
    icon: Briefcase,
  },
  {
    value: 'sme',
    label: 'SME',
    description: 'Small & Medium Enterprise with registered company',
    icon: Building,
  },
  {
    value: 'investor',
    label: 'Investor',
    description: 'Individual or firm looking to invest in businesses',
    icon: TrendingUp,
  },
  {
    value: 'donor',
    label: 'Donor',
    description: 'Philanthropist or organization providing grants/funding',
    icon: Heart,
  },
  {
    value: 'government',
    label: 'Government Institution',
    description: 'Government agency or public sector organization',
    icon: Landmark,
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
      // Clean up the data - remove any undefined values and form-specific fields
      const cleanedData: Record<string, any> = {};
      
      const allowedFields = [
        'first_name', 'last_name', 'full_name', 'phone', 'country', 'address',
        'description', 'industry_sector', 'linkedin_url', 'website_url',
        'profile_image_url', 'business_name', 'registration_number',
        'specialization', 'experience_years', 'employee_count', 'annual_revenue',
        'funding_stage', 'qualifications', 'payment_method', 'payment_phone',
        'use_same_phone', 'coordinates', 'account_type'
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!showProfileForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome to WATHACI</CardTitle>
            <CardDescription className="text-base">
              Choose the account type that best describes your role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base font-medium">I am a...</Label>
              <div className="grid gap-3">
                {accountTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedAccountType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedAccountType(type.value)}
                      className={`flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                      {isSelected && (
                        <div className="text-primary">
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              onClick={handleAccountTypeSelect}
              disabled={!selectedAccountType || loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Set up your profile and complete due diligence to access all platform features
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Subscription Banner for Profile Setup */}
            <div className="mb-6">
              <UserTypeSubscriptions userType={selectedAccountType} />
            </div>
            
            <Tabs value={activeTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile Information</TabsTrigger>
                <TabsTrigger value="documents">Due Diligence Documents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="mt-6">
                <EnhancedProfileForm
                  accountType={selectedAccountType}
                  onSubmit={handleProfileSubmit}
                  onPrevious={handlePrevious}
                  loading={loading}
                  initialData={existingProfile}
                />
              </TabsContent>
              
              <TabsContent value="documents" className="mt-6">
                <DueDiligenceUpload onComplianceChange={setIsCompliant} />
                {isCompliant && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                      <span className="font-semibold">✓ Compliance Complete</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      You can now offer products and services on the marketplace.
                    </p>
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
