const express = require('express');
const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');

const router = express.Router();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cachedResponse = null;
let cacheExpiresAt = 0;

const DEFAULT_USER_COUNTS = {
  total_users: 0,
  professionals: 0,
  smes: 0,
  firms: 0,
  companies: 0,
  students: 0,
  others: 0,
};

const DEFAULT_ACTIVITY_METRICS = {
  projects_posted: 0,
  successful_matches: 0,
  messages_sent: 0,
  active_sessions: 0,
  support_queries_resolved: 0,
  signups_last_30_days: 0,
  returning_users: 0,
  platform_revenue: 0,
};

const getSupabaseOrThrow = () => {
  const client = getSupabaseClient();
  if (!client || !isSupabaseConfigured()) {
    const error = new Error('Supabase is not configured');
    error.status = 500;
    throw error;
  }
  return client;
};

const safeCount = async (table, buildQuery) => {
  try {
    const supabase = getSupabaseOrThrow();
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (buildQuery) {
      query = buildQuery(query);
    }
    const { count, error } = await query;
    if (error) {
      console.warn(`[metrics] Failed to count ${table}:`, error.message);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.warn(`[metrics] ${table} unavailable:`, error.message);
    return 0;
  }
};

const fetchUserCounts = async () => {
  try {
    // Individual counts for each account_type
    const professionals = await safeCount('profiles', q => q.eq('account_type', 'professional'));
    const smes = (
      await safeCount('profiles', q => q.eq('account_type', 'sme'))
    ) + (
      await safeCount('profiles', q => q.eq('account_type', 'sole_proprietor'))
    );
    const firms = await safeCount('profiles', q => q.eq('account_type', 'investor'));
    const companies = await safeCount('profiles', q => q.eq('account_type', 'government'));
    const students = await safeCount('profiles', q => q.eq('account_type', 'student'));
    const total_users = await safeCount('profiles');
    const mappedTotal = professionals + smes + firms + companies + students;
    const others = Math.max(total_users - mappedTotal, 0);

    return {
      total_users,
      professionals,
      smes,
      firms,
      companies,
      students,
      others,
    };
  } catch (error) {
    console.warn('[metrics] Failed to fetch user counts:', error.message);
    return DEFAULT_USER_COUNTS;
  }
};

const fetchActivityMetrics = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [
    projects_posted,
    successful_matches,
    messages_sent,
    signups_last_30_days,
    platform_revenue,
  ] = await Promise.all([
    safeCount('marketplace_orders'),
    safeCount('transactions', (query) => query.eq('status', 'completed')),
    safeCount('audit_logs', (query) => query.eq('table_name', 'messages')),
    safeCount('profiles', (query) => query.gte('created_at', thirtyDaysAgo)),
    (async () => {
      try {
        const client = getSupabaseOrThrow();
        const { data, error } = await client
          .from('transactions')
          .select('amount')
          .eq('status', 'completed');

        if (error) {
          console.warn('[metrics] Failed to load revenue:', error.message);
          return 0;
        }

        return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
      } catch (error) {
        console.warn('[metrics] Revenue unavailable:', error.message);
        return 0;
      }
    })(),
  ]);

  const returning_users = await (async () => {
    try {
      const client = getSupabaseOrThrow();
      const { data, error } = await client
        .from('audit_logs')
        .select('user_id')
        .eq('action_type', 'login')
        .gte('created_at', thirtyDaysAgo);

      if (error) {
        console.warn('[metrics] Failed to load returning users:', error.message);
        return 0;
      }

      const uniqueUserIds = new Set((data || []).map((row) => row.user_id).filter(Boolean));
      return uniqueUserIds.size;
    } catch (error) {
      console.warn('[metrics] Returning users unavailable:', error.message);
      return 0;
    }
  })();

  const active_sessions = await (async () => {
    try {
      const client = getSupabaseOrThrow();
      const { data, error } = await client
        .from('audit_logs')
        .select('user_id')
        .eq('action_type', 'login')
        .gte('created_at', twentyFourHoursAgo);

      if (error) {
        console.warn('[metrics] Active sessions lookup failed:', error.message);
        return 0;
      }

      const uniqueUserIds = new Set((data || []).map((row) => row.user_id).filter(Boolean));
      return uniqueUserIds.size;
    } catch (error) {
      console.warn('[metrics] Active sessions unavailable:', error.message);
      return 0;
    }
  })();

  const support_queries_resolved = await (async () => {
    try {
      const client = getSupabaseOrThrow();
      const { count, error } = await client
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('table_name', 'support_tickets')
        .eq('action_type', 'update');

      if (error) {
        console.warn('[metrics] Support query lookup failed:', error.message);
        return 0;
      }

      return count ?? 0;
    } catch (error) {
      console.warn('[metrics] Support queries unavailable:', error.message);
      return 0;
    }
  })();

  return {
    projects_posted,
    successful_matches,
    messages_sent,
    active_sessions,
    support_queries_resolved,
    signups_last_30_days,
    returning_users,
    platform_revenue,
  };
};

const getImpactGrowthMetrics = async () => {
  if (cachedResponse && cacheExpiresAt > Date.now()) {
    return cachedResponse;
  }

  const [user_counts, activity_metrics] = await Promise.all([
    fetchUserCounts(),
    fetchActivityMetrics(),
  ]);

  cachedResponse = { user_counts, activity_metrics };
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedResponse;
};

router.get('/impact-growth', async (req, res) => {
  try {
    const metrics = await getImpactGrowthMetrics();
    res.json(metrics);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      error: status === 500 ? 'Failed to load metrics' : error.message,
      user_counts: DEFAULT_USER_COUNTS,
      activity_metrics: DEFAULT_ACTIVITY_METRICS,
    });
  }
});

module.exports = router;
