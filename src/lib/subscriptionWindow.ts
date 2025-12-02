const GRACE_CUTOFF_ISO = '2026-01-04T23:59:59+02:00';
const GRACE_LABEL = '4 January 2026 (Africa/Lusaka)';

export const SUBSCRIPTION_GRACE_CUTOFF = GRACE_CUTOFF_ISO;
export const SUBSCRIPTION_GRACE_LABEL = GRACE_LABEL;

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
