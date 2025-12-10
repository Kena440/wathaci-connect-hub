-- ============================================================================
-- 20251124120000_audit_correlation_comprehensive_fix.sql
-- Comprehensive Signup Audit Correlation and Profile Creation Fix
-- ============================================================================
-- Goals:
-- 1. Make public.user_events the source of truth for user lifecycle events
-- 2. Ensure logging always has user_id and email where possible
-- 3. Provide views and helper functions for monitoring signup flows
-- 4. Make everything idempotent and safe on fresh and existing databases
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Ensure user_events table exists and has the expected structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Add/align columns safely (in case table already existed with older schema)
DO $$
BEGIN
  -- user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_events'
      AND column_name  = 'user_id'
  ) THEN
    ALTER TABLE public.user_events
      ADD COLUMN user_id uuid;
  END IF;

  -- email
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_events'
      AND column_name  = 'email'
  ) THEN
    ALTER TABLE public.user_events
      ADD COLUMN email text;
  END IF;

  -- event_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_events'
      AND column_name  = 'event_type'
  ) THEN
    ALTER TABLE public.user_events
      ADD COLUMN event_type text;
  END IF;

  -- metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_events'
      AND column_name  = 'metadata'
  ) THEN
    ALTER TABLE public.user_events
      ADD COLUMN metadata jsonb;
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_events'
      AND column_name  = 'created_at'
  ) THEN
    ALTER TABLE public.user_events
      ADD COLUMN created_at timestamptz NOT NULL DEFAULT timezone('utc', now());
  END IF;

  -- Ensure NOT NULL where appropriate
  BEGIN
    ALTER TABLE public.user_events
      ALTER COLUMN event_type SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    -- ignore if cannot set (due to existing nulls); app logic can enforce
    NULL;
  END;

  BEGIN
    ALTER TABLE public.user_events
      ALTER COLUMN created_at SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

-- ============================================================================
-- STEP 1b: Safe backfill of event_type from legacy columns (no "kind" errors)
-- ============================================================================

DO $$
BEGIN
  -- If legacy "kind" column still exists, use it for backfill
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'user_events'
      AND column_name  = 'kind'
  ) THEN
    EXECUTE $sql$
      UPDATE public.user_events
      SET event_type = COALESCE(event_type, kind, 'unknown')
      WHERE event_type IS NULL
    $sql$;
  ELSE
    -- Fresh schemas: just fill with 'unknown' where missing
    EXECUTE $sql$
      UPDATE public.user_events
      SET event_type = COALESCE(event_type, 'unknown')
      WHERE event_type IS NULL
    $sql$;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 1c: Indexes and comments for user_events
-- ============================================================================

CREATE INDEX IF NOT EXISTS user_events_user_id_idx
  ON public.user_events(user_id);

CREATE INDEX IF NOT EXISTS user_events_event_type_idx
  ON public.user_events(event_type);

CREATE INDEX IF NOT EXISTS user_events_email_idx
  ON public.user_events(email);

CREATE INDEX IF NOT EXISTS user_events_created_at_idx
  ON public.user_events(created_at DESC);

CREATE INDEX IF NOT EXISTS user_events_user_event_idx
  ON public.user_events(user_id, event_type, created_at DESC);

COMMENT ON TABLE public.user_events IS
  'Application-controlled event log for user lifecycle events (signup, profile, verification, etc.), used to correlate auth.users, public.profiles and auth.audit_log_entries for reliable user_id/email correlation.';

COMMENT ON COLUMN public.user_events.user_id IS
  'UUID of the auth.users record.';

COMMENT ON COLUMN public.user_events.email IS
  'User email at time of event (denormalized for easier querying).';

COMMENT ON COLUMN public.user_events.event_type IS
  'Event type, e.g. signup_initiated, signup_completed, profile_created, email_verified, profile_backfilled, etc.';

COMMENT ON COLUMN public.user_events.metadata IS
  'JSON payload with additional event data (signup source, IP, device, etc.).';

-- ============================================================================
-- STEP 2: Enhanced log_user_event() with explicit user_id and email
-- ============================================================================

DROP FUNCTION IF EXISTS public.log_user_event(uuid, text, text, jsonb);

