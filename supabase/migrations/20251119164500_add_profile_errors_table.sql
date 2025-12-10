-- ============================================================================
-- SAFE MIGRATION: Create profile_errors table and policies
-- ============================================================================
-- This version is fully idempotent and will not break when re-run or when
-- applied after schema changes.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1 — Ensure auth.users exists before referencing it
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='auth' AND table_name='users'
  ) THEN
    RAISE NOTICE 'auth.users does not exist — skipping foreign key validation.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2 — Create table safely (IF NOT EXISTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  error_message text NOT NULL,
  error_detail text,
  error_hint text,
  error_context text,
  error_time timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
  notes text
);

-- ============================================================================
-- STEP 3 — Apply foreign key safely
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='auth' AND table_name='users'
  ) THEN
    ALTER TABLE public.profile_errors
      DROP CONSTRAINT IF EXISTS profile_errors_resolved_by_fkey;

    ALTER TABLE public.profile_errors
      ADD CONSTRAINT profile_errors_resolved_by_fkey
      FOREIGN KEY (resolved_by)
      REFERENCES auth.users(id);
  ELSE
    RAISE NOTICE 'Skipping resolved_by FK because auth.users is missing.';
  END IF;
END $$;

-- ============================================================================
-- STEP 4 — Create indexes safely
-- ============================================================================

CREATE INDEX IF NOT EXISTS profile_errors_user_id_idx
  ON public.profile_errors(user_id);

CREATE INDEX IF NOT EXISTS profile_errors_error_time_idx
  ON public.profile_errors(error_time DESC);

CREATE INDEX IF NOT EXISTS profile_errors_resolved_idx
  ON public.profile_errors(resolved) WHERE NOT resolved;

-- ============================================================================
-- STEP 5 — Enable RLS safely
-- ============================================================================
DO $$
BEGIN
  ALTER TABLE public.profile_errors ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'RLS already enabled or table missing — safe to ignore.';
END $$;

-- ============================================================================
-- STEP 6 — Create admin policy safely
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profile_errors'
  ) THEN

    DROP POLICY IF EXISTS profile_errors_admin_all
      ON public.profile_errors;

    CREATE POLICY profile_errors_admin_all
      ON public.profile_errors
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p_admin
          WHERE p_admin.id = auth.uid()
            AND p_admin.account_type = 'government'
        )
      );
  ELSE
    RAISE NOTICE 'profile_errors table missing — skipping policy creation.';
  END IF;
END $$;

-- ============================================================================
-- STEP 7 — Comments (safe)
-- ============================================================================
COMMENT ON TABLE public.profile_errors
  IS 'Logs errors that occur during profile creation to help diagnose signup issues';

COMMENT ON COLUMN public.profile_errors.user_id
  IS 'The auth.users.id if available when error occurred';

COMMENT ON COLUMN public.profile_errors.error_message
  IS 'Main error message from SQLERRM';

COMMENT ON COLUMN public.profile_errors.error_detail
  IS 'Additional error details from SQLSTATE or exception';

COMMENT ON COLUMN public.profile_errors.error_context
  IS 'Context about what was being attempted when error occurred';

COMMIT;
