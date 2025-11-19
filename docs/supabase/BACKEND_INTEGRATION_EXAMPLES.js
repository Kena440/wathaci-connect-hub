/**
 * Backend API Integration Examples
 * 
 * This file demonstrates how to integrate Supabase with the backend API.
 * Uses the service role key for admin operations that bypass RLS.
 * 
 * IMPORTANT: Never expose the service role key to the frontend!
 */

const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
  );
}

/**
 * Admin client with service role access
 * Bypasses RLS policies - use with caution!
 */
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get a user profile by ID (admin access)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profile
 * 
 * @example
 * const profile = await getUserProfile('user-uuid');
 */
async function getUserProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  return data;
}

/**
 * Get all users with pagination
 * 
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.perPage - Results per page
 * @param {string} options.accountType - Filter by account type
 * @returns {Promise<Object>} Users and pagination info
 * 
 * @example
 * const result = await getAllUsers({ page: 1, perPage: 50, accountType: 'SME' });
 */
async function getAllUsers(options = {}) {
  const {
    page = 1,
    perPage = 50,
    accountType = null,
  } = options;

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (accountType) {
    query = query.eq('account_type', accountType);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to get users: ${error.message}`);
  }

  return {
    users: data,
    pagination: {
      page,
      perPage,
      total: count,
      totalPages: Math.ceil(count / perPage),
    },
  };
}

/**
 * Update a user profile (admin access)
 * 
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>} Updated profile
 * 
 * @example
 * const updated = await updateUserProfile('user-uuid', {
 *   profile_completed: true,
 *   account_type: 'SME'
 * });
 */
async function updateUserProfile(userId, updates) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}

/**
 * Delete a user and all related data (admin access)
 * 
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 * 
 * @example
 * await deleteUser('user-uuid');
 */
async function deleteUser(userId) {
  // Delete from auth.users - this will cascade to profiles and all related tables
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Create a new subscription plan
 * 
 * @param {Object} plan - Subscription plan data
 * @returns {Promise<Object>} Created plan
 * 
 * @example
 * const plan = await createSubscriptionPlan({
 *   name: 'Premium',
 *   price: '₦50,000',
 *   period: 'monthly',
 *   lenco_amount: 50000,
 *   category: 'business',
 *   features: ['Feature 1', 'Feature 2'],
 *   user_types: ['SME', 'investor']
 * });
 */
async function createSubscriptionPlan(plan) {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .insert(plan)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create subscription plan: ${error.message}`);
  }

  return data;
}

/**
 * Get user's active subscription
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Active subscription or null
 * 
 * @example
 * const subscription = await getUserActiveSubscription('user-uuid');
 */
async function getUserActiveSubscription(userId) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*, subscription_plans(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No active subscription
    }
    throw new Error(`Failed to get subscription: ${error.message}`);
  }

  return data;
}

/**
 * Create a new user subscription
 * 
 * @param {Object} subscription - Subscription data
 * @returns {Promise<Object>} Created subscription
 * 
 * @example
 * const sub = await createUserSubscription({
 *   user_id: 'user-uuid',
 *   plan_id: 'plan-uuid',
 *   status: 'pending',
 *   payment_status: 'pending'
 * });
 */
async function createUserSubscription(subscription) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .insert(subscription)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create subscription: ${error.message}`);
  }

  return data;
}

/**
 * Update a user subscription
 * 
 * @param {string} subscriptionId - Subscription ID
 * @param {Object} updates - Subscription updates
 * @returns {Promise<Object>} Updated subscription
 * 
 * @example
 * const updated = await updateUserSubscription('sub-uuid', {
 *   status: 'active',
 *   payment_status: 'paid',
 *   start_date: new Date().toISOString()
 * });
 */
async function updateUserSubscription(subscriptionId, updates) {
  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  return data;
}

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

/**
 * Create a payment record
 * 
 * @param {Object} payment - Payment data
 * @returns {Promise<Object>} Created payment
 * 
 * @example
 * const payment = await createPayment({
 *   user_id: 'user-uuid',
 *   amount: 50000,
 *   currency: 'NGN',
 *   status: 'pending',
 *   payment_method: 'card',
 *   provider: 'lenco',
 *   reference: 'unique-ref'
 * });
 */
async function createPayment(payment) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .insert(payment)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create payment: ${error.message}`);
  }

  return data;
}

/**
 * Update payment status
 * 
 * @param {string} paymentId - Payment ID
 * @param {string} status - New status
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Updated payment
 * 
 * @example
 * const updated = await updatePaymentStatus('payment-uuid', 'success', {
 *   paid_at: new Date().toISOString(),
 *   gateway_response: 'Payment successful'
 * });
 */
