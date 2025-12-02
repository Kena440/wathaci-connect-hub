-- Track grace-period access for users created while subscriptions are paused
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grace_period_access boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_period_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_expires_at timestamptz;

COMMENT ON COLUMN public.profiles.grace_period_access IS 'Marks profiles created/updated during the platform-wide subscription grace period.';
COMMENT ON COLUMN public.profiles.grace_period_started_at IS 'Timestamp when grace-period access was granted.';
COMMENT ON COLUMN public.profiles.grace_period_expires_at IS 'Timestamp when the temporary subscription grace period ends.';

-- Backfill expiry for any rows already marked as in-grace
UPDATE public.profiles
SET grace_period_expires_at = '2026-01-04T23:59:59+02:00'
WHERE grace_period_access = true
  AND grace_period_expires_at IS NULL;

COMMIT;
