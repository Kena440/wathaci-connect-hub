import { v4 as uuid } from 'uuid';

import type { DatabaseResponse, Profile, User } from '@/@types/database';

type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

interface LocalAuthSession {
  user: User;
}

interface LocalAuthListener {
  (event: AuthChangeEvent, session: LocalAuthSession | null): void;
}

interface StoredUser extends User {
  password: string;
}

interface LocalAuthState {
  users: StoredUser[];
  profiles: Record<string, Profile>;
  session: { userId: string } | null;
}

const STORAGE_KEY = 'wathaci-connect-local-auth';

const defaultState: LocalAuthState = {
  users: [],
  profiles: {},
  session: null,
};

const hasBrowserStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const cloneState = (state: LocalAuthState): LocalAuthState => JSON.parse(JSON.stringify(state));

let memoryState: LocalAuthState = cloneState(defaultState);

const loadState = (): LocalAuthState => {
  if (hasBrowserStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalAuthState;
        return { ...defaultState, ...parsed, profiles: parsed.profiles || {} };
      }
    } catch (error) {
      console.warn('Failed to load local auth state from storage:', error);
    }
  }

  return cloneState(memoryState);
};

const saveState = (state: LocalAuthState) => {
  if (hasBrowserStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist local auth state to storage:', error);
    }
  }

  memoryState = cloneState(state);
};

const sanitizeUser = (user: StoredUser | null): User | null => {
  if (!user) return null;

  const { password: _password, ...rest } = user;
  return rest;
};

class LocalAuthService {
  private listeners = new Set<LocalAuthListener>();

  private notify(event: AuthChangeEvent, user: StoredUser | null) {
    const session = user ? { user: sanitizeUser(user)! } : null;
    this.listeners.forEach(listener => listener(event, session));
  }

  async getCurrentUser(): Promise<DatabaseResponse<User | null>> {
    const state = loadState();

    if (!state.session) {
      return { data: null, error: null };
    }

    const user = state.users.find(u => u.id === state.session?.userId) || null;
    return { data: sanitizeUser(user), error: null };
  }

  async signIn(email: string, password: string): Promise<DatabaseResponse<User>> {
    const state = loadState();
    const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user || user.password !== password) {
      return { data: null, error: new Error('Invalid email or password') };
    }

    state.session = { userId: user.id };
    saveState(state);
    this.notify('SIGNED_IN', user);

    return { data: sanitizeUser(user), error: null };
  }

  async signUp(email: string, password: string): Promise<DatabaseResponse<User>> {
    const state = loadState();
    const existing = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existing) {
      return { data: null, error: new Error('An account with this email already exists') };
    }

    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: uuid(),
      email,
      password,
      created_at: now,
      updated_at: now,
      profile_completed: false,
    };

    state.users.push(newUser);
    state.session = { userId: newUser.id };
    saveState(state);
    this.notify('SIGNED_IN', newUser);

    return { data: sanitizeUser(newUser), error: null };
  }

  async signOut(): Promise<DatabaseResponse<void>> {
    const state = loadState();
    const user = state.users.find(u => u.id === state.session?.userId) || null;

    state.session = null;
    saveState(state);
    this.notify('SIGNED_OUT', user);

    return { data: undefined, error: null };
  }

  onAuthStateChange(listener: LocalAuthListener) {
    this.listeners.add(listener);

    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(listener),
        },
      },
    };
  }

  applyProfileMetadata(userId: string, metadata: Partial<Profile>) {
    const state = loadState();
    const userIndex = state.users.findIndex(u => u.id === userId);

    if (userIndex >= 0) {
      state.users[userIndex] = {
        ...state.users[userIndex],
        account_type: metadata.account_type || state.users[userIndex].account_type,
        profile_completed: metadata.profile_completed ?? state.users[userIndex].profile_completed,
      };

      saveState(state);
    }
  }
}

class LocalProfileService {
  constructor(private authService: LocalAuthService) {}

  async getByUserId(userId: string): Promise<DatabaseResponse<Profile>> {
    const state = loadState();
    const profile = state.profiles[userId] || null;

    return { data: profile, error: null };
  }

  async createProfile(userId: string, profileData: Partial<Profile>): Promise<DatabaseResponse<Profile>> {
    const state = loadState();

    const now = new Date().toISOString();
    const profile: Profile = {
      id: userId,
      email: profileData.email || '',
      account_type: profileData.account_type || 'sole_proprietor',
      profile_completed: profileData.profile_completed ?? false,
      created_at: profileData.created_at || now,
      updated_at: profileData.updated_at || now,
      phone: profileData.phone || (profileData as any).mobile_number || '',
      country: profileData.country || '',
      payment_method: profileData.payment_method || 'phone',
      payment_phone: profileData.payment_phone,
      card_details: profileData.card_details,
      use_same_phone: profileData.use_same_phone,
      business_name: profileData.business_name || (profileData as any).company || '',
      registration_number: profileData.registration_number,
      industry_sector: profileData.industry_sector,
      description: profileData.description,
      website_url: profileData.website_url,
      employee_count: profileData.employee_count,
      annual_revenue: profileData.annual_revenue,
      funding_stage: profileData.funding_stage,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      address: profileData.address,
      coordinates: profileData.coordinates,
      profile_image_url: profileData.profile_image_url,
      linkedin_url: profileData.linkedin_url,
      qualifications: profileData.qualifications || [],
      experience_years: profileData.experience_years,
      specialization: profileData.specialization,
      gaps_identified: profileData.gaps_identified,
    } as Profile;

    state.profiles[userId] = profile;
    saveState(state);
    this.authService.applyProfileMetadata(userId, profileData);

    return { data: profile, error: null };
  }

  async updateProfile(userId: string, profileData: Partial<Profile>): Promise<DatabaseResponse<Profile>> {
    const state = loadState();
    const existing = state.profiles[userId];

    if (!existing) {
      return { data: null, error: new Error('Profile not found') };
    }

    const updated: Profile = {
      ...existing,
      ...profileData,
      updated_at: new Date().toISOString(),
    };

    state.profiles[userId] = updated;
    saveState(state);
    this.authService.applyProfileMetadata(userId, profileData);

    return { data: updated, error: null };
  }
}

export const localAuthService = new LocalAuthService();
export const localProfileService = new LocalProfileService(localAuthService);
