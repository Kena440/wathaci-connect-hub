import graceConfig from '../../shared/subscription-window.json';

const { SUBSCRIPTION_GRACE_CUTOFF, SUBSCRIPTION_GRACE_LABEL } = graceConfig;

export { SUBSCRIPTION_GRACE_CUTOFF, SUBSCRIPTION_GRACE_LABEL };

export function getSubscriptionGraceCutoffDate(): Date {
  return new Date(SUBSCRIPTION_GRACE_CUTOFF);
}

export function isSubscriptionTemporarilyDisabled(currentDate: Date = new Date()): boolean {
  return currentDate <= getSubscriptionGraceCutoffDate();
}

export function getSubscriptionGraceBannerText(): string {
  return `Free access: Subscription requirements are temporarily disabled until ${SUBSCRIPTION_GRACE_LABEL}. Create your WATHACI Connect profile now.`;
}

export function getSubscriptionGraceFollowUpText(): string {
  return `Offer valid until ${SUBSCRIPTION_GRACE_LABEL}.`;
}
