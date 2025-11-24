const { getSupabaseClient } = require('../lib/supabaseAdmin');

const parseBearerToken = (req) => {
  const authHeader = req.headers?.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim();
};

const requireSubscription = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase is required to verify subscriptions.' });
    }

    const accessToken = parseBearerToken(req);
    if (!accessToken) {
      return res.status(401).json({ error: 'Authorization bearer token is required.' });
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser(accessToken);
    const user = userResult?.user;

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    const nowIso = new Date().toISOString();
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .select('id, status, end_date')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .or(`end_date.is.null,end_date.gt.${nowIso}`)
      .order('end_date', { ascending: false })
      .limit(1);

    if (subscriptionError) {
      console.error('[subscription] Failed to verify access', subscriptionError);
      return res.status(500).json({ error: 'Unable to verify subscription access.' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(403).json({ error: 'An active subscription is required to use diagnostics.' });
    }

    req.user = user;
    req.subscription = subscriptions[0];
    return next();
  } catch (error) {
    console.error('[subscription] Unexpected error verifying access', error);
    return res.status(500).json({ error: 'Failed to verify subscription access.' });
  }
};

module.exports = { requireSubscription };
