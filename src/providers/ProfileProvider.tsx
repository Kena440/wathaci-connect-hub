import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthProvider';

type ProfileState = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

type ProfileCtx = {
  profile: any | null;
  status: ProfileState;
  refresh: () => Promise<void>;
};

const ProfileContext = createContext<ProfileCtx>({
  profile: null,
  status: 'idle',
  refresh: async () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const [profile, setProfile] = useState<any | null>(null);
  const [status, setStatus] = useState<ProfileState>('idle');

  const fetchProfile = async () => {
    if (!authReady) return;
    if (!user) {
      setProfile(null);
      setStatus('missing');
      return;
    }

    setStatus('loading');

    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();

      if (error) {
        // If record not found, mark as missing
        setProfile(null);
        setStatus('missing');
        return;
      }

      setProfile(data ?? null);
      setStatus(data ? 'ready' : 'missing');
    } catch (err) {
      console.error('fetchProfile failed', err);
      setStatus('error');
    }
  };

  useEffect(() => {
    // Only attempt to fetch profile after auth is resolved
    if (!authReady) return;
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user?.id]);

  const value = useMemo(() => ({ profile, status, refresh: fetchProfile }), [profile, status]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);
