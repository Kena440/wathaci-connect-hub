import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  SUBSCRIPTION_BYPASS_FEATURES,
  SUBSCRIPTION_DEBUG_BYPASS_ENABLED,
} from '@/config/subscriptionDebug';
import { ensureServiceAccess } from '@/lib/ensureServiceAccess';

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

      try {
        const accessResult = await ensureServiceAccess(user.id);
        if (!isMounted) return;

        setState({
          isSubscribed: accessResult.accessGranted,
          isAuthenticated: true,
          loading: false,
        });
      } catch (error: any) {
        if (!isMounted) return;

        if (error?.code === 'SUBSCRIPTION_REQUIRED') {
          setState({ isSubscribed: false, isAuthenticated: true, loading: false });
          return;
        }

        setState({ isSubscribed: false, isAuthenticated: true, loading: false });
      }
    };

    void checkSubscription();

    return () => {
      isMounted = false;
    };
  }, [bypassActive, user]);

  return state;
};

