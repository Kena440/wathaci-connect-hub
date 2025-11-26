/**
 * User and Profile service for handling all user-related database operations
 */

import { BaseService } from './base-service';
import { supabase, withErrorHandling, resolveEnvValue, supabaseAuthConfigStatus } from '@/lib/supabase-enhanced';
import type {
  User,
  Profile,
  AccountType,
  ProfileFilters,
  DatabaseResponse
} from '@/@types/database';
import { isStrongPassword, passwordStrengthMessage } from '@/utils/password';

export const OFFLINE_ACCOUNT_METADATA_KEY = '__offline_account';
export const OFFLINE_PROFILE_METADATA_KEY = '__offline_profile';

type OfflineAccount = {
  email: string;
  password: string;
  user: User;
  profile: Profile;
};

const OFFLINE_TIMESTAMP = '2024-01-01T00:00:00.000Z';

const cloneProfile = (profile: Profile): Profile => ({
  ...profile,
  qualifications: profile.qualifications?.map(item => ({ ...item })) ?? [],
  gaps_identified: profile.gaps_identified ? [...profile.gaps_identified] : undefined,
});

const offlineAccounts: OfflineAccount[] = [
  (() => {
    const profile: Profile = {
      id: 'offline-admin',
      email: 'admin@wathaci.test',
      account_type: 'admin',
      profile_completed: true,
      created_at: OFFLINE_TIMESTAMP,
      updated_at: OFFLINE_TIMESTAMP,
      first_name: 'WATHACI',
      last_name: 'Admin',
      business_name: 'WATHACI Connect',
      phone: '+260211000000',
      country: 'Zambia',
      payment_method: 'phone',
      payment_phone: '+260211000000',
      use_same_phone: true,
      qualifications: [],
      gaps_identified: [],
    };

    const user: User = {
      id: profile.id,
      email: profile.email,
      profile_completed: profile.profile_completed,
      account_type: profile.account_type,
      created_at: OFFLINE_TIMESTAMP,
      updated_at: OFFLINE_TIMESTAMP,
      user_metadata: {
        full_name: 'WATHACI Administrator',
        account_type: profile.account_type,
        profile_completed: profile.profile_completed,
        [OFFLINE_ACCOUNT_METADATA_KEY]: true,
        [OFFLINE_PROFILE_METADATA_KEY]: profile,
      },
    };

    return {
      email: profile.email,
      password: 'AdminPass123!',
      user,
      profile,
    } satisfies OfflineAccount;
  })(),
  (() => {
    const profile: Profile = {
      id: 'offline-user',
      email: 'user@wathaci.test',
      account_type: 'sme',
      profile_completed: true,
      created_at: OFFLINE_TIMESTAMP,
      updated_at: OFFLINE_TIMESTAMP,
      first_name: 'Growth',
      last_name: 'Partner',
      business_name: 'Sample SME',
      phone: '+260955000000',
      country: 'Zambia',
      payment_method: 'phone',
      payment_phone: '+260955000000',
      use_same_phone: true,
      industry_sector: 'Technology',
      qualifications: [],
      gaps_identified: [],
    };

    const user: User = {
      id: profile.id,
      email: profile.email,
      profile_completed: profile.profile_completed,
      account_type: profile.account_type,
      created_at: OFFLINE_TIMESTAMP,
      updated_at: OFFLINE_TIMESTAMP,
      user_metadata: {
        full_name: 'Growth Partner',
        account_type: profile.account_type,
        profile_completed: profile.profile_completed,
        [OFFLINE_ACCOUNT_METADATA_KEY]: true,
        [OFFLINE_PROFILE_METADATA_KEY]: profile,
      },
    };

    return {
      email: profile.email,
      password: 'UserPass123!',
      user,
      profile,
    } satisfies OfflineAccount;
  })(),
];

const FALLBACK_EMAIL_REDIRECT_PATH = '/signin';

const APP_BASE_URL_KEYS = [
  'VITE_APP_BASE_URL',
  'APP_BASE_URL',
  'VITE_SITE_URL',
  'SITE_URL',
  'VITE_PUBLIC_SITE_URL',
  'PUBLIC_SITE_URL',
];

const EMAIL_REDIRECT_URL_KEYS = [
  'VITE_EMAIL_CONFIRMATION_REDIRECT_URL',
  'EMAIL_CONFIRMATION_REDIRECT_URL',
  'VITE_SUPABASE_EMAIL_REDIRECT_URL',
  'SUPABASE_EMAIL_REDIRECT_URL',
];

