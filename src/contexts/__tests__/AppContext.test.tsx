import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockGetByUserId = jest.fn();
const mockCreateProfile = jest.fn();
const mockToast = jest.fn();

jest.mock('@/lib/services', () => ({
  userService: {
    signIn: (...args: any[]) => mockSignIn(...args),
    signUp: (...args: any[]) => mockSignUp(...args),
    signOut: (...args: any[]) => mockSignOut(...args),
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  },
  profileService: {
    getByUserId: (...args: any[]) => mockGetByUserId(...args),
    createProfile: (...args: any[]) => mockCreateProfile(...args),
  },
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
  },
  OFFLINE_ACCOUNT_METADATA_KEY: '__offline_account',
  OFFLINE_PROFILE_METADATA_KEY: '__offline_profile',
}));

jest.mock('@/components/ui/use-toast', () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

const renderContext = async () => {
  let context: ReturnType<typeof useAppContext> | null = null;

  const Harness = () => {
    context = useAppContext();
    return null;
  };

  render(
    <AppProvider>
      <Harness />
    </AppProvider>
  );

  await waitFor(() => expect(context).not.toBeNull());
  await waitFor(() => expect(context?.loading).toBe(false));

  return context!;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue({ data: null, error: null });
  mockGetByUserId.mockResolvedValue({ data: null, error: null });
});

describe('AppContext auth actions', () => {
  it('signIn resolves and shows toast', async () => {
    const user = { id: 'user-1', email: 'test@example.com', user_metadata: {} } as any;
    mockSignIn.mockResolvedValue({ data: user, error: null });

    const ctx = await renderContext();
    await ctx.signIn('test@example.com', 'Password123');

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'Password123');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome back!' }));
  });

  it('signIn throws with user friendly message on failure', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: new Error('Invalid login credentials') });

    const ctx = await renderContext();
    await expect(ctx.signIn('bad@example.com', 'wrong')).rejects.toThrow('Invalid email or password');
  });

  it('signUp forwards metadata and creates profile', async () => {
    const user = { id: 'user-2', email: 'new@example.com', user_metadata: {} } as any;
    mockSignUp.mockResolvedValue({ data: user, error: null });
    mockCreateProfile.mockResolvedValue({ data: { id: 'profile-1', profile_completed: false }, error: null });

    const ctx = await renderContext();
    await ctx.signUp('new@example.com', 'Password123', { full_name: 'Test User', msisdn: '+260955000000' });

    expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'Password123', { full_name: 'Test User', msisdn: '+260955000000' });
    expect(mockCreateProfile).toHaveBeenCalledWith('user-2', expect.any(Object));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Account created!' }));
  });

  it('signOut clears session and shows confirmation toast', async () => {
    mockSignOut.mockResolvedValue({ data: null, error: null });

    const ctx = await renderContext();
    await ctx.signOut();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Signed out successfully' }));
  });
});
