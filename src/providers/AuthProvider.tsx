import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type AuthCtx = {
  user: any | null;
  session: any | null;
  authReady: boolean;
};

const AuthContext = createContext<AuthCtx>({ user: null, session: null, authReady: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1) get initial session once
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) console.error('getSession error', error);
        setSession(data.session ?? null);
        setAuthReady(true);
      })
      .catch((err) => {
        console.error('getSession call failed', err);
        if (isMounted) setAuthReady(true);
      });

    // 2) single global subscription
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setAuthReady(true);
    });

    return () => {
      isMounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user: session?.user ?? null, session, authReady }), [session, authReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
