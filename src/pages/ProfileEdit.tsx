import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase-enhanced';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ProfileForm } from '@/components/ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { prepareProfileForUpsert } from '@/utils/profile';
import BackToHomeButton from '@/components/BackToHomeButton';

export const ProfileEdit = () => {
  const { user, refreshUser } = useAppContext();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: 'Unable to load profile',
        description: error.message ?? 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    void fetchProfile();
  }, [user, navigate, fetchProfile]);

  const handleSubmit = async (formValues: any) => {
    if (!user) return;

    setSaving(true);
    try {
      const { upsertPayload } = prepareProfileForUpsert({
        profileData: formValues,
        userId: user.id,
        userEmail: user.email,
        existingProfile: profile,
      });

      const { error } = await supabase.from('profiles').upsert(upsertPayload);
      if (error) throw error;

      await refreshUser();

      toast({
        title: 'Profile updated',
        description: 'Your profile information was saved successfully.',
      });

      navigate('/profile-review');
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message ?? 'Please review your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-gradient-to-br from-blue-50 to-emerald-50">
        <BackToHomeButton />
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <BackToHomeButton />
          <Card>
            <CardHeader>
              <CardTitle>Profile not found</CardTitle>
              <CardDescription>
                We could not find your profile information. Please create your profile to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end">
              <Button onClick={() => navigate('/profile-setup')}>Create Profile</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const accountType = profile.account_type || user.account_type;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <BackToHomeButton />
        <Card>
          <CardHeader>
            <CardTitle>Edit Your Profile</CardTitle>
            <CardDescription>
              Update your information to keep your marketplace presence current.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {accountType ? (
              <ProfileForm
                accountType={accountType}
                onSubmit={handleSubmit}
                onPrevious={() => navigate('/profile-review')}
                loading={saving}
                initialData={profile}
              />
            ) : (
              <div className="space-y-4 text-center py-6">
                <p className="text-muted-foreground">
                  We could not determine your account type. Please contact support for assistance.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => navigate('/profile-setup')}>
                    Go to Profile Setup
                  </Button>
                  <BackToHomeButton />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileEdit;
