-- ============================================================================
-- 20251119180300_add_indexes.sql
-- Robust index creation for registrations, auth.users, and payments
-- All guarded so they only run if the underlying tables/columns exist
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1) Ensure case-insensitive unique email on registrations (if table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'registrations'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS registrations_email_lower_unique_idx
      ON public.registrations ((lower(email)));

    COMMENT ON INDEX public.registrations_email_lower_unique_idx IS
      'Ensures email uniqueness in a case-insensitive manner on public.registrations.';
  END IF;
END $$;

-- ============================================================================
-- 2) Fast lookup on auth.users.email (case-insensitive)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'auth'
      AND table_name   = 'users'
  ) THEN
    CREATE INDEX IF NOT EXISTS auth_users_email_lower_idx
      ON auth.users ((lower(email)));

    COMMENT ON INDEX auth_users_email_lower_idx IS
      'Speeds up case-insensitive lookups on auth.users.email.';
  END IF;
END $$;

-- ============================================================================
-- 3) Unique provider_payment_id on payments, if the column exists
--    (remote may not have this column yet or at all)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'payments'
      AND column_name  = 'provider_payment_id'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_unique_idx
      ON public.payments(provider_payment_id)
      WHERE provider_payment_id IS NOT NULL;

    COMMENT ON INDEX payments_provider_reference_unique_idx IS
      'Ensures provider_payment_id is unique when present on public.payments.';
  END IF;
END $$;

COMMIT;
