import { renderHook } from '@testing-library/react';
import type { User, Profile } from '@/@types/database';
import { useProfile } from '../useProfile';

const mockRefreshUser = jest.fn();

const mockContext: {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
} = {
  user: null,
  profile: null,
  loading: false,
};

jest.mock('@/contexts/AppContext', () => ({
  useAppContext: () => ({
    user: mockContext.user,
    profile: mockContext.profile,
    loading: mockContext.loading,
    refreshUser: mockRefreshUser,
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('useProfile', () => {
  beforeEach(() => {
    mockContext.user = null;
    mockContext.profile = null;
    mockContext.loading = false;
    mockRefreshUser.mockReset();
    mockRefreshUser.mockResolvedValue({ user: null, profile: null });
  });

  it('returns context values', () => {
    mockContext.user = { id: 'user-1' } as User;
    mockContext.profile = { id: 'user-1', profile_completed: true } as Profile;

    const { result } = renderHook(() => useProfile({ refreshOnMount: false }));

    expect(result.current.user).toBe(mockContext.user);
    expect(result.current.profile).toBe(mockContext.profile);
    expect(result.current.loading).toBe(false);
    expect(result.current.needsProfile).toBe(false);
  });

  it('triggers refresh when profile missing and loading completed', () => {
    mockContext.user = { id: 'user-2' } as User;
    mockContext.profile = null;
    mockContext.loading = false;
    mockRefreshUser.mockResolvedValue({ user: mockContext.user, profile: mockContext.profile });

    renderHook(() => useProfile({ refreshOnMount: false, refreshOnMissing: true }));

    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
  });

  it('does not trigger refresh when loading', () => {
    mockContext.user = { id: 'user-3' } as User;
    mockContext.profile = null;
    mockContext.loading = true;
    mockRefreshUser.mockResolvedValue({ user: mockContext.user, profile: mockContext.profile });

    renderHook(() => useProfile({ refreshOnMount: false, refreshOnMissing: true }));

    expect(mockRefreshUser).not.toHaveBeenCalled();
  });
});