async function updatePaymentStatus(paymentId, status, metadata = {}) {
  const updates = {
    status,
    ...metadata,
  };

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update(updates)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update payment: ${error.message}`);
  }

  return data;
}

/**
 * Get payment by reference
 * 
 * @param {string} reference - Payment reference
 * @returns {Promise<Object|null>} Payment or null
 * 
 * @example
 * const payment = await getPaymentByReference('lenco-ref-123');
 */
async function getPaymentByReference(reference) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get payment: ${error.message}`);
  }

  return data;
}

// ============================================================================
// WEBHOOK LOGGING
// ============================================================================

/**
 * Log a webhook event
 * 
 * @param {Object} webhook - Webhook data
 * @returns {Promise<Object>} Created webhook log
 * 
 * @example
 * await logWebhook({
 *   event_type: 'payment.success',
 *   reference: 'lenco-ref-123',
 *   status: 'processed',
 *   payload: webhookData
 * });
 */
async function logWebhook(webhook) {
  const { data, error } = await supabaseAdmin
    .from('webhook_logs')
    .insert(webhook)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to log webhook: ${error.message}`);
  }

  return data;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Create an audit log entry
 * 
 * @param {Object} log - Audit log data
 * @returns {Promise<Object>} Created audit log
 * 
 * @example
 * await createAuditLog({
 *   user_id: 'user-uuid',
 *   action_type: 'update',
 *   table_name: 'profiles',
 *   record_id: 'user-uuid',
 *   old_data: { status: 'inactive' },
 *   new_data: { status: 'active' }
 * });
 */
async function createAuditLog(log) {
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .insert(log)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`);
  }

  return data;
}

/**
 * Get user audit logs
 * 
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Audit logs
 * 
 * @example
 * const logs = await getUserAuditLogs('user-uuid', { limit: 100 });
 */
async function getUserAuditLogs(userId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }

  return data;
}

// ============================================================================
// STATISTICS & REPORTS
// ============================================================================

/**
 * Get user statistics
 * 
 * @returns {Promise<Object>} User statistics
 * 
 * @example
 * const stats = await getUserStatistics();
 * console.log(`Total users: ${stats.total}`);
 */
async function getUserStatistics() {
  // Get total users
  const { count: totalUsers } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Get users by account type
  const { data: byType } = await supabaseAdmin
    .from('profiles')
    .select('account_type')
    .not('account_type', 'is', null);

  const accountTypeCounts = {};
  byType.forEach((profile) => {
    accountTypeCounts[profile.account_type] =
      (accountTypeCounts[profile.account_type] || 0) + 1;
  });

  // Get recently registered users (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: recentUsers } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());

  return {
    total: totalUsers,
    byAccountType: accountTypeCounts,
    recentlyRegistered: recentUsers,
  };
}

/**
 * Get payment statistics
 * 
 * @returns {Promise<Object>} Payment statistics
 * 
 * @example
 * const stats = await getPaymentStatistics();
 */
async function getPaymentStatistics() {
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('status, amount, currency');

  const stats = {
    total: payments.length,
    successful: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
    byCurrency: {},
  };

  payments.forEach((payment) => {
    if (payment.status === 'success') stats.successful++;
    else if (payment.status === 'pending') stats.pending++;
    else if (payment.status === 'failed') stats.failed++;

    if (payment.status === 'success') {
      stats.totalAmount += payment.amount;
      stats.byCurrency[payment.currency] =
        (stats.byCurrency[payment.currency] || 0) + payment.amount;
    }
  });

  return stats;
}

// ============================================================================
// EXPRESS.JS ROUTE EXAMPLES
// ============================================================================

/**
 * Example Express.js routes using these functions
 * 
 * Add these to your backend/routes/users.js or similar
 */

const expressExamples = `
const express = require('express');
const router = express.Router();

// Get user profile
router.get('/users/:userId', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const { page, perPage, accountType } = req.query;
    const result = await getAllUsers({
      page: parseInt(page) || 1,
      perPage: parseInt(perPage) || 50,
      accountType,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user profile
router.put('/users/:userId', async (req, res) => {
  try {
    const updated = await updateUserProfile(req.params.userId, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user audit logs
router.get('/users/:userId/audit-logs', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const logs = await getUserAuditLogs(req.params.userId, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
router.get('/admin/statistics', async (req, res) => {
  try {
    const [userStats, paymentStats] = await Promise.all([
      getUserStatistics(),
      getPaymentStatistics(),
    ]);
    res.json({
      success: true,
      data: {
        users: userStats,
        payments: paymentStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
`;

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  supabaseAdmin,
  
  // User management
  getUserProfile,
  getAllUsers,
  updateUserProfile,
  deleteUser,
  
  // Subscription management
  createSubscriptionPlan,
  getUserActiveSubscription,
  createUserSubscription,
  updateUserSubscription,
  
  // Payment management
  createPayment,
  updatePaymentStatus,
  getPaymentByReference,
  
  // Logging
  logWebhook,
  createAuditLog,
  getUserAuditLogs,
  
  // Statistics
  getUserStatistics,
  getPaymentStatistics,
};
