-- Migration: Create efficient counting functions for metrics
-- Purpose: Provide database-level COUNT(DISTINCT user_id) operations for metrics queries
-- to avoid loading all rows into memory and processing in JavaScript

-- Add composite index for efficient login user count queries
-- This optimizes the query pattern: filter by action_type, filter by created_at, count distinct user_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_login_metrics
  ON public.audit_logs (action_type, created_at, user_id)
  WHERE action_type = 'login';

-- Function to count distinct users who logged in within a time period
-- Used for active_sessions (24h) and returning_users (30d) metrics
-- Note: Uses SECURITY DEFINER to allow aggregate metrics calculation across all users.
-- This is intentional as the function only returns a count (no individual user data)
-- and is called from backend code that already uses the service role.
CREATE OR REPLACE FUNCTION public.count_distinct_login_users(
  since_timestamp timestamptz
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(DISTINCT user_id)
  FROM public.audit_logs
  WHERE action_type = 'login'
    AND created_at >= since_timestamp
    AND user_id IS NOT NULL;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.count_distinct_login_users(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_distinct_login_users(timestamptz) TO service_role;
