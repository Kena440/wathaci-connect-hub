// TEMPORARY: Subscription gating bypass for Funding/Compliance/Credit analysis
// TODO: Disable this bypass after debugging is complete.
export const SUBSCRIPTION_DEBUG_BYPASS_ENABLED = true;

// Normalize feature keys to lowercase when checking against this set
export const SUBSCRIPTION_BYPASS_FEATURES = new Set([
  'funding hub',
  'funding-hub',
  'compliance hub',
  'compliance',
  'credit passport',
  'credit-passport',
]);

