-- ============================================================================
-- Blocked Signup Monitoring and Management
-- ============================================================================
-- This migration adds comprehensive monitoring and management tools for
-- blocked signup attempts tracked in auth.audit_log_entries.
--
-- Features:
-- 1. Views to analyze blocked signup patterns
-- 2. Functions to check if an email is currently rate-limited
-- 3. Utilities to detect and investigate blocking issues
-- 4. Monitoring queries for admin dashboards
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create comprehensive blocked signup analysis views
-- ============================================================================

-- View: All blocked signup attempts with cleaned data
CREATE OR REPLACE VIEW public.v_blocked_signups AS
SELECT
  a.id AS audit_id,
  a.created_at AS blocked_at,
  a.payload->>'action' AS action,
  a.payload->>'actor_id' AS actor_id_internal,
  regexp_replace(a.payload->>'actor_username', ' \\[blocked\\]$', '') AS email,
  a.payload->>'actor_username' AS actor_username_raw,
  a.payload->>'ip_address' AS ip_address,
  a.payload->>'log_type' AS log_type,
  a.payload->'traits'->>'provider' AS provider
FROM auth.audit_log_entries a
WHERE a.payload->>'actor_username' LIKE '%[blocked]%'
ORDER BY a.created_at DESC;

COMMENT ON VIEW public.v_blocked_signups IS 
  'Shows all blocked signup attempts from audit logs with cleaned email addresses and metadata.';

-- View: Blocked signup summary by email
CREATE OR REPLACE VIEW public.v_blocked_signups_by_email AS
SELECT
  email,
  COUNT(*) AS total_blocked_attempts,
  MIN(blocked_at) AS first_blocked_at,
  MAX(blocked_at) AS last_blocked_at,
  EXTRACT(EPOCH FROM (MAX(blocked_at) - MIN(blocked_at))) AS blocking_duration_seconds,
  array_agg(DISTINCT action ORDER BY action) AS blocked_actions,
  array_agg(DISTINCT ip_address) FILTER (WHERE ip_address IS NOT NULL) AS ip_addresses,
  COUNT(DISTINCT ip_address) AS unique_ip_count,
  -- Check if user eventually succeeded in signing up
  EXISTS(
    SELECT 1 FROM auth.users u WHERE u.email = v_blocked_signups.email
  ) AS has_auth_user,
  EXISTS(
    SELECT 1 FROM public.profiles p WHERE p.email = v_blocked_signups.email
  ) AS has_profile
FROM public.v_blocked_signups
GROUP BY email
ORDER BY total_blocked_attempts DESC, last_blocked_at DESC;

COMMENT ON VIEW public.v_blocked_signups_by_email IS 
  'Summary of blocked signups grouped by email with attempt counts and success status.';

-- View: Recent blocked signups (last 24 hours)
CREATE OR REPLACE VIEW public.v_recent_blocked_signups AS
SELECT
  email,
  COUNT(*) AS attempt_count,
  MAX(blocked_at) AS last_attempt,
  EXTRACT(EPOCH FROM (NOW() - MAX(blocked_at)))/60 AS minutes_since_last_attempt,
  array_agg(DISTINCT action ORDER BY action) AS actions,
  -- Estimate if rate limit should have expired (typically 1 hour)
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(blocked_at)))/3600 > 1 THEN 'likely_expired'
    WHEN EXTRACT(EPOCH FROM (NOW() - MAX(blocked_at)))/60 > 30 THEN 'expiring_soon'
    ELSE 'still_active'
  END AS estimated_rate_limit_status
FROM public.v_blocked_signups
WHERE blocked_at > NOW() - INTERVAL '24 hours'
GROUP BY email
ORDER BY last_attempt DESC;

COMMENT ON VIEW public.v_recent_blocked_signups IS 
  'Blocked signups from the last 24 hours with estimated rate limit expiry status.';

-- View: Blocked signups that look legitimate (not obvious spam)
CREATE OR REPLACE VIEW public.v_potentially_legitimate_blocked_signups AS
SELECT
  email,
  total_blocked_attempts,
  last_blocked_at,
  EXTRACT(EPOCH FROM (NOW() - last_blocked_at))/3600 AS hours_since_last_block,
  has_auth_user,
  has_profile,
  unique_ip_count
