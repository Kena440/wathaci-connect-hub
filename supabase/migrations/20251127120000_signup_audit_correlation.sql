BEGIN;

-- Normalize signup-related audit log entries with clean identifiers.
CREATE OR REPLACE VIEW public.audit_signup_normalized AS
SELECT
  id AS audit_id,
  payload->>'action' AS action,
  payload->>'actor_id' AS actor_id,
  regexp_replace(payload->>'actor_username', ' \\[blocked\\]$', '') AS actor_email_clean,
  payload->>'actor_username' AS actor_username_raw,
  payload->>'log_type' AS log_type,
  payload->'traits'->>'provider' AS provider,
  created_at AS audit_created_at
FROM auth.audit_log_entries
WHERE payload->>'action' IN (
  'user_signedup',
  'user_repeated_signup',
  'user_confirmation_requested'
);

-- Correlate audit entries to auth.users and public.profiles using actor_id and actor_email_clean.
CREATE OR REPLACE VIEW public.audit_signup_correlations AS
WITH audit AS (
  SELECT * FROM public.audit_signup_normalized
)
SELECT
  a.audit_id,
  a.action,
  a.actor_id,
  a.actor_email_clean,
  a.audit_created_at,
  u.id AS auth_user_id,
  u.email AS auth_email,
  u.created_at AS auth_created_at,
  p.id AS profile_id,
  p.email AS profile_email,
  p.created_at AS profile_created_at,
  (u.id IS NOT NULL) AS has_auth,
  (p.id IS NOT NULL) AS has_profile,
  CASE
    WHEN u.id IS NOT NULL AND p.id IS NOT NULL THEN 'healthy'
    WHEN u.id IS NOT NULL AND p.id IS NULL THEN 'auth_without_profile'
    WHEN u.id IS NULL AND p.id IS NULL THEN 'audit_only_or_blocked'
    WHEN u.id IS NULL AND p.id IS NOT NULL THEN 'profile_without_auth'
    ELSE 'indeterminate'
  END AS status
FROM audit a
LEFT JOIN auth.users u
  ON u.id::text = a.actor_id
     OR u.email = a.actor_email_clean
LEFT JOIN public.profiles p
  ON p.id = u.id
     OR (p.email IS NOT NULL AND p.email = a.actor_email_clean);

-- High-level rollup to quickly assess signup health from audit signals.
CREATE OR REPLACE VIEW public.audit_signup_health_summary AS
SELECT
  has_auth,
  has_profile,
  COUNT(*) AS count
FROM public.audit_signup_correlations
GROUP BY has_auth, has_profile;

-- Convenience view to focus on blocked signup attempts.
CREATE OR REPLACE VIEW public.audit_blocked_signups AS
SELECT
  audit_id,
  actor_id,
  actor_username_raw,
  actor_email_clean,
  audit_created_at
FROM public.audit_signup_normalized
WHERE actor_username_raw LIKE '%[blocked]%'
ORDER BY audit_created_at DESC;

COMMIT;
