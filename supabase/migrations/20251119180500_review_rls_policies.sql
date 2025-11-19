-- ============================================================================
-- Review and Update All RLS Policies for Production
-- ============================================================================
-- This migration ensures all tables have proper RLS policies configured
-- for production use. It reviews existing policies and adds missing ones.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROFILES TABLE RLS
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for consistency
DROP POLICY IF EXISTS "Profiles are viewable by owners" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are insertable by owners" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are updatable by owners" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;

-- Create clean, consistent policies
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role has full access
CREATE POLICY "profiles_service_role"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ASSESSMENT TABLES RLS (All follow same pattern)
-- ============================================================================

-- SME Needs Assessments
ALTER TABLE public.sme_needs_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SME assessments are viewable by owners" ON public.sme_needs_assessments;
DROP POLICY IF EXISTS "SME assessments are manageable by owners" ON public.sme_needs_assessments;
DROP POLICY IF EXISTS "SME assessments managed by service role" ON public.sme_needs_assessments;

CREATE POLICY "sme_assessments_own"
  ON public.sme_needs_assessments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sme_assessments_service_role"
  ON public.sme_needs_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Professional Needs Assessments
ALTER TABLE public.professional_needs_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professional assessments are viewable by owners" ON public.professional_needs_assessments;
DROP POLICY IF EXISTS "Professional assessments are manageable by owners" ON public.professional_needs_assessments;
DROP POLICY IF EXISTS "Professional assessments managed by service role" ON public.professional_needs_assessments;

CREATE POLICY "professional_assessments_own"
  ON public.professional_needs_assessments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "professional_assessments_service_role"
  ON public.professional_needs_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Investor Needs Assessments
ALTER TABLE public.investor_needs_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Investor assessments are viewable by owners" ON public.investor_needs_assessments;
DROP POLICY IF EXISTS "Investor assessments are manageable by owners" ON public.investor_needs_assessments;
DROP POLICY IF EXISTS "Investor assessments managed by service role" ON public.investor_needs_assessments;

CREATE POLICY "investor_assessments_own"
  ON public.investor_needs_assessments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "investor_assessments_service_role"
  ON public.investor_needs_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Donor Needs Assessments
ALTER TABLE public.donor_needs_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Donor assessments are viewable by owners" ON public.donor_needs_assessments;
DROP POLICY IF EXISTS "Donor assessments are manageable by owners" ON public.donor_needs_assessments;
DROP POLICY IF EXISTS "Donor assessments managed by service role" ON public.donor_needs_assessments;

CREATE POLICY "donor_assessments_own"
  ON public.donor_needs_assessments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "donor_assessments_service_role"
  ON public.donor_needs_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Government Needs Assessments
ALTER TABLE public.government_needs_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Government assessments are viewable by owners" ON public.government_needs_assessments;
DROP POLICY IF EXISTS "Government assessments are manageable by owners" ON public.government_needs_assessments;
DROP POLICY IF EXISTS "Government assessments managed by service role" ON public.government_needs_assessments;

CREATE POLICY "government_assessments_own"
  ON public.government_needs_assessments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "government_assessments_service_role"
  ON public.government_needs_assessments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE RLS
-- ============================================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Subscription plans are viewable" ON public.subscription_plans;
DROP POLICY IF EXISTS "Subscription plans managed by service role" ON public.subscription_plans;

-- Anyone can read subscription plans
CREATE POLICY "subscription_plans_select_all"
  ON public.subscription_plans
  FOR SELECT
  USING (true);

-- Only service role can modify
CREATE POLICY "subscription_plans_service_role"
  ON public.subscription_plans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE RLS
-- ============================================================================

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User subscriptions are viewable by owners" ON public.user_subscriptions;
DROP POLICY IF EXISTS "User subscriptions are manageable by owners" ON public.user_subscriptions;
DROP POLICY IF EXISTS "User subscriptions managed by service role" ON public.user_subscriptions;

CREATE POLICY "user_subscriptions_own"
  ON public.user_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_service_role"
  ON public.user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRANSACTIONS TABLE RLS
-- ============================================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Transactions are viewable by owners" ON public.transactions;
DROP POLICY IF EXISTS "Transactions are manageable by owners" ON public.transactions;
DROP POLICY IF EXISTS "Transactions managed by service role" ON public.transactions;

CREATE POLICY "transactions_own"
  ON public.transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "transactions_service_role"
  ON public.transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PAYMENTS TABLE RLS
-- ============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Payments are viewable by owners" ON public.payments;
DROP POLICY IF EXISTS "Payments are manageable by owners" ON public.payments;
DROP POLICY IF EXISTS "Payments managed by service role" ON public.payments;

CREATE POLICY "payments_own"
  ON public.payments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "payments_service_role"
  ON public.payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- WEBHOOK_LOGS TABLE RLS
-- ============================================================================

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Webhook logs managed by service role" ON public.webhook_logs;

-- Only service role can access webhook logs
CREATE POLICY "webhook_logs_service_role"
  ON public.webhook_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUDIT_LOGS TABLE RLS (from previous migration)
-- ============================================================================

-- Policies should already exist from 20251119180000_add_audit_logs.sql
-- Verify they exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND polname = 'audit_logs_select_own'
  ) THEN
    CREATE POLICY "audit_logs_select_own"
      ON public.audit_logs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND polname = 'audit_logs_service_role'
  ) THEN
    CREATE POLICY "audit_logs_service_role"
      ON public.audit_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- USER_ROLES TABLE RLS (from previous migration)
-- ============================================================================

-- Policies should already exist from 20251119180100_add_user_roles.sql
-- Verify they exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND polname = 'user_roles_select_own'
  ) THEN
    CREATE POLICY "user_roles_select_own"
      ON public.user_roles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_roles'
      AND polname = 'user_roles_service_role'
  ) THEN
    CREATE POLICY "user_roles_service_role"
      ON public.user_roles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;