FROM public.v_blocked_signups_by_email
WHERE 
  -- Reasonable number of attempts (not spam bot levels)
  total_blocked_attempts BETWEEN 2 AND 20
  -- Valid email format
  AND email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  -- Exclude obvious spam domains
  AND email NOT LIKE '%tempmail%'
  AND email NOT LIKE '%throwaway%'
  AND email NOT LIKE '%disposable%'
  AND email NOT LIKE '%guerrillamail%'
  AND email NOT LIKE '%mailinator%'
  -- Not too many different IPs (might indicate botnet)
  AND unique_ip_count <= 3
  -- Recent (within last 7 days)
  AND last_blocked_at > NOW() - INTERVAL '7 days'
ORDER BY last_blocked_at DESC;

COMMENT ON VIEW public.v_potentially_legitimate_blocked_signups IS 
  'Identifies blocked signups that appear to be from legitimate users (not spam), useful for admin review.';

-- ============================================================================
-- STEP 2: Functions to check rate limit status
-- ============================================================================

-- Function: Check if an email is currently rate-limited
CREATE OR REPLACE FUNCTION public.is_email_rate_limited(
  p_email text,
  p_lookback_hours integer DEFAULT 2
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM auth.audit_log_entries a
    WHERE a.payload->>'actor_username' LIKE p_email || ' [blocked]%'
      AND a.created_at > NOW() - make_interval(hours => p_lookback_hours)
  );
$$;

COMMENT ON FUNCTION public.is_email_rate_limited(text, integer) IS 
  'Returns true if the email has blocked attempts in the last N hours (default 2), indicating possible rate limiting.';

-- Function: Get blocked attempt details for an email
CREATE OR REPLACE FUNCTION public.get_blocked_attempts_for_email(
  p_email text,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  blocked_at timestamptz,
  action text,
  ip_address text,
  actor_id_internal text,
  minutes_ago numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.created_at AS blocked_at,
    a.payload->>'action' AS action,
    a.payload->>'ip_address' AS ip_address,
    a.payload->>'actor_id' AS actor_id_internal,
    EXTRACT(EPOCH FROM (NOW() - a.created_at))/60 AS minutes_ago
  FROM auth.audit_log_entries a
  WHERE a.payload->>'actor_username' LIKE p_email || ' [blocked]%'
  ORDER BY a.created_at DESC
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_blocked_attempts_for_email(text, integer) IS 
  'Returns detailed blocked attempt history for a specific email address.';

-- Function: Get signup health metrics
CREATE OR REPLACE FUNCTION public.get_signup_health_metrics(
  p_hours integer DEFAULT 24
)
RETURNS TABLE (
  period_hours integer,
  total_signup_attempts bigint,
  successful_signups bigint,
  blocked_attempts bigint,
  success_rate_percent numeric,
  block_rate_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_hours AS period_hours,
    COUNT(*) AS total_signup_attempts,
    COUNT(*) FILTER (
      WHERE payload->>'action' IN ('user_signedup', 'user_signup')
        AND payload->>'actor_username' NOT LIKE '%[blocked]%'
    ) AS successful_signups,
    COUNT(*) FILTER (
      WHERE payload->>'actor_username' LIKE '%[blocked]%'
    ) AS blocked_attempts,
    ROUND(
      100.0 * COUNT(*) FILTER (
        WHERE payload->>'action' IN ('user_signedup', 'user_signup')
          AND payload->>'actor_username' NOT LIKE '%[blocked]%'
      ) / NULLIF(COUNT(*), 0),
      2
    ) AS success_rate_percent,
    ROUND(
      100.0 * COUNT(*) FILTER (
        WHERE payload->>'actor_username' LIKE '%[blocked]%'
      ) / NULLIF(COUNT(*), 0),
      2
    ) AS block_rate_percent
  FROM auth.audit_log_entries
  WHERE payload->>'action' IN (
    'user_signedup',
    'user_signup', 
    'user_repeated_signup',
    'user_confirmation_requested'
  )
    AND created_at > NOW() - make_interval(hours => p_hours);
$$;

COMMENT ON FUNCTION public.get_signup_health_metrics(integer) IS 
  'Returns signup success and block rates for the last N hours. Useful for monitoring dashboards.';

-- ============================================================================
-- STEP 3: Investigation helper functions
-- ============================================================================

-- Function: Investigate specific blocked actor
CREATE OR REPLACE FUNCTION public.investigate_blocked_actor(
  p_actor_id text
)
RETURNS TABLE (
  finding_type text,
  finding_value text,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_has_user boolean;
  v_has_profile boolean;
  v_attempt_count integer;
BEGIN
  -- Get email from audit log
  SELECT regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '')
  INTO v_email
  FROM auth.audit_log_entries
  WHERE payload->>'actor_id' = p_actor_id
  LIMIT 1;

  -- Check if real user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_actor_id::uuid OR email = v_email)
  INTO v_has_user;

  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_actor_id::uuid OR email = v_email)
  INTO v_has_profile;

  -- Count blocked attempts
  SELECT COUNT(*)
  INTO v_attempt_count
  FROM auth.audit_log_entries
  WHERE payload->>'actor_id' = p_actor_id;

  -- Return findings
  finding_type := 'actor_id';
  finding_value := p_actor_id;
  description := 'Internal tracking ID from audit logs';
  RETURN NEXT;

  finding_type := 'email';
  finding_value := COALESCE(v_email, 'not found');
  description := 'Email address extracted from blocked attempts';
  RETURN NEXT;

  finding_type := 'is_real_user_id';
  finding_value := CASE WHEN v_has_user THEN 'yes' ELSE 'no' END;
  description := 'Whether actor_id corresponds to actual auth.users record';
  RETURN NEXT;

  finding_type := 'has_profile';
  finding_value := CASE WHEN v_has_profile THEN 'yes' ELSE 'no' END;
  description := 'Whether user has a profile record';
  RETURN NEXT;

  finding_type := 'blocked_attempts';
  finding_value := v_attempt_count::text;
  description := 'Total number of blocked attempts for this actor';
  RETURN NEXT;

  finding_type := 'conclusion';
  finding_value := CASE
    WHEN NOT v_has_user AND NOT v_has_profile THEN 'blocked_only'
    WHEN v_has_user AND v_has_profile THEN 'eventually_succeeded'
    WHEN v_has_user AND NOT v_has_profile THEN 'auth_without_profile'
    ELSE 'unknown'
  END;
  description := 'Summary of actor status';
  RETURN NEXT;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.investigate_blocked_actor(text) IS 
  'Investigates a specific actor_id from blocked attempts, showing whether it corresponds to a real user.';

