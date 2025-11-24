-- ============================================================================
-- Add Check Constraints for Data Quality and Validation
-- ============================================================================
-- This migration adds check constraints to ensure data integrity and
-- prevent invalid data from being inserted into the database.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROFILES TABLE CONSTRAINTS
-- ============================================================================

-- Validate account_type enum (safe idempotent approach)
DO $$
BEGIN
  -- Drop constraint if it exists with old definition
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_account_type_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_account_type_check;
  END IF;
  
  -- Add constraint
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_type_check
    CHECK (account_type IN (
      'sole_proprietor', 'professional', 'sme',
      'investor', 'donor', 'government'
    ));
END $$;

-- Validate email format (basic check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_email_format_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_email_format_check
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Ensure positive numeric values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_employee_count_positive'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_employee_count_positive
      CHECK (employee_count IS NULL OR employee_count >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_annual_revenue_positive'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_annual_revenue_positive
      CHECK (annual_revenue IS NULL OR annual_revenue >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_experience_years_positive'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_experience_years_positive
      CHECK (experience_years IS NULL OR experience_years >= 0);
  END IF;
END $$;

-- ============================================================================
-- TRANSACTIONS TABLE CONSTRAINTS
-- ============================================================================

-- Amount must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_amount_positive'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;

-- Validate status enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_status_check'
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT transactions_status_check;
  END IF;
  
  ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled'));
END $$;

-- Validate currency (common currencies)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_currency_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_currency_check
      CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP'));
  END IF;
END $$;

-- ============================================================================
-- PAYMENTS TABLE CONSTRAINTS
-- ============================================================================

-- Amount must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_amount_positive'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_amount_positive
      CHECK (amount > 0);
  END IF;
END $$;

-- Validate status enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_status_check'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
  END IF;
  
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled'));
END $$;

-- Validate currency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_currency_check'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_currency_check
      CHECK (currency IN ('NGN', 'USD', 'EUR', 'GBP'));
  END IF;
END $$;

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE CONSTRAINTS
-- ============================================================================

-- Validate status enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_subscriptions_status_check'
  ) THEN
    ALTER TABLE public.user_subscriptions DROP CONSTRAINT user_subscriptions_status_check;
  END IF;
  
  ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_status_check
    CHECK (status IN ('pending', 'active', 'cancelled', 'expired'));
END $$;

-- Validate payment_status enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_subscriptions_payment_status_check'
  ) THEN
    ALTER TABLE public.user_subscriptions DROP CONSTRAINT user_subscriptions_payment_status_check;
  END IF;
  
  ALTER TABLE public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
END $$;

-- End date must be after start date if set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_subscriptions_date_order_check'
  ) THEN
    ALTER TABLE public.user_subscriptions
      ADD CONSTRAINT user_subscriptions_date_order_check
      CHECK (end_date IS NULL OR end_date > start_date);
  END IF;
END $$;

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE CONSTRAINTS
-- ============================================================================

-- lenco_amount must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscription_plans_lenco_amount_positive'
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_lenco_amount_positive
      CHECK (lenco_amount > 0);
  END IF;
END $$;

COMMIT;
