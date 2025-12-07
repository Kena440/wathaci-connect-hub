import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  userService,
  profileService,
  supabase,
  OFFLINE_ACCOUNT_METADATA_KEY,
  OFFLINE_PROFILE_METADATA_KEY,
} from '@/lib/services';
import { logSupabaseAuthError, logAuthStateChange, logProfileOperation } from '@/lib/supabaseClient';
import { logger, type LogContext } from '@/lib/logger';
import { toast } from '@/components/ui/use-toast';
import type { User, Profile } from '@/@types/database';
import { normalizeMsisdn, normalizePhoneNumber } from '@/utils/phone';
// TEMPORARY BYPASS MODE: remove after auth errors are fixed
import {
  isAuthBypassEnabled,
  createBypassUser,
  createBypassProfile,
  saveBypassUser,
  saveBypassProfile,
  findBypassUserByEmail,
  loadBypassProfile,
  logBypassError,
  logBypassOperation,
  isBypassUser,
  type BypassUser,
  type BypassProfile,
} from '@/lib/authBypass';

type AuthLogContext = LogContext & {
  event?: string;
  phase?: string;
};

const withAuthContext = (context: AuthLogContext = {}): AuthLogContext => ({
  component: 'AppContext',
  ...context,
});

const logInfo = (message: string, context?: AuthLogContext) => {
  logger.info(message, withAuthContext(context));
};

const logWarn = (message: string, context?: AuthLogContext) => {
  logger.warn(message, withAuthContext(context));
};