-- ============================================================================
-- STEP 4: Monitoring and alerting helpers
-- ============================================================================

-- Function: Detect anomalous blocking patterns
CREATE OR REPLACE FUNCTION public.detect_blocking_anomalies(
  p_hours integer DEFAULT 1
)
RETURNS TABLE (
  anomaly_type text,
  severity text,
  details jsonb,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block_rate numeric;
  v_total_blocks integer;
  v_unique_ips integer;
BEGIN
  -- Get metrics
  SELECT 
    COALESCE(block_rate_percent, 0),
    COALESCE(blocked_attempts, 0)
  INTO v_block_rate, v_total_blocks
  FROM public.get_signup_health_metrics(p_hours);

  -- Count unique IPs with blocks
  SELECT COUNT(DISTINCT payload->>'ip_address')
  INTO v_unique_ips
  FROM auth.audit_log_entries
  WHERE payload->>'actor_username' LIKE '%[blocked]%'
    AND created_at > NOW() - make_interval(hours => p_hours)
    AND payload->>'ip_address' IS NOT NULL;

  -- Check for high block rate
  IF v_block_rate > 50 THEN
    anomaly_type := 'high_block_rate';
    severity := 'critical';
    details := jsonb_build_object(
      'block_rate_percent', v_block_rate,
      'total_blocks', v_total_blocks,
      'period_hours', p_hours
    );
    recommendation := 'More than 50% of signups are being blocked. Check for UX issues causing users to retry, or potential DDoS attack.';
    RETURN NEXT;
  ELSIF v_block_rate > 25 THEN
    anomaly_type := 'elevated_block_rate';
    severity := 'warning';
    details := jsonb_build_object(
      'block_rate_percent', v_block_rate,
      'total_blocks', v_total_blocks,
      'period_hours', p_hours
    );
    recommendation := 'Block rate is elevated. Review recent blocked signups for patterns.';
    RETURN NEXT;
  END IF;

  -- Check for potential distributed attack
  IF v_total_blocks > 100 AND v_unique_ips > 50 THEN
    anomaly_type := 'distributed_attack';
    severity := 'critical';
    details := jsonb_build_object(
      'total_blocks', v_total_blocks,
      'unique_ips', v_unique_ips,
      'period_hours', p_hours
    );
    recommendation := 'Many blocks from many IPs suggests distributed bot attack. Consider enabling CAPTCHA.';
    RETURN NEXT;
  END IF;

  -- Check for legitimate users being blocked
  IF EXISTS(
    SELECT 1 FROM public.v_potentially_legitimate_blocked_signups
    WHERE hours_since_last_block < p_hours
  ) THEN
    anomaly_type := 'legitimate_users_blocked';
    severity := 'warning';
    details := jsonb_build_object(
      'count', (SELECT COUNT(*) FROM public.v_potentially_legitimate_blocked_signups WHERE hours_since_last_block < p_hours),
      'period_hours', p_hours
    );
    recommendation := 'Some blocked signups appear legitimate. Review v_potentially_legitimate_blocked_signups view and consider reaching out.';
    RETURN NEXT;
  END IF;

  -- If no anomalies found
  IF NOT FOUND THEN
    anomaly_type := 'no_anomalies';
    severity := 'info';
    details := jsonb_build_object(
      'block_rate_percent', v_block_rate,
      'total_blocks', v_total_blocks,
      'message', 'No anomalies detected'
    );
    recommendation := 'Signup blocking patterns are normal.';
    RETURN NEXT;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.detect_blocking_anomalies(integer) IS 
  'Detects anomalous blocking patterns that may require admin attention. Returns severity and recommendations.';

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

-- Grant SELECT on views to authenticated users and service_role
GRANT SELECT ON public.v_blocked_signups TO authenticated, service_role;
GRANT SELECT ON public.v_blocked_signups_by_email TO authenticated, service_role;
GRANT SELECT ON public.v_recent_blocked_signups TO authenticated, service_role;
GRANT SELECT ON public.v_potentially_legitimate_blocked_signups TO service_role;

-- Grant EXECUTE on functions
GRANT EXECUTE ON FUNCTION public.is_email_rate_limited(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_blocked_attempts_for_email(text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_signup_health_metrics(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.investigate_blocked_actor(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.detect_blocking_anomalies(integer) TO service_role;

-- ============================================================================
-- STEP 6: Create indexes for performance
-- ============================================================================

-- Index on audit_log_entries for blocked signup queries
-- Note: This is a partial index to keep it small and fast
CREATE INDEX IF NOT EXISTS audit_log_entries_blocked_username_idx 
  ON auth.audit_log_entries ((payload->>'actor_username'))
  WHERE payload->>'actor_username' LIKE '%[blocked]%';

CREATE INDEX IF NOT EXISTS audit_log_entries_blocked_action_created_idx 
  ON auth.audit_log_entries ((payload->>'action'), created_at DESC)
  WHERE payload->>'actor_username' LIKE '%[blocked]%';

COMMIT;

-- ============================================================================
-- Usage Examples (for documentation)
-- ============================================================================

-- Check if a specific email is rate-limited:
-- SELECT public.is_email_rate_limited('user@example.com');

-- Get blocked attempt history for an email:
-- SELECT * FROM public.get_blocked_attempts_for_email('user@example.com');

-- Get signup health metrics for last 24 hours:
-- SELECT * FROM public.get_signup_health_metrics(24);

-- Investigate a specific blocked actor:
-- SELECT * FROM public.investigate_blocked_actor('b8d68fe1-1a7d-4a50-ab80-d98937e20b4f');

-- Detect blocking anomalies in last hour:
-- SELECT * FROM public.detect_blocking_anomalies(1);

-- View potentially legitimate blocked users:
-- SELECT * FROM public.v_potentially_legitimate_blocked_signups;

-- ============================================================================
-- End of migration
-- ============================================================================
