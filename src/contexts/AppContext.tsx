import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService, profileService, supabase } from '@/lib/services';
import { toast } from '@/components/ui/use-toast';
import type { User, Profile } from '@/@types/database';

interface AuthState {
  user: User | null;
  profile: Profile | null;
}

interface AppContextType {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthState>;
  signUp: (email: string, password: string, userData?: any) => Promise<AuthState>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthState>;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  user: null,
  profile: null,
  loading: true,
  signIn: async () => ({ user: null, profile: null }),
  signUp: async () => ({ user: null, profile: null }),
  signOut: async () => {},
  refreshUser: async () => ({ user: null, profile: null }),
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const refreshUser = async (): Promise<AuthState> => {
    let currentUser: User | null = null;
    let currentProfile: Profile | null = null;

    try {
      setLoading(true);

      // Get the current authenticated user
      const { data: authUser, error: userError } = await userService.getCurrentUser();

      if (userError || !authUser) {
        setUser(null);
        setProfile(null);
        return { user: null, profile: null };
      }

      currentUser = authUser;
      setUser(authUser);

      const metadata = authUser.user_metadata || {};

      // Get the user's profile
      const { data: userProfile, error: profileError } = await profileService.getByUserId(authUser.id);

      if (profileError) {
        const profileErrorCode = (profileError as any)?.code;
        const profileErrorMessage = profileError.message?.toLowerCase() || '';
        const isNotFound = profileErrorCode === 'PGRST116' ||
          profileErrorMessage.includes('no rows') ||
          profileErrorMessage.includes('not found');

        if (isNotFound && authUser.email) {
          const derivedFullName = metadata.full_name ?? (
            metadata.first_name && metadata.last_name
              ? `${metadata.first_name} ${metadata.last_name}`.trim()
              : undefined
          );

          const inferredProfilePayload = {
            email: authUser.email,
            account_type: metadata.account_type,
            profile_completed: metadata.profile_completed ?? false,
            full_name: derivedFullName,
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            company: metadata.company,
          };

          const filteredPayload = Object.fromEntries(
            Object.entries(inferredProfilePayload).filter(([, value]) => value !== undefined && value !== null)
          ) as Partial<Profile>;

          const { data: createdProfile, error: creationError } = await profileService.createProfile(
            authUser.id,
            filteredPayload,
          );

          if (!creationError && createdProfile) {
            setProfile(createdProfile);
            currentProfile = createdProfile;
            const enrichedUser: User = {
              ...authUser,
              profile_completed: createdProfile.profile_completed,
              account_type: createdProfile.account_type,
            };

            currentUser = enrichedUser;
            setUser(enrichedUser);
          } else if (creationError) {
            console.error('Error creating inferred profile:', creationError);
            setProfile(null);
          }
        } else {
          console.error('Error fetching user profile:', profileError);
          setProfile(null);
        }
      } else {
        setProfile(userProfile);

        // Update user with profile completion info
        if (userProfile) {
          currentProfile = userProfile;
          const enrichedUser: User = {
            ...authUser,
            profile_completed: userProfile.profile_completed,
            account_type: userProfile.account_type,
          };

          currentUser = enrichedUser;
          setUser(enrichedUser);
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      setProfile(null);
      return { user: null, profile: null };
    } finally {
      setLoading(false);
    }

    return {
      user: currentUser,
      profile: currentProfile,
    };
  };

  const signIn = async (email: string, password: string): Promise<AuthState> => {
    const { data: user, error } = await userService.signIn(email, password);

    if (error) {
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Failed to sign in';
      
      // Check for common error patterns and provide helpful messages
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in. Check your inbox for the verification link.';
      }
      
      throw new Error(errorMessage);
    }
    
    toast({
      title: "Welcome back!",
      description: "You have been signed in successfully.",
    });

    // Refresh user data after successful sign in
    const refreshedState = await refreshUser();

    // Fallback to the user returned by the auth API if refresh didn't provide one
    if (!refreshedState.user && user) {
      setUser(user);
      return { user, profile: null };
    }

    return refreshedState;
  };

  const signUp = async (email: string, password: string, userData?: any): Promise<AuthState> => {
    const { data: user, error } = await userService.signUp(email, password, userData);

    if (error) {
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Failed to create account';
      
      // Check for common error patterns and provide helpful messages
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead or use a different email.';
      } else if (errorMessage.includes('password')) {
        errorMessage = 'Password does not meet requirements. Please use a stronger password.';
      }
      
      throw new Error(errorMessage);
    }
    
    let createdProfile: Profile | null = null;

    if (user) {
      const profilePayload = {
        email: user.email,
        ...(userData || {}),
      };

      const { data: newProfile, error: profileError } = await profileService.createProfile(
        user.id,
        profilePayload,
      );

      if (profileError) {
        const message = profileError.message?.toLowerCase() || '';
        const profileErrorCode = (profileError as any)?.code;
        const isAuthPending = profileErrorCode === 'PGRST301' ||
          profileErrorCode === '401' ||
          message.includes('jwt') ||
          message.includes('unauthorized');

        if (!isAuthPending) {
          let profileErrorMessage = 'Failed to create user profile';

          if (message.includes('network') || message.includes('fetch')) {
            profileErrorMessage = 'Account created but profile setup failed due to network issues. Please try signing in.';
          }

          throw new Error(profileErrorMessage);
        }
      } else {
        createdProfile = newProfile || null;
      }
    }

    toast({
      title: "Account created!",
      description: "Please check your email to verify your account.",
    });

    if (!user) {
      return { user: null, profile: null };
    }

    const refreshedState = await refreshUser();

    // If Supabase hasn't started a session yet (email confirmation flow),
    // fall back to the newly created entities so the UI can continue gracefully.
    if (!refreshedState.user) {
      const fallbackUser: User = {
        ...user,
        profile_completed: createdProfile?.profile_completed ?? userData?.profile_completed ?? false,
        account_type: createdProfile?.account_type ?? userData?.account_type,
      };
      setUser(fallbackUser);

      if (createdProfile) {
        setProfile(createdProfile);
      }

      return {
        user: fallbackUser,
        profile: createdProfile,
      };
    }

    if (!refreshedState.profile && createdProfile) {
      setProfile(createdProfile);
      return {
        user: refreshedState.user,
        profile: createdProfile,
      };
    }

    return refreshedState;
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