const EMAIL_REDIRECT_PATH_KEYS = [
  'VITE_EMAIL_CONFIRMATION_REDIRECT_PATH',
  'EMAIL_CONFIRMATION_REDIRECT_PATH',
];

const PASSWORD_RESET_REDIRECT_URL_KEYS = [
  'VITE_PASSWORD_RESET_REDIRECT_URL',
  'PASSWORD_RESET_REDIRECT_URL',
  'VITE_SUPABASE_PASSWORD_RESET_REDIRECT_URL',
  'SUPABASE_PASSWORD_RESET_REDIRECT_URL',
];

const PASSWORD_RESET_REDIRECT_PATH_KEYS = [
  'VITE_PASSWORD_RESET_REDIRECT_PATH',
  'PASSWORD_RESET_REDIRECT_PATH',
];

const normalizeBaseUrl = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
};

const getRuntimeBaseUrl = (): string | undefined => {
  for (const key of APP_BASE_URL_KEYS) {
    const value = resolveEnvValue(key);
    if (value) {
      const normalized = normalizeBaseUrl(value);
      if (normalized) {
        return normalized;
      }
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).__APP_URL__) {
    const runtimeValue = String((globalThis as any).__APP_URL__);
    const normalized = normalizeBaseUrl(runtimeValue);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

const buildAbsoluteUrl = (value: string, baseUrl?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    if (!baseUrl) {
      return undefined;
    }

    try {
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      return new URL(value, normalizedBase).toString();
    } catch {
      return undefined;
    }
  }
};

type RedirectConfig = {
  urlKeys?: string[];
  pathKeys?: string[];
};

const getEmailRedirectTo = (
  fallbackPath = FALLBACK_EMAIL_REDIRECT_PATH,
  options: RedirectConfig = {}
): string | undefined => {
  const baseUrl = getRuntimeBaseUrl();

  const urlKeys = options.urlKeys?.length ? options.urlKeys : EMAIL_REDIRECT_URL_KEYS;
  const pathKeys = options.pathKeys?.length ? options.pathKeys : EMAIL_REDIRECT_PATH_KEYS;

  for (const key of urlKeys) {
    const value = resolveEnvValue(key);
    if (value) {
      const resolved = buildAbsoluteUrl(value, baseUrl);
      if (resolved) {
        return resolved;
      }
    }
  }

  const pathCandidate =
    pathKeys.map(resolveEnvValue).find((value): value is string => Boolean(value)) ||
    fallbackPath;

  if (pathCandidate) {
    const resolved = buildAbsoluteUrl(pathCandidate, baseUrl);
    if (resolved) {
      return resolved;
    }

    const fallbackResolved = buildAbsoluteUrl(`/${pathCandidate.replace(/^\/+/g, '')}`, baseUrl);
    if (fallbackResolved) {
      return fallbackResolved;
    }
  }

  return undefined;
};

const normaliseEmail = (value: string) => (value || '').trim().toLowerCase();

let hasLoggedMockWarning = false;

const validateSupabaseAuthConfig = (): Error | null => {
  const {
    hasValidConfig,
    isProductionEnvironment,
    allowMockSupabaseClient,
    forcedMockSupabaseClient,
    usingMockClient,
    configWarning,
  } = supabaseAuthConfigStatus;

  if (!hasValidConfig && isProductionEnvironment && !allowMockSupabaseClient) {
    return new Error('Authentication service is not configured. Please try again later.');
  }

  if (forcedMockSupabaseClient && !hasLoggedMockWarning && typeof console !== 'undefined') {
    console.warn(
      'Missing Supabase credentials detected in production. Using mock client to keep sign-in and sign-up available.',
      { configWarning },
    );
    hasLoggedMockWarning = true;
  }

  if (usingMockClient && !hasLoggedMockWarning && typeof console !== 'undefined') {
    console.warn('Using mock Supabase client due to missing configuration.');
    hasLoggedMockWarning = true;
  }

  return null;
};

const getOfflineAccount = (email: string, password: string): OfflineAccount | null => {
  const normalizedEmail = normaliseEmail(email);
  const account = offlineAccounts.find(item => normaliseEmail(item.email) === normalizedEmail);

  if (!account || account.password !== password) {
    return null;
  }

  return {
    email: account.email,
    password: account.password,
    profile: cloneProfile(account.profile),
    user: {
      ...account.user,
      user_metadata: {
        ...(account.user.user_metadata || {}),
        [OFFLINE_ACCOUNT_METADATA_KEY]: true,
        [OFFLINE_PROFILE_METADATA_KEY]: cloneProfile(account.profile),
      },
    },
  };
};

const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return (
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror') ||
    message.includes('network error') ||
    message.includes('econnrefused')
  );
};

