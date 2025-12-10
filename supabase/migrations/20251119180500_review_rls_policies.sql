-- ============================================================================
-- Review and Update RLS Policies for Core Tables (Safe, Idempotent)
-- ============================================================================
-- This migration replaces earlier broad RLS configuration with a safe,
-- table-aware version. Every block:
--   * checks that the table exists before touching it
--   * drops only policies that it owns (by name)
--   * is idempotent and re-runnable
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROFILES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    -- Make sure RLS is on
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    -- Clean up policies we control
    DROP POLICY IF EXISTS profiles_owner_select ON public.profiles;
    DROP POLICY IF EXISTS profiles_owner_modify ON public.profiles;
    DROP POLICY IF EXISTS profiles_service_role_all ON public.profiles;

    -- Owner: can view own profile
    CREATE POLICY profiles_owner_select
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (id = auth.uid());

    -- Owner: can update own profile
    CREATE POLICY profiles_owner_modify
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());

    -- Backend / service_role: full access
    CREATE POLICY profiles_service_role_all
      ON public.profiles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.profiles; table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- PROFILE_ERRORS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profile_errors'
  ) THEN
    ALTER TABLE public.profile_errors ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS profile_errors_service_role_all ON public.profile_errors;
    DROP POLICY IF EXISTS profile_errors_gov_view ON public.profile_errors;

    -- Service role: full access
    CREATE POLICY profile_errors_service_role_all
      ON public.profile_errors
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- Governance / admin viewers: any profile with account_type = 'government'
    CREATE POLICY profile_errors_gov_view
      ON public.profile_errors
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.account_type = 'government'
        )
      );
  ELSE
    RAISE NOTICE 'Skipping RLS for public.profile_errors; table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- USER_EVENTS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_events'
  ) THEN
    ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS user_events_owner_select ON public.user_events;
    DROP POLICY IF EXISTS user_events_owner_insert ON public.user_events;
    DROP POLICY IF EXISTS user_events_service_role_all ON public.user_events;

    CREATE POLICY user_events_owner_select
      ON public.user_events
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY user_events_owner_insert
      ON public.user_events
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY user_events_service_role_all
      ON public.user_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.user_events; table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- PAYMENT_EVENTS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_events'
  ) THEN
    ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS payment_events_owner_select ON public.payment_events;
    DROP POLICY IF EXISTS payment_events_owner_insert ON public.payment_events;
    DROP POLICY IF EXISTS payment_events_service_role_all ON public.payment_events;

    CREATE POLICY payment_events_owner_select
      ON public.payment_events
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY payment_events_owner_insert
      ON public.payment_events
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY payment_events_service_role_all
      ON public.payment_events
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.payment_events; table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- SME / PROFESSIONAL / INVESTOR / DONOR / GOVERNMENT NEEDS ASSESSMENTS
-- Each table is optional; if present, we enforce owner + service_role patterns.
-- ============================================================================

DO $$
BEGIN
  -- SME
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sme_needs_assessments'
  ) THEN
    ALTER TABLE public.sme_needs_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS sme_assessments_owner_select ON public.sme_needs_assessments;
    DROP POLICY IF EXISTS sme_assessments_owner_upsert ON public.sme_needs_assessments;
    DROP POLICY IF EXISTS sme_assessments_service_role_all ON public.sme_needs_assessments;

    CREATE POLICY sme_assessments_owner_select
      ON public.sme_needs_assessments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY sme_assessments_owner_upsert
      ON public.sme_needs_assessments
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY sme_assessments_service_role_all
      ON public.sme_needs_assessments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.sme_needs_assessments; table does not exist.';
  END IF;

  -- Professional
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'professional_needs_assessments'
  ) THEN
    ALTER TABLE public.professional_needs_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS professional_assessments_owner_select ON public.professional_needs_assessments;
    DROP POLICY IF EXISTS professional_assessments_owner_upsert ON public.professional_needs_assessments;
    DROP POLICY IF EXISTS professional_assessments_service_role_all ON public.professional_needs_assessments;

    CREATE POLICY professional_assessments_owner_select
      ON public.professional_needs_assessments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY professional_assessments_owner_upsert
      ON public.professional_needs_assessments
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY professional_assessments_service_role_all
      ON public.professional_needs_assessments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.professional_needs_assessments; table does not exist.';
  END IF;

  -- Investor
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'investor_needs_assessments'
  ) THEN
    ALTER TABLE public.investor_needs_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS investor_assessments_owner_select ON public.investor_needs_assessments;
    DROP POLICY IF EXISTS investor_assessments_owner_upsert ON public.investor_needs_assessments;
    DROP POLICY IF EXISTS investor_assessments_service_role_all ON public.investor_needs_assessments;

    CREATE POLICY investor_assessments_owner_select
      ON public.investor_needs_assessments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY investor_assessments_owner_upsert
      ON public.investor_needs_assessments
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY investor_assessments_service_role_all
      ON public.investor_needs_assessments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.investor_needs_assessments; table does not exist.';
  END IF;

  -- Donor
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'donor_needs_assessments'
  ) THEN
    ALTER TABLE public.donor_needs_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS donor_assessments_owner_select ON public.donor_needs_assessments;
    DROP POLICY IF EXISTS donor_assessments_owner_upsert ON public.donor_needs_assessments;
    DROP POLICY IF EXISTS donor_assessments_service_role_all ON public.donor_needs_assessments;

    CREATE POLICY donor_assessments_owner_select
      ON public.donor_needs_assessments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY donor_assessments_owner_upsert
      ON public.donor_needs_assessments
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY donor_assessments_service_role_all
      ON public.donor_needs_assessments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.donor_needs_assessments; table does not exist.';
  END IF;

  -- Government
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'government_needs_assessments'
  ) THEN
    ALTER TABLE public.government_needs_assessments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS government_assessments_owner_select ON public.government_needs_assessments;
    DROP POLICY IF EXISTS government_assessments_owner_upsert ON public.government_needs_assessments;
    DROP POLICY IF EXISTS government_assessments_service_role_all ON public.government_needs_assessments;

    CREATE POLICY government_assessments_owner_select
      ON public.government_needs_assessments
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY government_assessments_owner_upsert
      ON public.government_needs_assessments
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY government_assessments_service_role_all
      ON public.government_needs_assessments
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.government_needs_assessments; table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- WEBHOOK_LOGS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'webhook_logs'
  ) THEN
    ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS webhook_logs_service_role_all ON public.webhook_logs;

    CREATE POLICY webhook_logs_service_role_all
      ON public.webhook_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.webhook_logs; table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- AUDIT_LOGS
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS audit_logs_service_role_all ON public.audit_logs;

    CREATE POLICY audit_logs_service_role_all
      ON public.audit_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.audit_logs; table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- USER_ROLES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_roles'
  ) THEN
    ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS user_roles_owner_select ON public.user_roles;
    DROP POLICY IF EXISTS user_roles_service_role_all ON public.user_roles;

    CREATE POLICY user_roles_owner_select
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());

    CREATE POLICY user_roles_service_role_all
      ON public.user_roles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  ELSE
    RAISE NOTICE 'Skipping RLS for public.user_roles; table does not exist.';
  END IF;
END;
$$;

COMMIT;
