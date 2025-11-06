import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService, profileService, supabase } from '@/lib/services';
import { toast } from '@/components/ui/use-toast';
import type { User, Profile } from '@/@types/database';

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export { AppContext };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const refreshUser = async () => {
    try {
      setLoading(true);
      
      // Get the current authenticated user
      const { data: authUser, error: userError } = await userService.getCurrentUser();
      
      if (userError || !authUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(authUser);

      // Get the user's profile
      const { data: userProfile, error: profileError } = await profileService.getByUserId(authUser.id);
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        setProfile(null);
      } else {
        setProfile(userProfile);
        
        // Update user with profile completion info
        if (userProfile) {
          setUser(prev => prev ? {
            ...prev,
            profile_completed: userProfile.profile_completed,
            account_type: userProfile.account_type
          } : null);
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data: user, error } = await userService.signIn(email, password);
    
    if (error) throw error;
    
    toast({
      title: "Welcome back!",
      description: "You have been signed in successfully.",
    });
    
    // Refresh user data after successful sign in
    await refreshUser();
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const { data: user, error } = await userService.signUp(email, password);
    
    if (error) throw error;
    
    if (user && userData) {
      const { error: profileError } = await profileService.createProfile(user.id, {
        email: user.email,
        ...userData
      });
      
      if (profileError) throw profileError;
    }
    
    toast({
      title: "Account created!",
      description: "Please check your email to verify your account.",
    });
  };

  const signOut = async () => {
    try {
      const { error } = await userService.signOut();
      
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initial user fetch
    refreshUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};