CREATE FUNCTION public.log_user_event(
  p_user_id uuid,
  p_event_type text,
  p_email text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  -- Try to populate email if not provided
  IF p_email IS NOT NULL THEN
    v_email := p_email;
  ELSE
    SELECT u.email
    INTO v_email
    FROM auth.users u
    WHERE u.id = p_user_id;

    IF v_email IS NULL OR v_email = '' THEN
      -- Still null? fall back to metadata.email if present
      IF p_metadata ? 'email' THEN
        v_email := COALESCE(p_metadata->>'email', NULL);
      END IF;
    END IF;
  END IF;

  INSERT INTO public.user_events (user_id, email, event_type, metadata)
  VALUES (
    p_user_id,
    v_email,
    p_event_type,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.log_user_event(uuid, text, text, jsonb) IS
  'Central logging helper that records user lifecycle events into public.user_events with explicit user_id and best-effort email resolution.';

-- ============================================================================
-- STEP 3: Monitoring views for signup/profile correlation
-- ============================================================================

-- Users without profiles
CREATE OR REPLACE VIEW public.v_users_without_profiles AS
SELECT
  u.id          AS user_id,
  u.email       AS email,
  u.created_at  AS user_created_at
FROM auth.users u
LEFT JOIN public.profiles p
  ON p.id = u.id
WHERE p.id IS NULL;

-- Recent signup-related events
CREATE OR REPLACE VIEW public.v_recent_signup_events AS
SELECT
  e.id,
  e.user_id,
  e.email,
  e.event_type,
  e.metadata,
  e.created_at
FROM public.user_events e
WHERE e.event_type LIKE 'signup_%'
ORDER BY e.created_at DESC
LIMIT 1000;

-- High-level per-user correlation status
CREATE OR REPLACE VIEW public.v_signup_correlation_status AS
SELECT
  u.id AS user_id,
  u.email,
  u.created_at AS user_created_at,
  (p.id IS NOT NULL) AS has_profile,
  EXISTS (
    SELECT 1
    FROM public.user_events e
    WHERE e.user_id = u.id
      AND e.event_type = 'signup_initiated'
  ) AS has_signup_initiated,
  EXISTS (
    SELECT 1
    FROM public.user_events e
    WHERE e.user_id = u.id
      AND e.event_type = 'signup_completed'
  ) AS has_signup_completed
FROM auth.users u
LEFT JOIN public.profiles p
  ON p.id = u.id;

-- Audit + user_events join for analysis
CREATE OR REPLACE VIEW public.v_audit_signup_analysis AS
SELECT
  a.id                AS audit_id,
  a.created_at        AS audit_created_at,
  a.payload           AS audit_payload,
  (a.payload->>'actor_id')::uuid                AS actor_user_id,
  a.payload->>'actor_email'                     AS actor_email,
  e.id                AS user_event_id,
  e.event_type        AS user_event_type,
  e.created_at        AS user_event_created_at,
  e.metadata          AS user_event_metadata
FROM auth.audit_log_entries a
LEFT JOIN public.user_events e
  ON e.user_id = (a.payload->>'actor_id')::uuid
  AND e.email = a.payload->>'actor_email';

-- ============================================================================
-- STEP 4: Helper functions for diagnostics
-- ============================================================================

-- Returns rows describing potential signup issues in the last N minutes
DROP FUNCTION IF EXISTS public.check_recent_signup_issues(integer);

CREATE FUNCTION public.check_recent_signup_issues(p_minutes integer)
RETURNS TABLE (
  user_id uuid,
  email text,
  issue text,
  user_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    CASE
      WHEN p.id IS NULL THEN 'missing_profile'
      WHEN NOT EXISTS (
        SELECT 1 FROM public.user_events e
        WHERE e.user_id = u.id
          AND e.event_type = 'signup_completed'
      ) THEN 'missing_signup_completed_event'
      ELSE 'ok'
    END AS issue,
    u.created_at
  FROM auth.users u
  LEFT JOIN public.profiles p
    ON p.id = u.id
  WHERE u.created_at >= timezone('utc', now()) - (p_minutes || ' minutes')::interval;
END;
$$;

COMMENT ON FUNCTION public.check_recent_signup_issues(integer) IS
  'Returns recent users with potential signup issues (missing profile or missing signup_completed event) within the last N minutes.';

-- Aggregate signup statistics for the last N days
DROP FUNCTION IF EXISTS public.get_signup_statistics(integer);

CREATE FUNCTION public.get_signup_statistics(p_days integer)
RETURNS TABLE (
  metric text,
  value bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Total users
  RETURN QUERY
  SELECT 'total_users' AS metric, COUNT(*)::bigint AS value
  FROM auth.users
  WHERE created_at >= timezone('utc', now()) - (p_days || ' days')::interval;

  -- Users with profiles
  RETURN QUERY
  SELECT 'users_with_profiles' AS metric, COUNT(*)::bigint AS value
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.created_at >= timezone('utc', now()) - (p_days || ' days')::interval;

  -- Users without profiles
  RETURN QUERY
  SELECT 'users_without_profiles' AS metric, COUNT(*)::bigint AS value
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE p.id IS NULL
    AND u.created_at >= timezone('utc', now()) - (p_days || ' days')::interval;

  -- Signup completed events
  RETURN QUERY
  SELECT 'signup_completed_events' AS metric, COUNT(*)::bigint AS value
  FROM public.user_events e
  WHERE e.event_type = 'signup_completed'
    AND e.created_at >= timezone('utc', now()) - (p_days || ' days')::interval;
END;
$$;

COMMENT ON FUNCTION public.get_signup_statistics(integer) IS
  'Returns aggregated signup statistics (total users, with/without profiles, signup_completed events) over the last N days.';

-- ============================================================================
-- STEP 5: Grants
-- ============================================================================

GRANT SELECT ON public.v_signup_correlation_status TO service_role;
GRANT SELECT ON public.v_users_without_profiles       TO service_role;
GRANT SELECT ON public.v_recent_signup_events         TO service_role;
GRANT SELECT ON public.v_audit_signup_analysis        TO service_role;

GRANT EXECUTE ON FUNCTION public.check_recent_signup_issues(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_signup_statistics(integer)      TO authenticated, service_role;

COMMIT;

-- ============================================================================
-- End of migration
-- ============================================================================
