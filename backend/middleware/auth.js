/**
 * Authentication Middleware for Supabase JWT Verification
 * 
 * Verifies JWT tokens issued by Supabase for protected routes.
 * Attaches user information to req.user if authentication succeeds.
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Get Supabase client for JWT verification
 */
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for auth middleware');
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Extract JWT token from Authorization header
 * 
 * @param {object} req - Express request object
 * @returns {string|null} JWT token or null if not found
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer TOKEN" and "TOKEN" formats
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  
  // Assume the entire header is the token
  return authHeader;
};

/**
 * Middleware to verify Supabase JWT and attach user to request
 * 
 * Usage:
 * ```javascript
 * const { verifyAuth } = require('./middleware/auth');
 * 
 * router.get('/protected', verifyAuth, (req, res) => {
 *   // Access authenticated user via req.user
 *   res.json({ user: req.user });
 * });
 * ```
 */
const verifyAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
    }

    const supabase = getSupabaseClient();
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('[auth middleware] Token verification failed:', error?.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please sign in again.',
      });
    }

    // Attach user to request for downstream handlers
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('[auth middleware] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication verification failed.',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without user
      return next();
    }

    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.user = user;
      req.userId = user.id;
    }
    
    next();
  } catch (error) {
    // Log error but continue without authentication
    console.warn('[auth middleware] Optional auth failed:', error);
    next();
  }
};

module.exports = {
  verifyAuth,
  optionalAuth,
  extractToken,
};
