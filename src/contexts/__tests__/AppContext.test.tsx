import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';
import { supabase } from '@/lib/supabase-enhanced';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/supabase-enhanced', () => {
  const auth: any = {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithOtp: jest.fn(),
    verifyOtp: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  };
  return {
    supabase: { auth, from: jest.fn() },
    withErrorHandling: async (operation: any) => {
      const result = await operation();
      return { data: (result as any).data ?? null, error: (result as any).error ?? null };
    },
  };
});

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

const mockSupabase = supabase as unknown as {
  auth: {
    getUser: jest.Mock;
    signInWithPassword: jest.Mock;
    signInWithOtp: jest.Mock;
    verifyOtp: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  from: jest.Mock;
};
const mockToast = toast as jest.MockedFunction<typeof toast>;

const mockProfileChain = (profile: any = { profile_completed: false, account_type: null }) => {
  const singleResult = { data: profile, error: null };
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(singleResult),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue(singleResult),
      }),
    }),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
  };
};

const renderWithContext = async () => {
  let ctx: ReturnType<typeof useAppContext> | undefined;
  const TestComponent = () => {
    ctx = useAppContext();
    return null;
  };
  render(
    <AppProvider>
      <TestComponent />
    </AppProvider>
  );
  await waitFor(() => expect(ctx).toBeDefined());
  await waitFor(() => expect(ctx!.loading).toBe(false));
  const proxy = new Proxy({} as ReturnType<typeof useAppContext>, {
    get: (_target, prop) => {
      if (!ctx) {
        throw new Error('App context is not ready');
      }
      return (ctx as any)[prop];
    },
  });

  return proxy;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase.auth.signInWithPassword.mockReset();
  mockSupabase.auth.signInWithOtp.mockReset();
  mockSupabase.auth.verifyOtp.mockReset();
  mockSupabase.auth.signUp.mockReset();
  mockSupabase.auth.signOut.mockReset();
  mockSupabase.from.mockReset?.();
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  } as any);
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }
});

