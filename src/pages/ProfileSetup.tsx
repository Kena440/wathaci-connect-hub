import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase-enhanced';
import { upsertProfile } from '@/lib/profile';
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
import { accountTypes, type AccountTypeValue } from '@/data/accountTypes';

export const ProfileSetup = () => {
  const [selectedAccountType, setSelectedAccountType] = useState<AccountTypeValue | ''>('');
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isCompliant, setIsCompliant] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, refreshUser } = useAppContext();
  const [lastAutoAppliedAccountType, setLastAutoAppliedAccountType] = useState<AccountTypeValue | null>(null);

  const validAccountTypeValues = new Set<AccountTypeValue>(accountTypes.map(({ value }) => value));

  const accountTypeFromParams = (() => {
    const paramValue = searchParams.get('accountType');
    if (!paramValue) return null;

    return validAccountTypeValues.has(paramValue as AccountTypeValue)
      ? (paramValue as AccountTypeValue)
      : null;
  })();

  const activeTab = searchParams.get('tab') || 'profile';
  const mode = searchParams.get('mode');

  const checkExistingProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
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
        if (profile.account_type && validAccountTypeValues.has(profile.account_type)) {
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
    } finally {
      setLoading(false);
    }
  }, [toast, user, validAccountTypeValues]);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    void checkExistingProfile();
  }, [user, navigate, checkExistingProfile]);

  useEffect(() => {
    if (!accountTypeFromParams || !user) {
      return;
    }

    if (loading) {
      return;
    }

    if (lastAutoAppliedAccountType === accountTypeFromParams) {
      return;
    }

    if (selectedAccountType !== accountTypeFromParams) {
      setSelectedAccountType(accountTypeFromParams);
    }

    if (existingProfile?.account_type === accountTypeFromParams) {
      setShowProfileForm(true);
      setLastAutoAppliedAccountType(accountTypeFromParams);
      return;
    }

    void handleAccountTypeSelect(accountTypeFromParams);
    setLastAutoAppliedAccountType(accountTypeFromParams);
  }, [
    accountTypeFromParams,
    existingProfile,
    handleAccountTypeSelect,
    lastAutoAppliedAccountType,
    loading,
    selectedAccountType,
    user,
  ]);

  useEffect(() => {
    if (!accountTypeFromParams) {
      setLastAutoAppliedAccountType(null);
    }
  }, [accountTypeFromParams]);

  useEffect(() => {
    if (mode === 'edit' && existingProfile) {
      if (existingProfile.account_type && validAccountTypeValues.has(existingProfile.account_type)) {
        setSelectedAccountType(existingProfile.account_type);
      } else {
        setSelectedAccountType('');
      }
      setShowProfileForm(true);
    }
  }, [mode, existingProfile, validAccountTypeValues]);

  const handleAccountTypeSelect = useCallback(
    async (type?: AccountTypeValue) => {
      const accountType = type ?? selectedAccountType;

      if (!accountType || !user) return;

      if (existingProfile?.account_type === accountType) {
        setSelectedAccountType(accountType);
        setShowProfileForm(true);
        return;
      }

      setLoading(true);
      try {
        console.log('Setting account type:', accountType, 'for user:', user.id);
        
        // Use the robust upsertProfile helper
        await upsertProfile({
          account_type: accountType,
          email: user.email,
        });

        console.log('Account type set successfully');
        await refreshUser();
        setSelectedAccountType(accountType);
        setExistingProfile((prev: any) =>
          prev ? { ...prev, account_type: accountType } : prev
        );
        setShowProfileForm(true);
      } catch (error: any) {
        console.error('Failed to set account type:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to set account type. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [existingProfile, refreshUser, selectedAccountType, toast, user]
  );

  const handlePrevious = () => {
    setShowProfileForm(false);
    setSelectedAccountType('');
  };

  const handleProfileSubmit = async (profileData: any) => {
    if (!user) {
      console.error('Profile submit failed: No authenticated user');
      return;
    }

    console.log('Starting profile submission for user:', user.id);
    setLoading(true);

    try {
      const sanitizeValue = (value?: string | null) => {
        if (!value) return null;
        const trimmed = value.trim();
        return trimmed || null;
      };

      // Validate critical fields
      const phone = sanitizeValue(profileData.phone);
      if (!phone) {
        throw new Error('Phone number is required.');
      }

      console.log('Profile data validation passed');

      const extractCardDetails = (cardNumber: string, expiry: string, cardholderName: string | null) => {
        if (!cardholderName) {
          throw new Error('Please enter the name on the card.');
        }

        const normalizedNumber = cardNumber.replace(/\D/g, '');
        if (normalizedNumber.length < 12) {
          throw new Error('Please enter a valid card number.');
        }

        const expiryMatch = expiry.replace(/\s/g, '').match(/^(\d{2})\/(\d{2}|\d{4})$/);
        if (!expiryMatch) {
          throw new Error('Please enter the card expiry in MM/YY format.');
        }

        const month = Number(expiryMatch[1]);
        if (month < 1 || month > 12) {
          throw new Error('Please enter a valid expiry month.');
        }

        let year = expiryMatch[2];
        if (year.length === 2) {
          year = `20${year}`;
        }

        return {
          last4: normalizedNumber.slice(-4),
          expiry_month: month,
          expiry_year: Number(year),
          cardholder_name: cardholderName,
        };
      };

      const {
        card_number,
        card_expiry,
        cardholder_name,
        card_details: _ignoredCardDetails,
        use_same_phone,
        payment_method,
        coordinates,
        qualifications,
        payment_phone,
        ...profilePayload
      } = profileData;

      let paymentData: Record<string, unknown> = {};
      if (use_same_phone) {
        const phone = sanitizeValue(profilePayload.phone);
        if (!phone) {
          throw new Error('Please provide a phone number for subscription payments.');
        }

        paymentData = {
          payment_phone: phone,
          payment_method: 'phone',
        };
      } else if (payment_method === 'card') {
        let cardDetails = null;

        const normalizedCardholderName = sanitizeValue(cardholder_name);

        if (card_number && card_expiry) {
          cardDetails = extractCardDetails(card_number, card_expiry, normalizedCardholderName);
        } else if (existingProfile?.card_details) {
          const existingName = sanitizeValue(existingProfile.card_details.cardholder_name);
          const finalName = normalizedCardholderName ?? existingName;
          if (!finalName) {
            throw new Error('Please enter the name on the card.');
          }

          cardDetails = {
            ...existingProfile.card_details,
            cardholder_name: finalName,
          };
        }

        if (!cardDetails) {
          throw new Error('Card details are required to process subscription payments.');
        }

        paymentData = {
          payment_method: 'card',
          card_details: cardDetails,
        };
      } else {
        const paymentPhone = sanitizeValue(payment_phone);
        if (!paymentPhone) {
          throw new Error('Please provide the mobile money number to charge.');
        }

        paymentData = {
          payment_method: 'phone',
          payment_phone: paymentPhone,
        };
      }

      const normalizedCoordinates = (() => {
        if (!coordinates || typeof coordinates !== 'object') {
          return null;
        }

        const lat = typeof coordinates.lat === 'number' ? coordinates.lat : Number(coordinates.lat);
        const lng = typeof coordinates.lng === 'number' ? coordinates.lng : Number(coordinates.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        return { lat, lng };
      })();

      const normalizedQualifications = Array.isArray(qualifications)
        ? qualifications
            .map((qualification: Record<string, any>) => {
              if (!qualification || typeof qualification !== 'object') {
                return null;
              }

              const institution = sanitizeValue(qualification.institution);
              const degree = sanitizeValue(qualification.degree ?? qualification.name);
              const field = sanitizeValue(qualification.field);
              const year = sanitizeValue(qualification.year);

              const normalized: Record<string, string> = {};

              if (institution) normalized.institution = institution;
              if (degree) {
                normalized.degree = degree;
                normalized.name = degree;
              }
              if (field) normalized.field = field;
              if (year) normalized.year = year;

              return Object.keys(normalized).length > 0 ? normalized : null;
            })
            .filter((qualification): qualification is Record<string, string> => Boolean(qualification))
        : [];

      const sanitizedProfile: Record<string, unknown> = {};
      const numericFields = new Set([
        'experience_years',
        'employees_count',
        'annual_revenue',
        'annual_funding_budget',
        'investment_ticket_min',
        'investment_ticket_max'
      ]);

      for (const [key, value] of Object.entries(profilePayload)) {
        if (Array.isArray(value)) {
          if (key === 'gaps_identified') {
            const sanitizedGaps = value
              .map((item) => (typeof item === 'string' ? sanitizeValue(item) : null))
              .filter((item): item is string => Boolean(item));

            sanitizedProfile[key] = sanitizedGaps;
          } else {
            sanitizedProfile[key] = value;
          }
        } else if (typeof value === 'string') {
          const sanitizedValue = sanitizeValue(value);
          if (sanitizedValue === null) {
            sanitizedProfile[key] = null;
          } else if (numericFields.has(key)) {
            const numeric = Number(sanitizedValue.replace(/,/g, ''));
            sanitizedProfile[key] = Number.isFinite(numeric) ? numeric : sanitizedValue;
          } else {
            sanitizedProfile[key] = sanitizedValue;
          }
        } else {
          sanitizedProfile[key] = value ?? null;
        }
      }

      console.log('Upserting profile with payload:', {
        id: user.id,
        account_type: selectedAccountType,
        has_phone: !!sanitizedProfile.phone,
        has_payment: !!paymentData.payment_method,
      });

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          ...sanitizedProfile,
          coordinates: normalizedCoordinates,
          qualifications: normalizedQualifications,
          ...paymentData,
          profile_completed: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Profile upsert failed:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('Profile upsert successful');
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
      console.error('Profile submission failed:', error);
      toast({
        title: "Error",
        description: error.message || "Could not save your profile. Please try again.",
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
        <Card className="w-full max-w-2xl mx-auto">
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
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