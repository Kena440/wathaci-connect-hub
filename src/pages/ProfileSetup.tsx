import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-enhanced';
import { ProfileForm } from '@/components/ProfileForm';
import { DueDiligenceUpload } from '@/components/DueDiligenceUpload';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserTypeSubscriptions } from '@/components/UserTypeSubscriptions';
import { prepareProfileForUpsert } from '@/utils/profile';
import BackToHomeButton from '@/components/BackToHomeButton';

export const ProfileSetup = () => {
  const [selectedAccountType, setSelectedAccountType] = useState<string>('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isCompliant, setIsCompliant] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, refreshUser } = useAppContext();

  const activeTab = searchParams.get('tab') || 'profile';

  const checkExistingProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
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
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    void checkExistingProfile();
  }, [user, navigate, checkExistingProfile]);

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
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      await refreshUser();
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
    setSelectedAccountType('');
  };

  const handleProfileSubmit = async (profileData: any) => {
    if (!user) return;

    setLoading(true);

    try {
      const { upsertPayload } = prepareProfileForUpsert({
        profileData,
        userId: user.id,
        userEmail: user.email,
        existingProfile,
      });

      const { error } = await supabase
        .from('profiles')
        .upsert(upsertPayload);

      if (error) throw error;

      await refreshUser();

      toast({
        title: "Profile completed!",
        description: "Your profile has been successfully saved.",
      });

      // Navigate users to appropriate needs assessment based on account type
      if (selectedAccountType === 'sme' || selectedAccountType === 'sole_proprietor') {
        navigate('/sme-assessment');
      } else if (selectedAccountType === 'investor') {
        navigate('/investor-assessment');
      } else if (selectedAccountType === 'donor') {
        navigate('/donor-assessment');
      } else if (selectedAccountType === 'professional') {
        navigate('/professional-assessment');
      } else if (selectedAccountType === 'government') {
        navigate('/government-assessment');
      } else {
        navigate('/profile-review');
      }
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

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!showProfileForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <BackToHomeButton />
          <Card>
          <CardHeader>
            <CardTitle>Select Your Account Type</CardTitle>
            <CardDescription>
              Choose the category that best describes your role or organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Account Type</Label>
              <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="sme">SME (Small & Medium Enterprise)</SelectItem>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="donor">Donor</SelectItem>
                  <SelectItem value="government">Government Institution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAccountTypeSelect}
              disabled={!selectedAccountType || loading}
              className="w-full"
            >
              {loading ? 'Processing...' : 'Continue'}
            </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <BackToHomeButton />
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile & Verification</CardTitle>
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
                <ProfileForm
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
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <span className="font-semibold">✓ Compliance Complete</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
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