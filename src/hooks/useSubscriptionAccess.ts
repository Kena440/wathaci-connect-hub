import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { subscriptionService } from '@/lib/services';
import {
  SUBSCRIPTION_BYPASS_FEATURES,
  SUBSCRIPTION_DEBUG_BYPASS_ENABLED,
} from '@/config/subscriptionDebug';

interface SubscriptionAccessState {
  isSubscribed: boolean;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useSubscriptionAccess = (featureKey?: string): SubscriptionAccessState => {
  const { user } = useAppContext();
  const [state, setState] = useState<SubscriptionAccessState>({
    isSubscribed: false,
    isAuthenticated: false,
    loading: true,
  });

  const bypassActive = useMemo(() => {
    if (!SUBSCRIPTION_DEBUG_BYPASS_ENABLED || !featureKey) return false;
    return SUBSCRIPTION_BYPASS_FEATURES.has(featureKey.toLowerCase());
  }, [featureKey]);

  useEffect(() => {
    let isMounted = true;

    const checkSubscription = async () => {
      if (bypassActive) {
        // TEMPORARY: Treat target features as subscribed for analysis
        console.log('[subscription-debug] Bypass active for feature', {
          featureKey,
          pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        });
        setState({
          isSubscribed: true,
          isAuthenticated: Boolean(user),
          loading: false,
        });
        return;
      }

      if (!user) {
        console.log('[subscription-debug] No user while checking subscription', {
          featureKey,
          pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        });
        if (isMounted) {
          setState({ isSubscribed: false, isAuthenticated: false, loading: false });
        }
        return;
      }

      const { data, error } = await subscriptionService.hasActiveSubscription(user.id);
      if (!isMounted) return;

      console.log('[subscription-debug] Subscription lookup complete', {
        featureKey,
        hasActiveSubscription: !!data && !error,
        error,
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      });

      setState({
        isSubscribed: !!data && !error,
        isAuthenticated: true,
        loading: false,
      });
    };

    void checkSubscription();

    return () => {
      isMounted = false;
    };
  }, [bypassActive, user]);

  return state;
};

