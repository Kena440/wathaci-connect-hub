import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';
import { supabase } from '@/lib/supabase-enhanced';
import { toast } from '@/components/ui/use-toast';

jest.mock('@/lib/supabase-enhanced', () => {
  const auth = {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  };
  return {
    supabase: { auth, from: jest.fn() },
    withErrorHandling: async (operation: any) => {
      const result = await operation();
      return { data: result.data ?? null, error: result.error ?? null };
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
  return ctx!;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  } as any);
});

describe('AppContext auth actions', () => {
  test('signIn success triggers toast', async () => {
    const profile = { profile_completed: true, account_type: 'sme' } as any;
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } } as any);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
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
    } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain(profile) as any);

    const ctx = await renderWithContext();
    const result = await ctx.signIn('test@example.com', 'password');

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Welcome back!',
      description: 'You have been signed in successfully.',
    }));
    expect(result.user).toEqual(expect.objectContaining({ id: 'user-123', email: 'test@example.com' }));
    expect(result.profile).toEqual(profile);
  });

  test('signIn failure throws error and no toast', async () => {
    const error = new Error('Invalid');
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain() as any);

    const ctx = await renderWithContext();
    await expect(ctx.signIn('test@example.com', 'bad')).rejects.toThrow('Invalid');
    expect(mockToast).not.toHaveBeenCalled();
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

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      password: 'pass',
      options: { data: { foo: 'bar' } },
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
    await ctx.signOut();
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

  test('refreshUser updates user state', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain() as any);
    const ctx = await renderWithContext();

    const profile = { profile_completed: true, account_type: 'admin' };
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: '123', email: 'b@test.com', user_metadata: { account_type: 'admin' } } } } as any);
    mockSupabase.from.mockImplementation(() => mockProfileChain(profile) as any);

    await ctx.refreshUser();
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
