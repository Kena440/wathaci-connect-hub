import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type SaveOnboardingProgressResponse = {
  success: boolean;
  nextStep?: number;
  profileCompleted?: boolean;
  onboarding_step?: number;
  error?: string;
};

interface BaseProfileData {
  full_name: string;
  display_name?: string | null;
  phone?: string | null;
  country: string;
  city: string;
  bio?: string;
  website_url?: string | null;
  linkedin_url?: string | null;
  avatar_url?: string;
}

interface CompleteProfileOptions {
  baseData: BaseProfileData;
  roleData: Record<string, any>;
  accountType: 'sme' | 'freelancer' | 'investor' | 'government';
}

export function useProfileCompletion() {
  const { user, refreshProfile } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);

  const completeProfile = useCallback(async (options: CompleteProfileOptions): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsCompleting(true);
    
    try {
      console.log('[ProfileCompletion] Starting completion for user:', user.id);
      console.log('[ProfileCompletion] Account type:', options.accountType);
      
      // Call the transaction-safe database function
      const { data, error } = await supabase.rpc('complete_profile', {
        p_user_id: user.id,
        p_base_data: options.baseData as any,
        p_role_data: options.roleData as any,
        p_account_type: options.accountType,
      });

      if (error) {
        console.error('[ProfileCompletion] RPC error:', error);
        throw error;
      }

      const result = data as { success: boolean; error?: string; message?: string };
      
      if (!result.success) {
        console.error('[ProfileCompletion] Function returned error:', result.error);
        throw new Error(result.error || 'Failed to complete profile');
      }

      console.log('[ProfileCompletion] Success, refreshing profile...');
      
      // Force refresh the profile to get updated is_profile_complete
      const updatedProfile = await refreshProfile();
      
      console.log('[ProfileCompletion] Updated profile:', updatedProfile);
      
      if (!updatedProfile?.is_profile_complete) {
        console.warn('[ProfileCompletion] Profile not marked complete after refresh');
      }
      
      // Clear any stored onboarding step
      localStorage.removeItem(`onboarding_step_${user.id}`);
      
      return { success: true };
    } catch (error: any) {
      console.error('[ProfileCompletion] Error:', error);
      toast.error(error.message || 'Failed to complete profile');
      return { success: false, error: error.message };
    } finally {
      setIsCompleting(false);
    }
  }, [user, refreshProfile]);

  const saveDraft = useCallback(async (
    baseData: Partial<BaseProfileData>,
    accountType?: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          account_type: accountType || null,
          full_name: baseData.full_name || null,
          display_name: baseData.display_name || null,
          phone: baseData.phone || null,
          country: baseData.country || null,
          city: baseData.city || null,
          bio: baseData.bio || null,
          website_url: baseData.website_url || null,
          linkedin_url: baseData.linkedin_url || null,
          avatar_url: baseData.avatar_url || null,
          // DO NOT set is_profile_complete here
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[ProfileCompletion] Draft save error:', error);
      return false;
    }
  }, [user]);

  const saveOnboardingProgress = useCallback(async (params: {
    step: 1 | 2 | 3 | 4;
    accountType?: string | null;
    roleType?: string | null;
    roleMetadata?: Record<string, any> | null;
  }): Promise<SaveOnboardingProgressResponse> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.rpc('save_onboarding_progress', {
        p_onboarding_step: params.step,
        p_account_type: params.accountType ?? undefined,
        p_role_type: params.roleType ?? undefined,
        p_role_metadata: params.roleMetadata ?? undefined,
      });

      if (error) throw error;
      return (data as any) as SaveOnboardingProgressResponse;
    } catch (err: any) {
      const message = err?.message ?? 'Failed to save onboarding progress';
      console.error('[ProfileCompletion] saveOnboardingProgress error:', err);
      toast.error(message);
      return { success: false, error: message };
    }
  }, [user]);

  return {
    completeProfile,
    saveDraft,
    saveOnboardingProgress,
    isCompleting,
  };
}