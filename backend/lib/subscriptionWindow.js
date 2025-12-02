const graceConfig = require('../../shared/subscription-window.json');

const { SUBSCRIPTION_GRACE_CUTOFF, SUBSCRIPTION_GRACE_LABEL } = graceConfig;

function getSubscriptionGraceCutoffDate() {
  return new Date(SUBSCRIPTION_GRACE_CUTOFF);
}

function isSubscriptionTemporarilyDisabled(currentDate = new Date()) {
  return currentDate <= getSubscriptionGraceCutoffDate();
}

function getSubscriptionGraceBannerText() {
  return `Free access: Subscription requirements are temporarily disabled until ${SUBSCRIPTION_GRACE_LABEL}. Create your WATHACI Connect profile now.`;
}

function getSubscriptionGraceFollowUpText() {
  return `Offer valid until ${SUBSCRIPTION_GRACE_LABEL}.`;
}

module.exports = {
  SUBSCRIPTION_GRACE_CUTOFF,
  SUBSCRIPTION_GRACE_LABEL,
  getSubscriptionGraceCutoffDate,
  isSubscriptionTemporarilyDisabled,
  getSubscriptionGraceBannerText,
  getSubscriptionGraceFollowUpText,
};