const logError = (message: string, error?: unknown, context?: AuthLogContext) => {
  logger.error(message, error, withAuthContext(context));
};

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

  if (!('payment_phone' in mutableData) && typeof mutableData.msisdn === 'string' && mutableData.msisdn) {
    const normalizedMsisdn = ensureMsisdnValue(mutableData.msisdn);
    if (normalizedMsisdn) {
      mutableData.payment_phone = normalizedMsisdn;
    }
  }

  if ('phone' in mutableData) {
    const normalized = ensurePhoneValue(mutableData.phone);
    mutableData.phone = normalized ?? null;
  }

  if (!('payment_phone' in mutableData) && typeof mutableData.phone === 'string' && mutableData.phone) {
    const normalizedPayment = ensureMsisdnValue(mutableData.phone);
    if (normalizedPayment) {
      mutableData.payment_phone = normalizedPayment;
    }
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

  if (!('use_same_phone' in mutableData) && typeof mutableData.payment_phone === 'string') {
    const normalizedPayment = ensureMsisdnValue(mutableData.payment_phone);
    const comparisonSources = [mutableData.phone, mutableData.msisdn]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .map((value) => ensureMsisdnValue(value) ?? value);

    if (comparisonSources.length > 0) {
      mutableData.use_same_phone = comparisonSources.some((value) => value === normalizedPayment);
    }
  }

  if (!('payment_method' in mutableData)) {
    const hasPaymentPhone = typeof mutableData.payment_phone === 'string' && mutableData.payment_phone.length > 0;
    const hasPrimaryPhone = typeof mutableData.phone === 'string' && mutableData.phone.length > 0;

    if (hasPaymentPhone || hasPrimaryPhone) {
      mutableData.payment_method = 'phone';
    }
  }

  // Handle accepted_terms field - ensure it's a boolean
  if ('accepted_terms' in mutableData) {
    mutableData.accepted_terms = Boolean(mutableData.accepted_terms);
  }

  // Handle newsletter_opt_in field - ensure it's a boolean with default false
  if ('newsletter_opt_in' in mutableData) {
    mutableData.newsletter_opt_in = Boolean(mutableData.newsletter_opt_in);
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
  const refreshPromiseRef = useRef<Promise<AuthState> | null>(null);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const resolveOfflineAuthState = useCallback((authUser: User | null): AuthState | null => {
    if (!authUser) {
      return null;
    }

    // Safely access user_metadata with defensive checks
    const userMetadata = authUser.user_metadata || {};
    const offlineProfile = userMetadata[OFFLINE_PROFILE_METADATA_KEY] as Profile | undefined;
    const isOfflineAccount = Boolean(userMetadata[OFFLINE_ACCOUNT_METADATA_KEY]);

    if (!isOfflineAccount) {
      return null;
    }

    const resolvedUser: User = {
      ...authUser,
      profile_completed: offlineProfile?.profile_completed ?? authUser.profile_completed ?? false,
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

    logInfo('Resolved offline authentication state', {
      event: 'auth:offline-session',
      userId: authUser.id,
    });

    return offlineState;
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthState> => {
    if (refreshPromiseRef.current) {
      logInfo('Coalescing refreshUser request while an existing refresh is in progress', {
        event: 'auth:refresh:coalesced',
      });
      return refreshPromiseRef.current;
    }

    const refreshTask = (async (): Promise<AuthState> => {
      logInfo('Starting refreshUser execution', { event: 'auth:refresh:start' });

      let currentUser: User | null = null;
      let currentProfile: Profile | null = null;
      const offlineSession = loadOfflineSession();

      const resolveOfflineSession = (): AuthState => {
        if (offlineSession?.user) {
          currentUser = offlineSession.user;
          currentProfile = offlineSession.profile;
          setUser(offlineSession.user);
          setProfile(offlineSession.profile);
          logInfo('Returning offline session snapshot', {
            event: 'auth:refresh:offline',
            userId: offlineSession.user.id,
          });
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
        logWarn('No authenticated user during refresh; cleared offline session', {
          event: 'auth:refresh:no-session',
        });
        return resolveOfflineSession();
      }

      clearOfflineSession();

      currentUser = authUser;
      setUser(authUser);

      logInfo('Authenticated user loaded from Supabase', {
        event: 'auth:refresh:user-loaded',
        userId: authUser.id,
      });

      const metadata = authUser.user_metadata || {};

      // Get the user's profile - wrapped in try-catch for safety
      let userProfile: Profile | null = null;
      let profileError: any = null;

      try {
        const profileResult = await profileService.getByUserId(authUser.id);
        userProfile = profileResult.data;
        profileError = profileResult.error;
      } catch (err) {
        logError('Exception during profile fetch', err, {
          event: 'auth:refresh:profile-fetch-exception',
          userId: authUser.id,
        });
        profileError = err;
      }

      if (profileError) {
        const profileErrorCode = profileError && typeof profileError === 'object' && 'code' in profileError 
          ? (profileError as any).code 
          : undefined;
        const profileErrorMessage = profileError && typeof profileError === 'object' && 'message' in profileError
          ? String((profileError as any).message).toLowerCase()
          : '';
        const isNotFound =
          profileErrorCode === 'PGRST116' ||
          profileErrorMessage.includes('no rows') ||
          profileErrorMessage.includes('not found');

        if (isNotFound && authUser.email) {
          const derivedFullName = metadata.full_name ?? (
            metadata.first_name && metadata.last_name
              ? `${metadata.first_name} ${metadata.last_name}`.trim()
              : undefined
          );

          const msisdnFromMetadata = normalizeMsisdn(
            typeof metadata.msisdn === 'string'
              ? metadata.msisdn
              : typeof metadata.payment_phone === 'string'
              ? metadata.payment_phone
              : typeof metadata.phone === 'string'
              ? metadata.phone
              : typeof metadata.mobile_number === 'string'
              ? metadata.mobile_number
              : undefined,
          );

          if (!msisdnFromMetadata) {
            logWarn('Profile not found and MSISDN missing in metadata; skipping auto-creation', {
              event: 'auth:refresh:profile-missing-msisdn',
              userId: authUser.id,
            });
            setProfile(null);
            return { user: authUser, profile: null };
          }

          const inferredProfilePayload = {
            email: authUser.email,
            account_type: metadata.account_type,
            profile_completed: metadata.profile_completed ?? false,
            full_name: derivedFullName,
            first_name: metadata.first_name,
            last_name: metadata.last_name,
            company: metadata.company,
            msisdn: msisdnFromMetadata,
            phone: msisdnFromMetadata,
            payment_phone: msisdnFromMetadata,
            payment_method: 'phone' as const,
            use_same_phone: true,
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
            
            try {
              const result = await profileService.createProfile(authUser.id, filteredPayload);
              
              if (!result.error && result.data) {
                createdProfile = result.data;
                logProfileOperation('profile-created-successfully', { userId: authUser.id, attempt });
                break;
              }
              
              creationError = result.error;
              const errorCode = creationError && typeof creationError === 'object' && 'code' in creationError
                ? (creationError as any).code
                : undefined;
              const errorMsg = creationError && typeof creationError === 'object' && 'message' in creationError
                ? String((creationError as any).message).toLowerCase()
                : '';
              
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
            } catch (err) {
              logError('Exception during profile creation attempt', err, {
                event: 'auth:refresh:profile-create-exception',
                userId: authUser.id,
                attempt,
              });
              creationError = err;
              // Continue to next attempt if available
              if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, attempt * 500));
              }
            }
          }

          if (!creationError && createdProfile) {
            setProfile(createdProfile);
            currentProfile = createdProfile;
            const enrichedUser: User = {
              ...authUser,
              profile_completed: createdProfile.profile_completed ?? false,
              account_type: createdProfile.account_type ?? authUser.account_type,
            };

            currentUser = enrichedUser;
            setUser(enrichedUser);
            logInfo('Reconstructed profile after missing profile detection', {
              event: 'auth:refresh:profile-recreated',
              userId: authUser.id,
            });
            logProfileOperation('profile-bootstrapped', { 
              userId: authUser.id,
              profileCompleted: createdProfile.profile_completed ?? false
            });
          } else if (creationError) {
            logError('Error creating inferred profile during refresh', creationError, {
              event: 'auth:refresh:profile-recreate-error',
              userId: authUser.id,
            });
            const errorMessage = creationError && typeof creationError === 'object' && 'message' in creationError
              ? String((creationError as any).message)
              : 'Unknown error';
            logProfileOperation('profile-creation-failed', { 
              userId: authUser.id, 
              error: errorMessage
            });
            setProfile(null);
          }
        } else {
          logError('Unexpected error fetching user profile', profileError, {
            event: 'auth:refresh:profile-error',
            userId: authUser.id,
          });
          setProfile(null);
        }
      } else {
        setProfile(userProfile);

        // Update user with profile completion info
        if (userProfile) {
          currentProfile = userProfile;
          const enrichedUser: User = {
            ...authUser,
            profile_completed: userProfile.profile_completed ?? false,
            account_type: userProfile.account_type ?? authUser.account_type,
          };

          currentUser = enrichedUser;
          setUser(enrichedUser);
          logInfo('Loaded profile for authenticated user', {
            event: 'auth:refresh:profile-loaded',
            userId: authUser.id,
          });
        }
      }
    } catch (error) {
      logError('Error refreshing authenticated user state', error, {
        event: 'auth:refresh:exception',
        userId: user?.id ?? undefined,
      });
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

    const nextState: AuthState = {
      user: currentUser,
      profile: currentProfile,
    };

    logInfo('Completed refreshUser execution', {
      event: 'auth:refresh:complete',
      userId: currentUser?.id,
      hasProfile: Boolean(currentProfile),
    });

    return nextState;
  })()
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = refreshTask;

    return refreshTask;
  }, [user?.id]);

  const signIn = async (email: string, password: string): Promise<AuthState> => {
    logInfo('Initiating sign-in flow', { event: 'auth:signIn:start' });
    const { data: authUser, error } = await userService.signIn(email, password);

    // TEMPORARY BYPASS MODE: remove after auth errors are fixed
    if (error && isAuthBypassEnabled()) {
      logBypassError('SIGNIN_ERROR', error, { email });
      
      // Check if we have a previously created bypass user for this email
      const existingBypassUser = findBypassUserByEmail(email);
      
      if (existingBypassUser) {
        // Use existing bypass user
        logBypassOperation('SIGNIN', 'Using existing bypass user', {
          userId: existingBypassUser.id,
          email: existingBypassUser.email,
        });
        
        const bypassProfile = loadBypassProfile(existingBypassUser.id);
        
        setUser(existingBypassUser);
        setProfile(bypassProfile);
        setLoading(false);
        
        toast({
          title: 'Signed in (Temporary Mode)',
          description: 'You are currently logged in via temporary onboarding mode. Once our systems are fully restored, you may be asked to verify your account.',
          variant: 'default',
        });
        
        return {
          user: existingBypassUser,
          profile: bypassProfile,
        };
      } else {
        // Create new bypass user
        const bypassUser = createBypassUser(email, {
          email,
        });
        
        logBypassOperation('SIGNIN', 'Created new bypass user for failed sign-in', {
          userId: bypassUser.id,
          email: bypassUser.email,
        });
        
        saveBypassUser(bypassUser);
        setUser(bypassUser);
        setProfile(null);
        setLoading(false);
        
        toast({
          title: 'Signed in (Temporary Mode)',
          description: 'You are currently logged in via temporary onboarding mode. Once our systems are fully restored, you may be asked to verify your account.',
          variant: 'default',
        });
        
        return {
          user: bypassUser,
          profile: null,
        };
      }
    }

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
      logError('Sign-in failed', error, {
        event: 'auth:signIn:error',
      });
      throw new Error(errorMessage);
    }

    const offlineState = resolveOfflineAuthState(authUser ?? null);

    if (offlineState) {
      logInfo('Signed in using offline account metadata', {
        event: 'auth:signIn:offline',
        userId: offlineState.user?.id,
      });
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });

      return offlineState;
    }

    clearOfflineSession();

    if (!authUser) {
      logWarn('Supabase did not return an auth user after sign-in', {
        event: 'auth:signIn:no-user',
      });
      throw new Error('Sign in failed. Please try again.');
    }

    const refreshedState = await refreshUser();

    const finalState: AuthState = {
      user: refreshedState.user ?? authUser,
      profile: refreshedState.profile ?? null,
    };

    if (!refreshedState.user) {
      setUser(authUser);
    }

    toast({
      title: 'Welcome back!',
      description: refreshedState.user
        ? 'You have been signed in successfully.'
        : 'Sign in succeeded. Complete your profile to unlock full access.',
    });

    logInfo('Sign-in flow completed', {
      event: 'auth:signIn:success',
      userId: finalState.user?.id ?? authUser.id,
      hasProfile: Boolean(finalState.profile),
    });

    return finalState;
  };

  const signUp = async (email: string, password: string, userData?: any): Promise<AuthState> => {
    logInfo('Initiating sign-up flow', { event: 'auth:signUp:start' });

    const { data: user, error } = await userService.signUp(email, password, userData);

    // TEMPORARY BYPASS MODE: remove after auth errors are fixed
    if (error && isAuthBypassEnabled()) {
      logBypassError('SIGNUP_ERROR', error, { email, userData });
      
      // Create a bypass user even though sign-up failed
      const bypassUser = createBypassUser(email, {
        email,
        account_type: userData?.account_type,
        ...userData,
      });
      
      logBypassOperation('SIGNUP', 'Created bypass user for failed sign-up', {
        userId: bypassUser.id,
        email: bypassUser.email,
        accountType: userData?.account_type,
      });
      
      // Create a minimal bypass profile
      const bypassProfile = createBypassProfile(bypassUser.id, email, {
        full_name: userData?.full_name,
        account_type: userData?.account_type,
        phone: userData?.phone,
        msisdn: userData?.msisdn,
        payment_phone: userData?.payment_phone,
        accepted_terms: userData?.accepted_terms,
        newsletter_opt_in: userData?.newsletter_opt_in,
      });
      
      saveBypassUser(bypassUser);
      saveBypassProfile(bypassProfile);
      
      setUser(bypassUser);
      setProfile(bypassProfile);
      setLoading(false);
      
      toast({
        title: 'Account created (Temporary Mode)',
        description: 'Your account has been created in temporary mode while we finalize our systems. You can continue to set up your profile.',
        variant: 'default',
      });
      
      return {
        user: bypassUser,
        profile: bypassProfile,
      };
    }

    if (error) {
      // Provide user-friendly error messages
      let errorMessage = error.message || 'Failed to create account';

      // Check for common error patterns and provide helpful messages
      const normalizedError = errorMessage.toLowerCase();

      if (error.status === 500 || normalizedError.includes('unexpected_failure')) {
        errorMessage = 'We hit a temporary issue creating your account. Please try again shortly or contact support if this repeats.';
      } else if (normalizedError.includes('network') || normalizedError.includes('fetch')) {
        errorMessage = 'We couldn\'t reach WATHACI servers right now. Please try again shortly.';
      } else if (normalizedError.includes('already exists') || normalizedError.includes('already registered')) {
        errorMessage = 'An account with this email already exists. Please sign in instead or use a different email.';
      } else if (normalizedError.includes('password')) {
        errorMessage = 'Password does not meet requirements. Please use a stronger password.';
      }

      logSupabaseAuthError('signUp', error);
      logError('Sign-up failed', error, {
        event: 'auth:signUp:error',
      });
      throw new Error(errorMessage);
    }

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
        
        try {
          const result = await profileService.createProfile(user.id, profilePayload);
          
          if (!result.error && result.data) {
            createdProfile = result.data;
            logInfo('Profile created during sign-up', {
              event: 'auth:signUp:profile-created',
              userId: user.id,
            });
            logProfileOperation('signup-profile-created', { userId: user.id, attempt });
            break;
          }
          
          profileError = result.error;
          const message = profileError && typeof profileError === 'object' && 'message' in profileError
            ? String((profileError as any).message).toLowerCase()
            : '';
          const profileErrorCode = profileError && typeof profileError === 'object' && 'code' in profileError
            ? (profileError as any).code
            : undefined;
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

            logError('Profile creation failed during sign-up', profileError, {
              event: 'auth:signUp:profile-error',
              userId: user.id,
            });
            logProfileOperation('signup-profile-error', { 
              userId: user.id,
              errorCode: profileErrorCode,
              message: profileErrorMessage 
            });
            
            // Don't throw - allow signup to complete even if profile creation initially fails
            // The profile will be created on next login via refreshUser
            break;
          }

          if (isAuthPending) {
            logWarn('Profile creation deferred until email confirmation completes', {
              event: 'auth:signUp:profile-pending',
              userId: user.id,
            });
            break;
          }
          
          // Wait before retry (exponential backoff)
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
          }
        } catch (err) {
          logError('Exception during signup profile creation', err, {
            event: 'auth:signUp:profile-create-exception',
            userId: user.id,
            attempt,
          });
          profileError = err;
          // Continue to next attempt if available
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
          }
        }
      }
      
      if (createdProfile) {
        logProfileOperation('signup-profile-ready', { 
          userId: user.id,
          profileCompleted: createdProfile.profile_completed ?? false
        });
      } else if (profileError) {
        const errorMessage = profileError && typeof profileError === 'object' && 'message' in profileError
          ? String((profileError as any).message)
          : 'Unknown error';
        logProfileOperation('signup-profile-creation-skipped', { 
          userId: user.id,
          error: errorMessage,
          note: 'Profile will be created on first login' 
        });
      }
    }

    // Show success message
    // If Supabase hasn't started a session yet, let the user know they can still sign in right away
    const refreshedState = await refreshUser();
    const sessionActive = !!refreshedState.user;

    toast({
      title: "Account created!",
      description: sessionActive
        ? "You're all set! Complete your profile to get started."
        : "Your account is ready. You can sign in right away to continue.",
    });

    if (!user) {
      return { user: null, profile: null };
    }

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

      logInfo('Sign-up completed without active session; returning fallback state', {
        event: 'auth:signUp:fallback-state',
        userId: fallbackUser.id,
        hasProfile: Boolean(createdProfile),
      });

      return {
        user: fallbackUser,
        profile: createdProfile,
      };
    }

    if (!refreshedState.profile && createdProfile) {
      setProfile(createdProfile);
      logInfo('Attached eagerly created profile to refreshed state', {
        event: 'auth:signUp:profile-attached',
        userId: refreshedState.user?.id ?? user.id,
      });
      return {
        user: refreshedState.user,
        profile: createdProfile,
      };
    }

    logInfo('Sign-up flow completed', {
      event: 'auth:signUp:success',
      userId: refreshedState.user?.id ?? user.id,
      hasProfile: Boolean(refreshedState.profile ?? createdProfile),
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
      logError('Error during sign-out', error, {
        event: 'auth:signOut:error',
        userId: user?.id ?? undefined,
      });
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : 'An unexpected error occurred during sign out';
      toast({
        title: "Error signing out",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Initial user fetch - wrapped in promise catch for safety
    refreshUser().catch((err) => {
      logError('Error during initial refreshUser', err, {
        event: 'auth:init:error',
      });
      // Don't rethrow - let the component render with loading=false
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await refreshUser();
          } else if (event === 'SIGNED_OUT') {
            clearOfflineSession();
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        } catch (error) {
          logError('Error in auth state change handler', error, {
            event: `auth:onAuthStateChange:${event}`,
          });
          // Don't rethrow - prevent crashes in auth listener
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

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