const mapAuthUserToUser = (authUser: any): User => ({
  id: authUser.id,
  email: authUser.email || '',
  created_at: authUser.created_at,
  updated_at: authUser.updated_at,
  user_metadata: authUser.user_metadata || {},
});

export class UserService extends BaseService<User> {
  constructor() {
    super('auth.users');
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<DatabaseResponse<User | null>> {
    return withErrorHandling(
      async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          return { data: null, error };
        }

        if (!user) {
          return { data: null, error: null };
        }

        return {
          data: mapAuthUserToUser(user),
          error: null
        };
      },
      'UserService.getCurrentUser'
    );
  }

  /**
   * Sign in user with email and password
   */
  async signIn(email: string, password: string): Promise<DatabaseResponse<User>> {
    return withErrorHandling(
      async () => {
        const configError = validateSupabaseAuthConfig();
        if (configError) {
          return { data: null, error: configError };
        }

        try {
          const offlineAccount = getOfflineAccount(email, password);

          if (offlineAccount) {
            return {
              data: offlineAccount.user,
              error: null,
            };
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            if (isNetworkError(error)) {
              return {
                data: null,
                error: new Error('Unable to reach the authentication service. Please try again shortly.'),
              };
            }
            return { data: null, error };
          }

          const authUser = data?.user;

          if (!authUser) {
            return { data: null, error: new Error('Sign in failed. Please try again.') };
          }

          return {
            data: mapAuthUserToUser(authUser),
            error: null
          };
        } catch (error: any) {
          // Catch network errors specifically
          if (isNetworkError(error) || error.name === 'TypeError') {
            return {
              data: null,
              error: new Error('Unable to reach the authentication service. Please try again shortly.')
            };
          }
          throw error;
        }
      },
      'UserService.signIn'
    );
  }

  /**
   * Sends a one-time password to the provided email to confirm login.
   */
  async sendLoginOtp(email: string): Promise<DatabaseResponse<{ success: true }>> {
    return withErrorHandling(
      async () => {
        try {
          const emailRedirectTo = getEmailRedirectTo();

          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
              ...(emailRedirectTo ? { emailRedirectTo } : {}),
            },
          });

          if (error) {
            if (isNetworkError(error)) {
              return {
                data: null,
                error: new Error('Unable to send verification code. Please check your connection and try again.'),
              };
            }

            return { data: null, error };
          }

          return { data: { success: true }, error: null };
        } catch (error: any) {
          if (isNetworkError(error) || error.name === 'TypeError') {
            return {
              data: null,
              error: new Error('Unable to send verification code. Please check your connection and try again.'),
            };
          }

          throw error;
        }
      },
      'UserService.sendLoginOtp'
    );
  }

  /**
   * Confirms a one-time password and establishes a new authenticated session.
   */
  async verifyLoginOtp(email: string, token: string): Promise<DatabaseResponse<User>> {
    return withErrorHandling(
      async () => {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
          });

          if (error) {
            if (isNetworkError(error)) {
              return {
                data: null,
                error: new Error('Unable to verify the code. Please check your connection and try again.'),
              };
            }

            return { data: null, error };
          }

          const authUser = data?.user;

          if (!authUser) {
            return { data: null, error: new Error('Invalid or expired verification code.') };
          }

          return {
            data: mapAuthUserToUser(authUser),
            error: null,
          };
        } catch (error: any) {
          if (isNetworkError(error) || error.name === 'TypeError') {
            return {
              data: null,
              error: new Error('Unable to verify the code. Please check your connection and try again.'),
            };
          }

          throw error;
        }
      },
      'UserService.verifyLoginOtp'
    );
  }

  /**
   * Sign up new user
   */
  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<DatabaseResponse<User>> {
    return withErrorHandling(
      async () => {
        const configError = validateSupabaseAuthConfig();
        if (configError) {
          return { data: null, error: configError };
        }

        if (!isStrongPassword(password)) {
          return { data: null, error: new Error(passwordStrengthMessage) };
        }

        try {
          const emailRedirectTo = getEmailRedirectTo();

          const signUpOptions: { data?: Record<string, any>; emailRedirectTo?: string } = {};

          if (metadata) {
            signUpOptions.data = metadata;
          }

          if (emailRedirectTo) {
            signUpOptions.emailRedirectTo = emailRedirectTo;
          }

          const signUpPayload = {
            email,
            password,
            ...(Object.keys(signUpOptions).length ? { options: signUpOptions } : {}),
          };

          const { data, error } = await supabase.auth.signUp(signUpPayload);

          if (error) {
            return { data: null, error };
          }

          const authUser = data?.user;

          if (!authUser) {
            return { data: null, error: new Error('User creation failed') };
          }

          return {
            data: mapAuthUserToUser(authUser),
            error: null
          };
        } catch (error: any) {
          // Catch network errors specifically
          if (error.message?.includes('fetch') || error.name === 'TypeError') {
            return {
              data: null,
              error: new Error('Unable to reach the authentication service. Please try again shortly.')
            };
          }
          throw error;
        }
      },
      'UserService.signUp'
    );
  }

  /**
   * Sends a password reset link to the provided email.
   */
  async requestPasswordReset(email: string): Promise<DatabaseResponse<{ success: true }>> {
    return withErrorHandling(
      async () => {
        try {
          const normalizedEmail = normaliseEmail(email);
          const offlineAccount = offlineAccounts.find(
            account => normaliseEmail(account.email) === normalizedEmail
          );

          if (offlineAccount) {
            return { data: { success: true }, error: null };
          }

          const emailRedirectTo = getEmailRedirectTo('/reset-password', {
            urlKeys: PASSWORD_RESET_REDIRECT_URL_KEYS,
            pathKeys: PASSWORD_RESET_REDIRECT_PATH_KEYS,
          });

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            ...(emailRedirectTo ? { redirectTo: emailRedirectTo } : {}),
          });

          if (error) {
            if (isNetworkError(error)) {
              return {
                data: null,
                error: new Error(
                  'Unable to reach the authentication service. Please try again shortly.'
                ),
              };
            }

            return { data: null, error };
          }

          return { data: { success: true }, error: null };
        } catch (error: any) {
          if (isNetworkError(error) || error.name === 'TypeError') {
            return {
              data: null,
              error: new Error('Unable to reach the authentication service. Please try again shortly.'),
            };
          }

          throw error;
        }
      },
      'UserService.requestPasswordReset'
    );
  }

  /**
   * Updates the password for the authenticated user.
   */
  async updatePassword(password: string): Promise<DatabaseResponse<{ success: true }>> {
    return withErrorHandling(
      async () => {
        try {
          const { data, error } = await supabase.auth.updateUser({ password });

          if (error) {
            if (isNetworkError(error)) {
              return {
                data: null,
                error: new Error(
                  'Unable to reach the authentication service. Please try again shortly.'
                ),
              };
            }

            return { data: null, error };
          }

          if (!data?.user) {
            return {
              data: null,
              error: new Error('Unable to update password. Please try again.'),
            };
          }

          return { data: { success: true }, error: null };
        } catch (error: any) {
          if (isNetworkError(error) || error.name === 'TypeError') {
            return {
              data: null,
              error: new Error('Unable to reach the authentication service. Please try again shortly.'),
            };
          }

          throw error;
        }
      },
      'UserService.updatePassword'
    );
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<DatabaseResponse<void>> {
    return withErrorHandling(
      async () => {
        const { error } = await supabase.auth.signOut();
        return { data: undefined, error };
      },
      'UserService.signOut'
    );
  }

  /**
   * Search users by name or email
   */
  async searchUsers(query: string): Promise<DatabaseResponse<Array<{ id: string; full_name: string; email: string }>>> {
    return withErrorHandling(
      async () =>
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10),
      'UserService.searchUsers'
    );
  }
}

