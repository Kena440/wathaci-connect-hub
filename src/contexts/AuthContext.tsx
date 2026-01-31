import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * AuthContext - the SINGLE source of truth for auth state.
 * 
 * IMPORTANT: Only ONE onAuthStateChange listener should exist in the entire app.
 * This context owns that listener. Do NOT add auth listeners elsewhere!
 */

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  is_profile_complete: boolean;
  profile_completed?: boolean;
  onboarding_step?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (fetchingRef.current) return profile;
    fetchingRef.current = true;
    
    try {
      setProfileLoading(true);
      
      // Ensure the profile row exists (idempotent) so downstream code never hits "profile not found".
      // IMPORTANT: do not call this inside onAuthStateChange directly; this function is invoked via setTimeout.
      await supabase.rpc('save_onboarding_progress', {
        p_onboarding_step: 1,
      });

      const { data, error } = await supabase.rpc('get_my_profile');

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      const row = data as any;
      const profileData = row ? {
        id: row.id,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        account_type: row.account_type,
        is_profile_complete: row.is_profile_complete ?? false,
        profile_completed: row.profile_completed ?? false,
        onboarding_step: row.onboarding_step ?? 1,
      } : null;

      // Check admin role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['admin', 'moderator']);

      setIsAdmin((roleData && roleData.length > 0) || false);

      setProfile(profileData);
      return profileData;
    } finally {
      fetchingRef.current = false;
      setProfileLoading(false);
    }
  }, [profile]);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (user) {
      return await fetchProfile(user.id);
    }
    return null;
  }, [user, fetchProfile]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setProfileLoading(false);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfileLoading(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || '',
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};