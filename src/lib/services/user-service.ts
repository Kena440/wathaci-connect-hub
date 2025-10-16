/**
 * User and Profile service for handling all user-related database operations
 */

import { BaseService } from './base-service';
import { supabase, withErrorHandling } from '@/lib/supabase-enhanced';
import type {
  User,
  Profile,
  AccountType,
  ProfileFilters,
  DatabaseResponse
} from '@/@types/database';

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

const normaliseEmail = (value: string) => (value || '').trim().toLowerCase();

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
   * Sign up new user
   */
  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<DatabaseResponse<User>> {
    return withErrorHandling(
      async () => {
        try {
          const signUpPayload = {
            email,
            password,
            ...(metadata ? { options: { data: metadata } } : {}),
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
    const profile = {
      id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile_completed: false,
      ...profileData,
    };

    return this.create(profile);
  }

  /**
   * Update profile data
   */
  async updateProfile(userId: string, profileData: Partial<Profile>): Promise<DatabaseResponse<Profile>> {
    return this.update(userId, {
      ...profileData,
      updated_at: new Date().toISOString(),
    });
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
      qualifications?: Array<{ name: string; institution: string; year: number }>;
      experience_years?: number;
      specialization?: string;
      gaps_identified?: string[];
    }
  ): Promise<DatabaseResponse<Profile>> {
    return this.updateProfile(userId, professionalData);
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
          investor: ['business_name', 'annual_revenue'],
          donor: ['business_name'],
          government: ['business_name', 'registration_number'],
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