describe('AppContext auth actions', () => {
  test('initiateSignIn sends OTP for Supabase users', async () => {
    const profile = { profile_completed: true, account_type: 'sme' } as any;
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } } as any);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: 'now',
          updated_at: 'now',
          user_metadata: {},
        },
      },
      error: null,
    } as any);
    mockSupabase.auth.signOut.mockResolvedValue({ error: null } as any);
    mockSupabase.auth.signInWithOtp.mockResolvedValue({ data: { user: null, session: null }, error: null } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain(profile) as any);

    const ctx = await renderWithContext();
    const result = await ctx.initiateSignIn('test@example.com', 'password');

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'test@example.com' }));
    expect(result).toEqual({ otpSent: true, offlineState: null });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Verification code sent' }));
  });

  test('initiateSignIn failure throws transformed error and no toast', async () => {
    const error = { message: 'Invalid login credentials' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain() as any);

    const ctx = await renderWithContext();
    await expect(ctx.initiateSignIn('test@example.com', 'bad')).rejects.toThrow('Invalid email or password. Please check your credentials and try again.');
    expect(mockToast).not.toHaveBeenCalled();
  });

  test('verifyOtp completes sign-in and refreshes user state', async () => {
    const profile = { profile_completed: true, account_type: 'sme' } as any;
    mockSupabase.auth.verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: 'now',
          updated_at: 'now',
          user_metadata: { account_type: 'sme', profile_completed: true },
        },
        session: {},
      },
      error: null,
    } as any);
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          created_at: 'now',
          updated_at: 'now',
          user_metadata: { account_type: 'sme', profile_completed: true },
        },
      },
      error: null,
    } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain(profile) as any);

    const ctx = await renderWithContext();
    const result = await ctx.verifyOtp('test@example.com', '123456');

    expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'test@example.com', token: '123456', type: 'email' });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome back!' }));
    expect(result.user).toEqual(expect.objectContaining({ email: 'test@example.com', account_type: 'sme' }));
    expect(result.profile).toEqual(profile);
  });

  test('signUp success inserts profile and shows toast', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          user_metadata: { foo: 'bar' },
        },
      },
      error: null,
    } as any);
    const profileChain = mockProfileChain();
    mockSupabase.from.mockImplementation(() => profileChain as any);

    const ctx = await renderWithContext();
    const result = await ctx.signUp('test@example.com', 'pass', { foo: 'bar' });

    const expectedRedirect = new URL('/signin', window.location.origin).toString();

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      password: 'pass',
      options: expect.objectContaining({
        data: { foo: 'bar' },
        emailRedirectTo: expectedRedirect,
      }),
    }));
    expect(profileChain.insert).toHaveBeenCalledWith(expect.objectContaining({ id: '1', email: 'test@example.com', foo: 'bar' }));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Account created!' }));
    expect(result.user).toEqual(expect.objectContaining({ id: '1', email: 'test@example.com' }));
  });

  test('signUp defers profile creation when auth pending', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: '1',
          email: 'test@example.com',
          user_metadata: {},
        },
      },
      error: null,
    } as any);

    const profileChain = mockProfileChain();
    profileChain.insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'JWT invalid', code: 'PGRST301' } }),
      }),
    });
    mockSupabase.from.mockImplementation(() => profileChain as any);

    const ctx = await renderWithContext();
    await expect(ctx.signUp('test@example.com', 'pass')).resolves.toEqual({ user: expect.any(Object), profile: null });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Account created!' }));
  });

  test('signUp failure throws error and no toast', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    const error = new Error('signup error');
    mockSupabase.auth.signUp.mockResolvedValue({ data: {}, error } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain() as any);

    const ctx = await renderWithContext();
    await expect(ctx.signUp('email', 'pass')).rejects.toThrow('signup error');
    expect(mockToast).not.toHaveBeenCalled();
  });

  test('signOut clears user and shows toast', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '1', email: 'a@test.com', user_metadata: {} } } } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain({ profile_completed: true, account_type: 'basic' }) as any);
    mockSupabase.auth.signOut.mockResolvedValue({ error: null } as any);

    const ctx = await renderWithContext();
    await act(async () => {
      await ctx.signOut();
    });
    await waitFor(() => expect(ctx.user).toBeNull());
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Signed out successfully' }));
  });

  test('signOut failure keeps user and shows error toast', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '1', email: 'a@test.com', user_metadata: {} } } } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain({ profile_completed: true, account_type: 'basic' }) as any);
    mockSupabase.auth.signOut.mockRejectedValue(new Error('logout error'));

    const ctx = await renderWithContext();
    const userBefore = ctx.user;
    await ctx.signOut();
    await waitFor(() => expect(ctx.user).toEqual(userBefore));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error signing out',
      description: 'logout error',
      variant: 'destructive',
    }));
  });

  test('offline admin credentials bypass network sign-in', async () => {
    mockSupabase.auth.signInWithPassword.mockImplementation(() => {
      throw new Error('Network call should be skipped for offline login');
    });

    const ctx = await renderWithContext();
    let result!: Awaited<ReturnType<typeof ctx.initiateSignIn>>;
    await act(async () => {
      result = await ctx.initiateSignIn('admin@wathaci.test', 'AdminPass123!');
    });

    expect(result.otpSent).toBe(false);
    expect(result.offlineState?.user).toEqual(expect.objectContaining({ email: 'admin@wathaci.test' }));
    expect(result.offlineState?.profile).toEqual(expect.objectContaining({ account_type: 'admin' }));
    expect(window.localStorage.getItem('wathaci_offline_session')).toBeTruthy();
    await waitFor(() => expect(ctx.user).toEqual(expect.objectContaining({ email: 'admin@wathaci.test' })));

    mockSupabase.auth.signInWithPassword.mockReset();
  });

  test('refreshUser falls back to offline session when auth fails', async () => {
    const ctx = await renderWithContext();
    await act(async () => {
      await ctx.initiateSignIn('admin@wathaci.test', 'AdminPass123!');
    });

    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('network issue') } as any);

    let refreshed!: Awaited<ReturnType<typeof ctx.refreshUser>>;
    await act(async () => {
      refreshed = await ctx.refreshUser();
    });

    expect(refreshed.user).toEqual(expect.objectContaining({ email: 'admin@wathaci.test' }));
    expect(refreshed.profile).toEqual(expect.objectContaining({ account_type: 'admin' }));
    await waitFor(() => expect(ctx.user).toEqual(expect.objectContaining({ email: 'admin@wathaci.test' })));
  });

  test('refreshUser updates user state', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain() as any);
    const ctx = await renderWithContext();

    const profile = { profile_completed: true, account_type: 'admin' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123', email: 'b@test.com', user_metadata: { account_type: 'admin' } } } } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain(profile) as any);

    await act(async () => {
      await ctx.refreshUser();
    });
    await waitFor(() => expect(ctx.user).toEqual({ id: '123', email: 'b@test.com', ...profile, user_metadata: { account_type: 'admin' } }));
    expect(mockToast).not.toHaveBeenCalled();
  });

  test('refreshUser failure leaves user null', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain() as any);
    const ctx = await renderWithContext();

    mockSupabase.auth.getUser.mockRejectedValue(new Error('network'));
    await ctx.refreshUser();
    await waitFor(() => expect(ctx.user).toBeNull());
    expect(mockToast).not.toHaveBeenCalled();
  });
});
