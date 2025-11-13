import { useEffect, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/lib/logger';

interface UseProfileOptions {
  refreshOnMount?: boolean;
  refreshOnMissing?: boolean;
}

type AppContextValue = ReturnType<typeof useAppContext>;

interface UseProfileResult {
  user: AppContextValue['user'];
  profile: AppContextValue['profile'];
  loading: AppContextValue['loading'];
  refresh: AppContextValue['refreshUser'];
  needsProfile: boolean;
}

const defaultOptions: UseProfileOptions = {
  refreshOnMount: false,
  refreshOnMissing: true,
};

export const useProfile = (options: UseProfileOptions = {}): UseProfileResult => {
  const { refreshOnMount, refreshOnMissing } = { ...defaultOptions, ...options };
  const { user, profile, loading, refreshUser } = useAppContext();

  useEffect(() => {
    if (!refreshOnMount) {
      return;
    }

    const maybePromise = refreshUser();

    if (maybePromise && typeof (maybePromise as PromiseLike<unknown>).catch === 'function') {
      (maybePromise as PromiseLike<unknown>).catch(error => {
        logger.error('useProfile failed to refresh on mount', error, {
          component: 'useProfile',
        });
      });
    }
  }, [refreshOnMount, refreshUser]);

  useEffect(() => {
    if (!refreshOnMissing || loading || !user || profile) {
      return;
    }

    const maybePromise = refreshUser();

    if (maybePromise && typeof (maybePromise as PromiseLike<unknown>).catch === 'function') {
      (maybePromise as PromiseLike<unknown>).catch(error => {
        logger.error('useProfile failed to hydrate missing profile', error, {
          component: 'useProfile',
          userId: user.id,
        });
      });
    }
  }, [refreshOnMissing, loading, profile, refreshUser, user]);

  const needsProfile = useMemo(() => Boolean(user && !profile), [user, profile]);

  return {
    user,
    profile,
    loading,
    refresh: refreshUser,
    needsProfile,
  };
};

export default useProfile;
