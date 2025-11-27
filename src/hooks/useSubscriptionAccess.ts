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
        setState({
          isSubscribed: true,
          isAuthenticated: Boolean(user),
          loading: false,
        });
        return;
      }

      if (!user) {
        if (isMounted) {
          setState({ isSubscribed: false, isAuthenticated: false, loading: false });
        }
        return;
      }

      const { data, error } = await subscriptionService.hasActiveSubscription(user.id);
      if (!isMounted) return;

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

