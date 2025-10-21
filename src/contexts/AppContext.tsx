import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  userService,
  profileService,
  supabase,
  OFFLINE_ACCOUNT_METADATA_KEY,
  OFFLINE_PROFILE_METADATA_KEY,
} from '@/lib/services';
import { toast } from '@/components/ui/use-toast';
import type { User, Profile } from '@/@types/database';

const normalizeString = (value: unknown): string | null | undefined => {
  if (value === null || value === undefined) {
    return value as null | undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
};

const prepareProfilePayload = (
  email: string | null | undefined,
  userData?: Record<string, any>,
): Partial<Profile> => {
  const payload: Record<string, unknown> = {};

  if (email) {
    payload.email = email;
  }

  if (!userData) {
    return payload as Partial<Profile>;
  }

  const mutableData: Record<string, unknown> = { ...userData };

  if ('first_name' in mutableData) {
    const normalized = normalizeString(mutableData.first_name);
    mutableData.first_name = normalized ?? undefined;
  }

  if ('last_name' in mutableData) {
    const normalized = normalizeString(mutableData.last_name);
    mutableData.last_name = normalized ?? undefined;
  }

  if ('full_name' in mutableData) {
    const normalized = normalizeString(mutableData.full_name);
    mutableData.full_name = normalized ?? undefined;
  }

  if ('company' in mutableData) {
    const normalized = normalizeString(mutableData.company);
    mutableData.company = normalized ?? null;
  }

  if ('account_type' in mutableData && typeof mutableData.account_type === 'string') {
    mutableData.account_type = mutableData.account_type.trim();
  }

  if ('mobile_number' in mutableData) {
    const normalizedMobile = normalizeString(mutableData.mobile_number);

    if (normalizedMobile) {
      mutableData.phone = normalizedMobile;
      if (!('payment_phone' in mutableData)) {
        mutableData.payment_phone = normalizedMobile;
      }
    } else if (normalizedMobile === null) {
      mutableData.phone = null;
      if (!('payment_phone' in mutableData)) {
        mutableData.payment_phone = null;
      }
    }

    delete mutableData.mobile_number;
  }

  if ('phone' in mutableData) {
    const normalized = normalizeString(mutableData.phone);
    mutableData.phone = normalized ?? undefined;
  }

  if ('payment_phone' in mutableData) {
    const normalized = normalizeString(mutableData.payment_phone);
    mutableData.payment_phone = normalized ?? null;
  }

  if (!('payment_method' in mutableData) && typeof mutableData.phone === 'string' && mutableData.phone.length > 0) {
    mutableData.payment_method = 'phone';
  }

  const sanitizedEntries = Object.entries(mutableData).filter(([, value]) => value !== undefined);

  for (const [key, value] of sanitizedEntries) {
    payload[key] = value;
  }

  return payload as Partial<Profile>;
};

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

const OFFLINE_SESSION_STORAGE_KEY = 'wathaci_offline_session';
const isBrowserEnvironment = typeof window !== 'undefined';

const loadOfflineSession = (): AuthState | null => {
  if (!isBrowserEnvironment) {
    return null;
  }

  const raw = window.localStorage.getItem(OFFLINE_SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthState;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse offline session payload:', error);
    return null;
  }
};

const persistOfflineSession = (state: AuthState) => {
  if (!isBrowserEnvironment) {
    return;
  }

  try {
    window.localStorage.setItem(OFFLINE_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist offline session state:', error);
  }
};

const clearOfflineSession = () => {
  if (!isBrowserEnvironment) {
    return;
  }

  window.localStorage.removeItem(OFFLINE_SESSION_STORAGE_KEY);
};

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
    const offlineSession = loadOfflineSession();

    const resolveOfflineSession = (): AuthState => {
      if (offlineSession?.user) {
        currentUser = offlineSession.user;
        currentProfile = offlineSession.profile;
        setUser(offlineSession.user);
        setProfile(offlineSession.profile);
        return { user: offlineSession.user, profile: offlineSession.profile };
      }

      setUser(null);
      setProfile(null);
      return { user: null, profile: null };
    };

    try {
      setLoading(true);

      // Get the current authenticated user
      const { data: authUser, error: userError } = await userService.getCurrentUser();

      if (userError || !authUser) {
        if (offlineSession?.user) {
          return resolveOfflineSession();
        }

        clearOfflineSession();
        return resolveOfflineSession();
      }

      clearOfflineSession();

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
      if (offlineSession?.user) {
        return resolveOfflineSession();
      }

      clearOfflineSession();
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
        errorMessage = 'We couldn\'t reach WATHACI servers right now. Please try again shortly.';
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

    const offlineProfile = user?.user_metadata?.[OFFLINE_PROFILE_METADATA_KEY] as Profile | undefined;
    const isOfflineAccount = Boolean(user?.user_metadata?.[OFFLINE_ACCOUNT_METADATA_KEY]);

    if (isOfflineAccount && user) {
      const resolvedUser: User = {
        ...user,
        profile_completed: offlineProfile?.profile_completed ?? user.profile_completed,
        account_type: offlineProfile?.account_type ?? user.account_type,
      };

      const offlineState: AuthState = {
        user: resolvedUser,
        profile: offlineProfile ?? null,
      };

      setUser(resolvedUser);

      if (offlineProfile) {
        setProfile(offlineProfile);
      }

      persistOfflineSession(offlineState);
      setLoading(false);

      return offlineState;
    }

    clearOfflineSession();

    // Refresh user data after successful sign in
    const refreshedState = await refreshUser();

    // Fallback to the user returned by the auth API if refresh didn't provide one
    if (!refreshedState.user && user) {
      setUser(user);
      clearOfflineSession();
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
        errorMessage = 'We couldn\'t reach WATHACI servers right now. Please try again shortly.';
      } else if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead or use a different email.';
      } else if (errorMessage.includes('password')) {
        errorMessage = 'Password does not meet requirements. Please use a stronger password.';
      }
      
      throw new Error(errorMessage);
    }
    
    let createdProfile: Profile | null = null;

    if (user) {
      const profilePayload = prepareProfilePayload(user.email, userData);

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

      clearOfflineSession();
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
          clearOfflineSession();
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
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