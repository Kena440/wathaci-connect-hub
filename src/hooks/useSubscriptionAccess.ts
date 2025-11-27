import { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { subscriptionService } from '@/lib/services';

interface SubscriptionAccessState {
  isSubscribed: boolean;
  isAuthenticated: boolean;
  loading: boolean;
}

export const useSubscriptionAccess = (): SubscriptionAccessState => {
  const { user } = useAppContext();
  const [state, setState] = useState<SubscriptionAccessState>({
    isSubscribed: false,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const checkSubscription = async () => {
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
  }, [user]);

  return state;
};