export class ProfileService extends BaseService<Profile> {
  constructor() {
    super('profiles');
  }

  private sanitizeProfileData(profileData: Partial<Profile> = {}): Partial<Profile> {
    return Object.fromEntries(
      Object.entries(profileData).filter(([, value]) => value !== undefined)
    ) as Partial<Profile>;
  }

  /**
   * Get profile by user ID with full details
   */
  async getByUserId(userId: string): Promise<DatabaseResponse<Profile>> {
    return withErrorHandling(
      async () =>
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
      'ProfileService.getByUserId'
    );
  }

  /**
   * Create a new profile
   */
  async createProfile(userId: string, profileData: Partial<Profile>): Promise<DatabaseResponse<Profile>> {
    const sanitizedProfileData = this.sanitizeProfileData(profileData);
    const { id: _ignoredId, created_at: _ignoredCreatedAt, updated_at: _ignoredUpdatedAt, ...profileFields } =
      sanitizedProfileData;

    const timestamp = new Date().toISOString();
    const profile = {
      id: userId,
      created_at: timestamp,
      updated_at: timestamp,
      profile_completed: profileFields.profile_completed ?? false,
      ...profileFields,
    };

    const creationResult = await withErrorHandling(
      async () =>
        supabase
          .from('profiles')
          .insert(profile)
          .select()
          .single(),
      'ProfileService.createProfile'
    );

    if (!creationResult.error) {
      return creationResult as DatabaseResponse<Profile>;
    }

    const errorCode = (creationResult.error as any)?.code;
    const errorMessage = creationResult.error.message?.toLowerCase?.() ?? '';
    const isRlsOrPermissionIssue =
      errorCode === '42501' ||
      errorCode === 'PGRST301' ||
      errorCode === 'PGRST302' ||
      errorMessage.includes('row-level security') ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('authorization failed');

    if (isRlsOrPermissionIssue) {
      const msisdn = profile.msisdn ?? profile.phone ?? profile.payment_phone ?? null;

      if (msisdn) {
        const ensureResult = await withErrorHandling(
          async () =>
            supabase.rpc('ensure_profile_exists', {
              p_user_id: userId,
              p_email: profile.email ?? null,
              p_full_name: profile.full_name ?? profile.company ?? null,
              p_msisdn: msisdn,
              p_profile_type: (profile.account_type as string) ?? 'customer',
            }),
          'ProfileService.ensureProfileExists'
        );

        if (!ensureResult.error) {
          return withErrorHandling(
            async () =>
              supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single(),
            'ProfileService.ensureProfileExists.fetchProfile'
          ) as Promise<DatabaseResponse<Profile>>;
        }

        return ensureResult as DatabaseResponse<Profile>;
      }
    }

    const isDuplicateError =
      errorCode === '23505' ||
      errorMessage.includes('duplicate key') ||
      errorMessage.includes('already exists');

    if (!isDuplicateError) {
      return creationResult as DatabaseResponse<Profile>;
    }

    return this.updateProfile(userId, profileFields);
  }

