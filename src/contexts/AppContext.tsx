import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  userService,
  profileService,
  supabase,
  OFFLINE_ACCOUNT_METADATA_KEY,
  OFFLINE_PROFILE_METADATA_KEY,
} from '@/lib/services';
import { logSupabaseAuthError, logAuthStateChange, logProfileOperation } from '@/lib/supabaseClient';
import { toast } from '@/components/ui/use-toast';
import type { User, Profile } from '@/@types/database';
import { normalizeMsisdn, normalizePhoneNumber } from '@/utils/phone';

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

  const ensurePhoneValue = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = normalizePhoneNumber(value);
    return normalized ?? null;
  };

  const ensureMsisdnValue = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = normalizeMsisdn(value);

    if (!normalized && value.trim().length > 0 && typeof console !== 'undefined') {
      console.warn('[prepareProfilePayload] Ignoring invalid MSISDN metadata value', {
        value,
      });
    }

    return normalized;
  };

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
    const normalizedMobile = ensureMsisdnValue(mutableData.mobile_number);

    if (normalizedMobile) {
      mutableData.phone = normalizedMobile;
      mutableData.msisdn = normalizedMobile;
      if (!('payment_phone' in mutableData)) {
        mutableData.payment_phone = normalizedMobile;
      }
    } else {
      mutableData.phone = null;
      if (!('payment_phone' in mutableData)) {
        mutableData.payment_phone = null;
      }
      if (!('msisdn' in mutableData)) {
        mutableData.msisdn = null;
      }
    }

    delete mutableData.mobile_number;
  }

  if ('phone' in mutableData) {
    const normalized = ensurePhoneValue(mutableData.phone);
    mutableData.phone = normalized ?? null;
  }

  if ('payment_phone' in mutableData) {
    const normalized = ensureMsisdnValue(mutableData.payment_phone);
    mutableData.payment_phone = normalized ?? null;
    if (normalized && !('msisdn' in mutableData)) {
      mutableData.msisdn = normalized;
    }
  }

  if ('msisdn' in mutableData) {
    const normalized = ensureMsisdnValue(mutableData.msisdn);
    mutableData.msisdn = normalized ?? null;
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

  const resolveOfflineAuthState = (authUser: User | null): AuthState | null => {
    if (!authUser) {
      return null;
    }

    const offlineProfile = authUser.user_metadata?.[OFFLINE_PROFILE_METADATA_KEY] as Profile | undefined;
    const isOfflineAccount = Boolean(authUser.user_metadata?.[OFFLINE_ACCOUNT_METADATA_KEY]);

    if (!isOfflineAccount) {
      return null;
    }

    const resolvedUser: User = {
      ...authUser,
      profile_completed: offlineProfile?.profile_completed ?? authUser.profile_completed,
      account_type: offlineProfile?.account_type ?? authUser.account_type,
    };

    const offlineState: AuthState = {
      user: resolvedUser,
      profile: offlineProfile ?? null,
    };

    setUser(resolvedUser);
    if (offlineProfile) {
      setProfile(offlineProfile);
    } else {
      setProfile(null);
    }

    persistOfflineSession(offlineState);
    setLoading(false);

    return offlineState;
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
        logAuthStateChange('offline-session-restored', { userId: offlineSession.user.id });
        return { user: offlineSession.user, profile: offlineSession.profile };
      }

      setUser(null);
      setProfile(null);
      logAuthStateChange('no-session');
      return { user: null, profile: null };
    };

    try {
      setLoading(true);
      logAuthStateChange('refresh-user-start');

      // Get the current authenticated user
      const { data: authUser, error: userError } = await userService.getCurrentUser();

      if (userError || !authUser) {
        logAuthStateChange('auth-user-not-found', { error: userError?.message });
        if (offlineSession?.user) {
          return resolveOfflineSession();
        }

        clearOfflineSession();
        return resolveOfflineSession();
      }

      clearOfflineSession();
      logAuthStateChange('auth-user-found', { userId: authUser.id, email: authUser.email });

      currentUser = authUser;
      setUser(authUser);

      const metadata = authUser.user_metadata || {};

      // Get the user's profile
      logProfileOperation('fetch-profile-start', { userId: authUser.id });
      const { data: userProfile, error: profileError } = await profileService.getByUserId(authUser.id);

      if (profileError) {
        const profileErrorCode = (profileError as any)?.code;
        const profileErrorMessage = profileError.message?.toLowerCase() || '';
        const isNotFound = profileErrorCode === 'PGRST116' ||
          profileErrorMessage.includes('no rows') ||
          profileErrorMessage.includes('not found');

        logProfileOperation('profile-fetch-error', { 
          userId: authUser.id, 
          errorCode: profileErrorCode,
          isNotFound 
        });

        if (isNotFound && authUser.email) {
          // Profile doesn't exist - create it from metadata
          logProfileOperation('creating-missing-profile', { userId: authUser.id });
          
          const derivedFullName = metadata.full_name ?? (
            metadata.first_name && metadata.last_name
              ? `${metadata.first_name} ${metadata.last_name}`.trim()
              : undefined
          );

          // Prepare profile with MSISDN from metadata
          const inferredProfilePayload = {
            email: authUser.email,
            account_type: metadata.account_type,
            profile_completed: metadata.profile_completed ?? false,
            full_name: derivedFullName,
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            company: metadata.company,
            phone: metadata.phone,
            msisdn: metadata.msisdn || metadata.phone,
            payment_phone: metadata.payment_phone || metadata.msisdn || metadata.phone,
          };

          const filteredPayload = Object.fromEntries(
            Object.entries(inferredProfilePayload).filter(([, value]) => value !== undefined && value !== null)
          ) as Partial<Profile>;

          logProfileOperation('profile-payload-prepared', { 
            userId: authUser.id,
            hasPhone: !!filteredPayload.phone,
            hasMsisdn: !!filteredPayload.msisdn 
          });

          // Retry logic for profile creation (handles race conditions)
          let createdProfile: Profile | null = null;
          let creationError: any = null;
          const maxRetries = 3;
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            logProfileOperation('profile-creation-attempt', { userId: authUser.id, attempt });
            
            const result = await profileService.createProfile(authUser.id, filteredPayload);
            
            if (!result.error && result.data) {
              createdProfile = result.data;
              logProfileOperation('profile-created-successfully', { userId: authUser.id, attempt });
              break;
            }
            
            creationError = result.error;
            const errorCode = (creationError as any)?.code;
            const errorMsg = creationError?.message?.toLowerCase() || '';
            
            // If it's a duplicate error, try to fetch the existing profile
            if (errorCode === '23505' || errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
              logProfileOperation('profile-already-exists-fetching', { userId: authUser.id, attempt });
              const { data: existingProfile } = await profileService.getByUserId(authUser.id);
              if (existingProfile) {
                createdProfile = existingProfile;
                logProfileOperation('existing-profile-fetched', { userId: authUser.id });
                break;
              }
            }
            
            // Wait before retry (exponential backoff)
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, attempt * 500));
            }
          }

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
            logProfileOperation('profile-bootstrapped', { 
              userId: authUser.id,
              profileCompleted: createdProfile.profile_completed 
            });
          } else if (creationError) {
            console.error('Error creating inferred profile after retries:', creationError);
            logProfileOperation('profile-creation-failed', { 
              userId: authUser.id, 
              error: creationError.message 
            });
            setProfile(null);
          }
        } else {
          console.error('Error fetching user profile:', profileError);
          logProfileOperation('profile-fetch-failed-non-404', { 
            userId: authUser.id,
            errorCode: profileErrorCode 
          });
          setProfile(null);
        }
      } else {
        logProfileOperation('profile-loaded', { 
          userId: authUser.id,
          profileCompleted: userProfile?.profile_completed 
        });
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
      logAuthStateChange('refresh-user-error', { error: error instanceof Error ? error.message : String(error) });
      if (offlineSession?.user) {
        return resolveOfflineSession();
      }

      clearOfflineSession();
      setUser(null);
      setProfile(null);
      return { user: null, profile: null };
    } finally {
      setLoading(false);
      logAuthStateChange('refresh-user-complete', { hasUser: !!currentUser, hasProfile: !!currentProfile });
    }

    return {
      user: currentUser,
      profile: currentProfile,
    };
  };

  const signIn = async (email: string, password: string): Promise<AuthState> => {
    logAuthStateChange('signin-start', { email });
    const { data: authUser, error } = await userService.signIn(email, password);

    if (error) {
      let errorMessage = error.message || 'Failed to sign in';
      const normalized = errorMessage.toLowerCase();

      if (normalized.includes('network') || normalized.includes('fetch')) {
        errorMessage = 'We couldn\'t reach WATHACI servers right now. Please try again shortly.';
      } else if (normalized.includes('invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (normalized.includes('email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in. Check your inbox for the verification link.';
      }

      logSupabaseAuthError('signIn', error);
      logAuthStateChange('signin-failed', { email, error: errorMessage });
      throw new Error(errorMessage);
    }

    logAuthStateChange('signin-success', { userId: authUser?.id });

    const offlineState = resolveOfflineAuthState(authUser ?? null);

    if (offlineState) {
      logAuthStateChange('signin-offline-mode', { userId: offlineState.user?.id });
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });

      return offlineState;
    }

    clearOfflineSession();

    if (!authUser) {
      logAuthStateChange('signin-no-user');
      throw new Error('Sign in failed. Please try again.');
    }

    logAuthStateChange('signin-refreshing-user', { userId: authUser.id });
    const refreshedState = await refreshUser();

    const finalState: AuthState = {
      user: refreshedState.user ?? authUser,
      profile: refreshedState.profile ?? null,
    };

    if (!refreshedState.user) {
      setUser(authUser);
    }

    logAuthStateChange('signin-complete', { 
      userId: finalState.user?.id,
      hasProfile: !!finalState.profile 
    });

    toast({
      title: 'Welcome back!',
      description: refreshedState.user
        ? 'You have been signed in successfully.'
        : 'Sign in succeeded. Complete your profile to unlock full access.',
    });

    return finalState;
  };

  const signUp = async (email: string, password: string, userData?: any): Promise<AuthState> => {
    logAuthStateChange('signup-start', { email, hasUserData: !!userData });
    
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

      logSupabaseAuthError('signUp', error);
      logAuthStateChange('signup-failed', { email, error: errorMessage });
      throw new Error(errorMessage);
    }
    
    logAuthStateChange('signup-success', { userId: user?.id });
    let createdProfile: Profile | null = null;

    if (user) {
      const profilePayload = prepareProfilePayload(user.email, userData);
      logProfileOperation('creating-profile-for-new-user', { 
        userId: user.id,
        hasPhone: !!profilePayload.phone,
        hasMsisdn: !!profilePayload.msisdn 
      });

      // Retry logic for profile creation (handles race conditions)
      let profileError: any = null;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logProfileOperation('signup-profile-creation-attempt', { userId: user.id, attempt });
        
        const result = await profileService.createProfile(user.id, profilePayload);
        
        if (!result.error && result.data) {
          createdProfile = result.data;
          logProfileOperation('signup-profile-created', { userId: user.id, attempt });
          break;
        }
        
        profileError = result.error;
        const message = profileError?.message?.toLowerCase() || '';
        const profileErrorCode = (profileError as any)?.code;
        const isAuthPending = profileErrorCode === 'PGRST301' ||
          profileErrorCode === '401' ||
          profileErrorCode === '42501' ||
          message.includes('jwt') ||
          message.includes('unauthorized') ||
          message.includes('row-level security');

        // If it's a duplicate error, try to fetch the existing profile
        const isDuplicate = profileErrorCode === '23505' || 
          message.includes('duplicate') || 
          message.includes('already exists');
          
        if (isDuplicate) {
          logProfileOperation('signup-profile-duplicate-fetching', { userId: user.id, attempt });
          const { data: existingProfile } = await profileService.getByUserId(user.id);
          if (existingProfile) {
            createdProfile = existingProfile;
            logProfileOperation('signup-existing-profile-fetched', { userId: user.id });
            break;
          }
        }

        if (!isAuthPending && !isDuplicate) {
          // For non-auth errors, log and potentially fail
          let profileErrorMessage = 'Failed to create user profile';

          if (message.includes('network') || message.includes('fetch')) {
            profileErrorMessage = 'Account created but profile setup failed due to network issues. Please try signing in.';
          }

          logProfileOperation('signup-profile-error', { 
            userId: user.id,
            errorCode: profileErrorCode,
            message: profileErrorMessage 
          });
          
          // Don't throw - allow signup to complete even if profile creation initially fails
          // The profile will be created on next login via refreshUser
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
      }
      
      if (createdProfile) {
        logProfileOperation('signup-profile-ready', { 
          userId: user.id,
          profileCompleted: createdProfile.profile_completed 
        });
      } else if (profileError) {
        logProfileOperation('signup-profile-creation-skipped', { 
          userId: user.id,
          error: profileError.message,
          note: 'Profile will be created on first login' 
        });
      }
    }

    // Show success message
    // Note: If email confirmation is enabled in Supabase, the session won't be active yet
    logAuthStateChange('signup-refreshing-user', { userId: user?.id });
    const refreshedState = await refreshUser();
    const sessionActive = !!refreshedState.user;
    
    logAuthStateChange('signup-refresh-complete', { 
      sessionActive,
      hasProfile: !!refreshedState.profile || !!createdProfile 
    });
    
    toast({
      title: "Account created!",
      description: sessionActive 
        ? "You're all set! Complete your profile to get started."
        : "Please check your email to verify your account.",
    });

    if (!user) {
      logAuthStateChange('signup-no-user-returned');
      return { user: null, profile: null };
    }

    // If Supabase hasn't started a session yet (email confirmation flow),
    // fall back to the newly created entities so the UI can continue gracefully.
    if (!refreshedState.user) {
      logAuthStateChange('signup-email-confirmation-flow', { userId: user.id });
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
      logAuthStateChange('signup-using-created-profile', { userId: user.id });
      setProfile(createdProfile);
      return {
        user: refreshedState.user,
        profile: createdProfile,
      };
    }

    logAuthStateChange('signup-complete', { 
      userId: refreshedState.user?.id,
      hasProfile: !!refreshedState.profile 
    });

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
    logAuthStateChange('app-mount-initial-refresh');
    refreshUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logAuthStateChange('auth-state-change', { 
          event, 
          hasSession: !!session,
          userId: session?.user?.id 
        });
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser();
        } else if (event === 'SIGNED_OUT') {
          logAuthStateChange('signed-out');
          clearOfflineSession();
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      logAuthStateChange('app-unmount');
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