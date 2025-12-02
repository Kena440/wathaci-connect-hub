const { getSupabaseClient, isSupabaseConfigured } = require('./supabaseAdmin');
const { isSubscriptionTemporarilyDisabled } = require('./subscriptionWindow');

class SubscriptionRequiredError extends Error {
  constructor(message = 'Subscription required') {
    super(message);
    this.name = 'SubscriptionRequiredError';
    this.status = 402;
  }
}

class MissingUserError extends Error {
  constructor(message = 'user_id is required for access checks') {
    super(message);
    this.name = 'MissingUserError';
    this.status = 400;
  }
}

async function ensureServiceAccess(userId) {
  if (!userId) {
    throw new MissingUserError();
  }

  if (isSubscriptionTemporarilyDisabled()) {
    return { accessGranted: true, via: 'grace-period' };
  }

  if (!isSupabaseConfigured()) {
    // Avoid blocking legitimate access when Supabase is not available; existing monitoring covers config gaps
    return { accessGranted: true, via: 'config-bypass' };
  }

  const supabase = getSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('end_date', nowIso)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    error.status = error.status ?? 500;
    throw error;
  }

  if (!data) {
    throw new SubscriptionRequiredError();
  }

  return { accessGranted: true, via: 'subscription' };
}

module.exports = {
  ensureServiceAccess,
  MissingUserError,
  SubscriptionRequiredError,
};
