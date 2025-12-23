import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';
import type { Profile, User } from '@/@types/database';
import { logger } from '@/lib/logger';

type UseProfileOptions = {
  /** Automatically refresh on mount. Default: true */
  refreshOnMount?: boolean;
  /** Attempt to bootstrap a missing profile once. Default: true */
  refreshOnMissing?: boolean;
  /** Timeout (ms) to avoid infinite loading states. Default: 12000 */
  timeoutMs?: number;
};

interface UseProfileResult {
  loading: boolean;
  profile: Profile | null;
  user: User | null;
  needsProfile: boolean;
  error: Error | null;
  refresh: () => Promise<{ user: User | null; profile: Profile | null }>;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Profile request timed out')), timeoutMs)),
  ]);
};

const buildEnsureProfilePayload = (user: User) => {
  const metadata = user.user_metadata || {};
  const fullName =
    metadata.full_name ||
    (metadata.first_name && metadata.last_name
      ? `${metadata.first_name} ${metadata.last_name}`.trim()
      : undefined);

  const msisdn =
    metadata.msisdn ||
    metadata.payment_phone ||
    metadata.phone ||
    metadata.mobile_number ||
    null;

  return {
    p_user_id: user.id,
    p_email: user.email ?? null,
    p_full_name: fullName ?? null,
    p_msisdn: typeof msisdn === 'string' ? msisdn : null,
    p_profile_type: metadata.profile_type ?? 'customer',
    p_account_type: metadata.account_type ?? null,
    p_phone: typeof metadata.phone === 'string' ? metadata.phone : msisdn,
    p_company_name: metadata.company_name ?? metadata.company ?? metadata.business_name ?? null,
  };
};

const fetchProfile = async (userId: string, timeoutMs: number): Promise<Profile | null> => {
  const { data, error } = await withTimeout(
    supabase.from('profiles').select('*').eq('id', userId).single(),
    timeoutMs,
  );

  if (error) {
    throw error;
  }

  return data as Profile;
};

const ensureProfile = async (user: User, timeoutMs: number): Promise<Profile | null> => {
  const payload = buildEnsureProfilePayload(user);
  const { error: ensureError } = await withTimeout(
    supabase.rpc('ensure_profile_exists', payload),
    timeoutMs,
  );

  if (ensureError) {
    logger.error('Failed to ensure profile exists', ensureError, {
      component: 'useProfile.ensureProfile',
      userId: user.id,
    });
    throw ensureError;
  }

  return fetchProfile(user.id, timeoutMs);
};

export function useProfile(options: UseProfileOptions = {}): UseProfileResult {
  const { refreshOnMount = true, refreshOnMissing = true, timeoutMs = 12000 } = options;
  const { user: contextUser, profile: contextProfile, loading: contextLoading, refreshUser } = useAppContext();

  const [state, setState] = useState<{ user: User | null; profile: Profile | null; loading: boolean; error: Error | null }>(
    {
      user: contextUser ?? null,
      profile: contextProfile ?? null,
      loading: contextLoading,
      error: null,
    },
  );

  const isRefreshingRef = useRef(false);

  useEffect(() => {
    setState(prev => ({
      ...prev,
      user: contextUser ?? prev.user,
      profile: contextProfile ?? prev.profile,
      loading: contextLoading && !isRefreshingRef.current,
    }));
  }, [contextUser, contextProfile, contextLoading]);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return { user: state.user ?? contextUser ?? null, profile: state.profile ?? contextProfile ?? null };
    }

    isRefreshingRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { user: latestUser, profile: latestProfile } = await withTimeout(refreshUser(), timeoutMs);

      let resolvedProfile = latestProfile ?? null;

      if (latestUser && !resolvedProfile && refreshOnMissing) {
        try {
          resolvedProfile = await ensureProfile(latestUser, timeoutMs);
        } catch (bootstrapError: any) {
          setState(prev => ({ ...prev, error: bootstrapError instanceof Error ? bootstrapError : new Error(String(bootstrapError)) }));
          logger.warn('Profile missing after refresh; bootstrap failed', bootstrapError, {
            component: 'useProfile',
            userId: latestUser.id,
          });
        }
      }

      setState({
        user: latestUser ?? null,
        profile: resolvedProfile ?? null,
        loading: false,
        error: null,
      });

      return { user: latestUser ?? null, profile: resolvedProfile ?? null };
    } catch (err: any) {
      const normalizedError = err instanceof Error ? err : new Error(String(err));
      setState(prev => ({ ...prev, error: normalizedError, loading: false }));
      logger.error('Failed to refresh profile', normalizedError, { component: 'useProfile' });
      return { user: state.user ?? contextUser ?? null, profile: state.profile ?? contextProfile ?? null };
    } finally {
      isRefreshingRef.current = false;
    }
  }, [contextProfile, contextUser, refreshOnMissing, refreshUser, state.profile, state.user, timeoutMs]);

  useEffect(() => {
    if (!refreshOnMount) return;
    if (contextLoading) return;

    void refresh();
  }, [refreshOnMount, contextLoading, refresh]);

  const needsProfile = useMemo(
    () => Boolean((state.user ?? contextUser) && !(state.profile ?? contextProfile) && !state.loading),
    [contextProfile, contextUser, state.loading, state.profile, state.user],
  );

  const loading = state.loading || contextLoading || isRefreshingRef.current;
  const user = state.user ?? contextUser ?? null;
  const profile = state.profile ?? contextProfile ?? null;
  const error = state.error;

  return { loading, profile, user, needsProfile, error, refresh };
}
