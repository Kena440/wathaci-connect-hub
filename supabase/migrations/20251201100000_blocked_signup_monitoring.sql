BEGIN;

-- Rollup of blocked signup attempts to quickly spot abuse or false positives.
CREATE OR REPLACE VIEW public.audit_blocked_signup_rollup AS
SELECT
  regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS email,
  COUNT(*) AS blocked_attempts,
  MIN(created_at) AS first_attempt,
  MAX(created_at) AS last_attempt
FROM auth.audit_log_entries
WHERE payload->>'actor_username' LIKE '%[blocked]%'
GROUP BY email
ORDER BY blocked_attempts DESC;

-- Helper to surface recent blocked activity for alerting.
CREATE OR REPLACE FUNCTION public.check_blocked_signups(
  p_hours integer DEFAULT 1,
  p_threshold integer DEFAULT 3
)
RETURNS TABLE (
  email text,
  blocked_attempts bigint,
  first_attempt timestamptz,
  last_attempt timestamptz,
  severity text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    email,
    blocked_attempts,
    first_attempt,
    last_attempt,
    CASE
      WHEN blocked_attempts >= p_threshold THEN 'action_required'
      ELSE 'watch'
    END AS severity
  FROM public.audit_blocked_signup_rollup
  WHERE last_attempt > NOW() - make_interval(hours => p_hours)
    AND blocked_attempts >= GREATEST(1, p_threshold)
  ORDER BY blocked_attempts DESC, last_attempt DESC;
$$;

-- Helper to list auth users created recently without matching profiles.
CREATE OR REPLACE FUNCTION public.list_auth_without_profiles(
  p_minutes integer DEFAULT 15
)
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  minutes_since_signup numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id AS user_id,
    u.email,
    u.created_at,
    EXTRACT(EPOCH FROM (NOW() - u.created_at)) / 60 AS minutes_since_signup
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
    AND u.created_at > NOW() - make_interval(mins => p_minutes)
  ORDER BY u.created_at DESC;
$$;

GRANT SELECT ON public.audit_blocked_signup_rollup TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_blocked_signups(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_auth_without_profiles(integer) TO authenticated, service_role;

COMMIT;