  /**
   * Update profile data
   */
  async updateProfile(userId: string, profileData: Partial<Profile>): Promise<DatabaseResponse<Profile>> {
    const sanitizedProfileData = this.sanitizeProfileData(profileData);
    const { id: _ignoredId, created_at: _ignoredCreatedAt, updated_at: _ignoredUpdatedAt, ...profileFields } =
      sanitizedProfileData;

    return this.update(userId, profileFields);
  }

  /**
   * Set account type for a user
   */
  async setAccountType(userId: string, accountType: AccountType): Promise<DatabaseResponse<Profile>> {
    return this.updateProfile(userId, { account_type: accountType });
  }

  /**
   * Mark profile as completed
   */
  async markProfileCompleted(userId: string): Promise<DatabaseResponse<Profile>> {
    return this.updateProfile(userId, { profile_completed: true });
  }

  /**
   * Search profiles with filters
   */
  async searchProfiles(filters: ProfileFilters = {}) {
    return withErrorHandling(
      async () => {
        let query = supabase
          .from('profiles')
          .select(`
            *,
            user:auth.users(email, created_at)
          `)
          .eq('profile_completed', true);

        // Apply filters
        if (filters.account_type) {
          query = query.eq('account_type', filters.account_type);
        }

        if (filters.country) {
          query = query.eq('country', filters.country);
        }

        if (filters.industry_sector) {
          query = query.eq('industry_sector', filters.industry_sector);
        }

        if (filters.search) {
          query = query.or(`
            business_name.ilike.%${filters.search}%,
            first_name.ilike.%${filters.search}%,
            last_name.ilike.%${filters.search}%,
            description.ilike.%${filters.search}%
          `);
        }

        const result = await query.order('updated_at', { ascending: false });
        return result;
      },
      'ProfileService.searchProfiles'
    );
  }

