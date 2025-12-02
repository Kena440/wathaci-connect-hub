import { subscriptionService } from '@/lib/services';
import { isSubscriptionTemporarilyDisabled } from '@/lib/subscriptionWindow';

export type ServiceAccessChannel = 'grace-period' | 'subscription';

export interface ServiceAccessResult {
  accessGranted: boolean;
  via?: ServiceAccessChannel;
}

export async function ensureServiceAccess(userId?: string): Promise<ServiceAccessResult> {
  if (isSubscriptionTemporarilyDisabled()) {
    return { accessGranted: true, via: 'grace-period' };
  }

  if (!userId) {
    const error = new Error('Subscription required');
    (error as any).code = 'SUBSCRIPTION_REQUIRED';
    throw error;
  }

  const { data, error } = await subscriptionService.hasActiveSubscription(userId);

  if (error) {
    throw error;
  }

  if (!data) {
    const error = new Error('Subscription required');
    (error as any).code = 'SUBSCRIPTION_REQUIRED';
    throw error;
  }

  return { accessGranted: true, via: 'subscription' };
}
