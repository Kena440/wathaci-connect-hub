const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');

const parseToken = req => {
  const header = req.headers.authorization || req.headers.Authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.replace('Bearer ', '').trim();
  }
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) return cookieToken;
  return null;
};

module.exports = async function requireAuth(req, res, next) {
  try {
    const token = parseToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    if (!isSupabaseConfigured()) {
      // allow tests to stub authentication
      req.user = { id: req.headers['x-user-id'] || 'test-user', email: 'masked@example.com' };
      req.userId = req.user.id;
      return next();
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(503).json({ error: 'Auth service unavailable' });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = data.user;
    req.userId = data.user.id;
    return next();
  } catch (err) {
    console.error('[requireAuth] failed', err.message);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};
