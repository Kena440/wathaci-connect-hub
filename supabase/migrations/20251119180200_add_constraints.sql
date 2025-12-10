-- ============================================================================
-- SAFE & FULLY IDEMPOTENT CONSTRAINT MIGRATION
-- ============================================================================
-- This version guarantees safe execution even if tables or columns do not exist.
-- Ensures that no constraint is applied unless the target table actually exists.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SAFETY BLOCK — CREATE ALL POSSIBLE PROFILE COLUMNS
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS annual_revenue numeric,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS turnover numeric,
  ADD COLUMN IF NOT EXISTS revenue_range text,
  ADD COLUMN IF NOT EXISTS staff_total integer;

-- ============================================================================
-- PROFILES TABLE CONSTRAINTS (SAFE)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    
    -- account_type constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'profiles_account_type_check'
    ) THEN
      ALTER TABLE public.profiles DROP CONSTRAINT profiles_account_type_check;
    END IF;

    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_account_type_check
      CHECK (account_type IN (
        'sole_proprietor','professional','sme',
        'investor','donor','government'
      ));

    -- email format
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'profiles_email_format_check'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_email_format_check
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;

    -- employee_count positive
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'profiles_employee_count_positive'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_employee_count_positive
        CHECK (employee_count IS NULL OR employee_count >= 0);
    END IF;

    -- annual_revenue positive
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'profiles_annual_revenue_positive'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_annual_revenue_positive
        CHECK (annual_revenue IS NULL OR annual_revenue >= 0);
    END IF;

    -- experience_years positive
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'profiles_experience_years_positive'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_experience_years_positive
        CHECK (experience_years IS NULL OR experience_years >= 0);
    END IF;

  ELSE
    RAISE NOTICE 'Skipping PROFILE constraints — table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- TRANSACTIONS TABLE (SAFE)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'transactions'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'transactions_amount_positive'
    ) THEN
      ALTER TABLE public.transactions
        ADD CONSTRAINT transactions_amount_positive CHECK (amount > 0);
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'transactions_status_check'
    ) THEN
      ALTER TABLE public.transactions DROP CONSTRAINT transactions_status_check;
    END IF;

    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_status_check
      CHECK (status IN ('pending','success','failed','cancelled'));

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'transactions_currency_check'
    ) THEN
      ALTER TABLE public.transactions
        ADD CONSTRAINT transactions_currency_check
        CHECK (currency IN ('NGN','USD','EUR','GBP'));
    END IF;

  ELSE
    RAISE NOTICE 'Skipping TRANSACTIONS constraints — table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- PAYMENTS TABLE (SAFE)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'payments_amount_positive'
    ) THEN
      ALTER TABLE public.payments
        ADD CONSTRAINT payments_amount_positive CHECK (amount > 0);
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'payments_status_check'
    ) THEN
      ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
    END IF;

    ALTER TABLE public.payments
      ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending','success','failed','cancelled'));

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'payments_currency_check'
    ) THEN
      ALTER TABLE public.payments
        ADD CONSTRAINT payments_currency_check
        CHECK (currency IN ('NGN','USD','EUR','GBP'));
    END IF;

  ELSE
    RAISE NOTICE 'Skipping PAYMENTS constraints — table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE (SAFE)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_subscriptions'
  ) THEN

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'user_subscriptions_status_check'
    ) THEN
      ALTER TABLE public.user_subscriptions DROP CONSTRAINT user_subscriptions_status_check;
    END IF;

    ALTER TABLE public.user_subscriptions
      ADD CONSTRAINT user_subscriptions_status_check
      CHECK (status IN ('pending','active','cancelled','expired'));

    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'user_subscriptions_payment_status_check'
    ) THEN
      ALTER TABLE public.user_subscriptions DROP CONSTRAINT user_subscriptions_payment_status_check;
    END IF;

    ALTER TABLE public.user_subscriptions
      ADD CONSTRAINT user_subscriptions_payment_status_check
      CHECK (payment_status IN ('pending','paid','failed','refunded'));

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'user_subscriptions_date_order_check'
    ) THEN
      ALTER TABLE public.user_subscriptions
        ADD CONSTRAINT user_subscriptions_date_order_check
        CHECK (end_date IS NULL OR end_date > start_date);
    END IF;

  ELSE
    RAISE NOTICE 'Skipping USER_SUBSCRIPTIONS constraints — table does not exist.';
  END IF;
END;
$$;

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE (SAFE)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscription_plans'
  ) THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'subscription_plans_lenco_amount_positive'
    ) THEN
      ALTER TABLE public.subscription_plans
        ADD CONSTRAINT subscription_plans_lenco_amount_positive
        CHECK (lenco_amount > 0);
    END IF;

  ELSE
    RAISE NOTICE 'Skipping SUBSCRIPTION_PLANS constraints — table does not exist.';
  END IF;
END;
$$;

COMMIT;