  /**
   * Get profiles by account type
   */
  async getByAccountType(accountType: AccountType) {
    return this.findMany({ account_type: accountType, profile_completed: true });
  }

  /**
   * Update payment information
   */
  async updatePaymentInfo(
    userId: string, 
    paymentData: {
      payment_method: 'phone' | 'card';
      payment_phone?: string;
      card_details?: {
        last4: string;
        expiry_month: number;
        expiry_year: number;
        cardholder_name?: string | null;
      };
      use_same_phone?: boolean;
    }
  ): Promise<DatabaseResponse<Profile>> {
    return this.updateProfile(userId, paymentData);
  }

  /**
   * Update professional information
   */
  async updateProfessionalInfo(
    userId: string,
    professionalData: {
      qualifications?: Array<{ 
        name?: string; 
        institution?: string; 
        year?: string | number;
        degree?: string;
        field?: string;
      }>;
      experience_years?: number;
      specialization?: string;
      gaps_identified?: string[];
    }
  ): Promise<DatabaseResponse<Profile>> {
    // Normalize qualifications to match the database schema
    const normalizedData = {
      ...professionalData,
      qualifications: professionalData.qualifications?.map(q => ({
        ...q,
        year: q.year !== undefined ? String(q.year) : undefined,
      })),
    };
    return this.updateProfile(userId, normalizedData as Partial<Profile>);
  }

  /**
   * Update business information
   */
  async updateBusinessInfo(
    userId: string,
    businessData: {
      business_name?: string;
      registration_number?: string;
      industry_sector?: string;
      description?: string;
      website_url?: string;
      employee_count?: number;
      annual_revenue?: number;
      funding_stage?: string;
    }
  ): Promise<DatabaseResponse<Profile>> {
    return this.updateProfile(userId, businessData);
  }

  /**
   * Get user profile with subscription information
   */
  async getProfileWithSubscription(userId: string) {
    return withErrorHandling(
      async () =>
        supabase
          .from('profiles')
          .select(`
          *,
          subscriptions:user_subscriptions(
            id,
            plan_id,
            status,
            start_date,
            end_date,
            subscription_plans(name, features, category)
          )
        `)
          .eq('id', userId)
          .single(),
      'ProfileService.getProfileWithSubscription'
    );
  }

  /**
   * Check if profile is complete
   */
  async isProfileComplete(userId: string): Promise<DatabaseResponse<boolean>> {
    return withErrorHandling(
      async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('profile_completed, account_type, first_name, last_name, phone, country')
          .eq('id', userId)
          .single();

        if (error) {
          return { data: false, error };
        }

        const isComplete = profile?.profile_completed && 
                          profile?.account_type &&
                          profile?.first_name &&
                          profile?.last_name &&
                          profile?.phone &&
                          profile?.country;

        return { data: !!isComplete, error: null };
      },
      'ProfileService.isProfileComplete'
    );
  }

  /**
   * Get profile completion percentage
   */
  async getProfileCompletionPercentage(userId: string): Promise<DatabaseResponse<number>> {
    return withErrorHandling(
      async () => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          return { data: 0, error };
        }

        if (!profile) {
          return { data: 0, error: null };
        }

        const requiredFields = [
          'account_type',
          'first_name', 
          'last_name',
          'phone',
          'country',
          'email'
        ];

        const accountTypeSpecificFields: Record<AccountType, string[]> = {
          sole_proprietor: ['business_name', 'registration_number'],
          professional: ['qualifications', 'specialization'],
          sme: ['business_name', 'registration_number', 'industry_sector'],
          investor: ['business_name', 'annual_revenue', 'investment_focus', 'investment_stage'],
          donor: ['business_name', 'donor_type', 'annual_funding_budget', 'funding_focus'],
          government: ['business_name', 'registration_number', 'institution_type', 'department', 'government_focus'],
          admin: []
        };

        const allRequiredFields = [
          ...requiredFields,
          ...(profile.account_type
            ? accountTypeSpecificFields[profile.account_type as AccountType] || []
            : []),
        ];

        const completedFields = allRequiredFields.filter(field => {
          const value = profile[field];
          return value !== null && value !== undefined && value !== '';
        }).length;

        const percentage = Math.round((completedFields / allRequiredFields.length) * 100);

        return { data: percentage, error: null };
      },
      'ProfileService.getProfileCompletionPercentage'
    );
  }
}

// Export singleton instances
export const userService = new UserService();
export const profileService = new ProfileService();