import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types/profile';

interface UseProfileResult {
  loading: boolean;
  profile: Profile | null;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setError(userError);
      setLoading(false);
      return;
    }

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      setError(profileError);
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { loading, profile, error, refresh: fetchProfile };
}
