import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';

interface UseSupabaseAuthResult {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useSupabaseAuth = (): UseSupabaseAuthResult => {
  const { user: contextUser, loading: contextLoading, refreshUser } = useAppContext();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (isMounted) {
          setSession(data.session ?? null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const user = useMemo(() => {
    // Safely resolve user from context or session
    if (contextUser) {
      return contextUser;
    }
    
    if (session?.user) {
      return session.user;
    }
    
    return null;
  }, [contextUser, session]);

  return {
    session,
    user,
    loading: contextLoading || authLoading,
    refresh: async () => {
      await refreshUser();
    },
  };
};

export default useSupabaseAuth;
