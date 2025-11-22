/**
 * Authentication Routes
 * 
 * These routes complement Supabase Auth by providing backend validation
 * and session verification endpoints. The actual sign-up/sign-in is handled
 * by Supabase Auth on the frontend, but these endpoints can be used for:
 * - Session verification
 * - Token validation
 * - User profile retrieval
 */

const express = require('express');
const { verifyAuth } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

/**
 * Get Supabase admin client
 */
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured');
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * GET /auth/me - Get current authenticated user
 * 
 * Returns the current user's information if authenticated.
 * Frontend can use this to restore auth state after page refresh.
 * 
 * Requires: Authorization header with valid JWT token
 * 
 * Response:
 * - 200: { success: true, user: {...}, profile: {...} }
 * - 401: { success: false, error: 'Authentication required' }
 */
router.get('/me', verifyAuth, async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    
    // Get user profile from database
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (profile doesn't exist yet)
      console.error('[GET /auth/me] Error fetching profile:', error);
    }

    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        phone: req.user.phone,
        email_confirmed_at: req.user.email_confirmed_at,
        phone_confirmed_at: req.user.phone_confirmed_at,
        created_at: req.user.created_at,
        updated_at: req.user.updated_at,
      },
      profile: profile || null,
    });
  } catch (error) {
    console.error('[GET /auth/me] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user information',
    });
  }
});

/**
 * GET /auth/session - Verify session validity
 * 
 * Simple endpoint to check if the provided token is valid.
 * 
 * Requires: Authorization header with valid JWT token
 * 
 * Response:
 * - 200: { success: true, valid: true }
 * - 401: { success: false, error: 'Invalid token' }
 */
router.get('/session', verifyAuth, (req, res) => {
  return res.status(200).json({
    success: true,
    valid: true,
    userId: req.userId,
  });
});

/**
 * POST /auth/refresh - Refresh access token
 * 
 * Allows clients to refresh their access token using a refresh token.
 * 
 * Body: { refreshToken: string }
 * 
 * Response:
 * - 200: { success: true, session: {...} }
 * - 400: { success: false, error: 'Refresh token required' }
 * - 401: { success: false, error: 'Invalid refresh token' }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('[POST /auth/refresh] Error refreshing session:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    return res.status(200).json({
      success: true,
      session: data.session,
    });
  } catch (error) {
    console.error('[POST /auth/refresh] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to refresh session',
    });
  }
});

/**
 * POST /auth/verify-email - Resend email verification
 * 
 * Triggers a new email verification email for the authenticated user.
 * 
 * Requires: Authorization header with valid JWT token
 * 
 * Response:
 * - 200: { success: true, message: 'Verification email sent' }
 * - 400: { success: false, error: 'Email already verified' }
 */
router.post('/verify-email', verifyAuth, async (req, res) => {
  try {
    if (req.user.email_confirmed_at) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
      });
    }

    const supabase = getSupabaseClient();
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: req.user.email,
    });

    if (error) {
      console.error('[POST /auth/verify-email] Error resending email:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('[POST /auth/verify-email] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resend verification email',
    });
  }
});

/**
 * GET /auth/status - Public endpoint to check auth system status
 * 
 * Response:
 * - 200: { success: true, configured: true }
 */
router.get('/status', (req, res) => {
  const isConfigured = Boolean(
    process.env.SUPABASE_URL && 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return res.status(200).json({
    success: true,
    configured: isConfigured,
    message: isConfigured 
      ? 'Authentication system is configured and ready'
      : 'Authentication system requires configuration',
  });
});

module.exports = router;
