-- ============================================================================
-- Add Performance Indexes for Commonly Queried Columns
-- ============================================================================
-- This migration adds indexes to optimize query performance on frequently
-- accessed columns across all tables.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================

-- Case-insensitive email index for lookups and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx 
  ON public.profiles(lower(email));

-- Index for filtering by account type
CREATE INDEX IF NOT EXISTS profiles_account_type_idx 
  ON public.profiles(account_type) 
  WHERE account_type IS NOT NULL;

-- Index for filtering by country
CREATE INDEX IF NOT EXISTS profiles_country_idx 
  ON public.profiles(country) 
  WHERE country IS NOT NULL;

-- Index for created_at (for sorting and date range queries)
CREATE INDEX IF NOT EXISTS profiles_created_at_idx 
  ON public.profiles(created_at);

-- Index for profile_completed (for filtering incomplete profiles)
CREATE INDEX IF NOT EXISTS profiles_completed_idx 
  ON public.profiles(profile_completed);

-- Composite index for common query pattern: account_type + country
CREATE INDEX IF NOT EXISTS profiles_account_type_country_idx 
  ON public.profiles(account_type, country) 
  WHERE account_type IS NOT NULL AND country IS NOT NULL;

-- ============================================================================
-- TRANSACTIONS TABLE INDEXES
-- ============================================================================

-- Index on user_id (already exists, ensure it's there)
CREATE INDEX IF NOT EXISTS transactions_user_id_idx 
  ON public.transactions(user_id);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS transactions_status_idx 
  ON public.transactions(status);

-- Unique index on reference_number (already should exist)
CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_unique_idx 
  ON public.transactions(reference_number);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS transactions_created_at_idx 
  ON public.transactions(created_at);

-- Composite index for common query: user_id + status
CREATE INDEX IF NOT EXISTS transactions_user_status_idx 
  ON public.transactions(user_id, status);

-- ============================================================================
-- PAYMENTS TABLE INDEXES
-- ============================================================================

-- Index on user_id (already exists, ensure it's there)
CREATE INDEX IF NOT EXISTS payments_user_id_idx 
  ON public.payments(user_id);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS payments_status_idx 
  ON public.payments(status);

-- Unique index on provider_reference (already should exist)
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_unique_idx 
  ON public.payments(provider_reference) 
  WHERE provider_reference IS NOT NULL;

-- Unique index on reference (already should exist)
CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_unique_idx 
  ON public.payments(reference) 
  WHERE reference IS NOT NULL;

-- Index on lenco_transaction_id for webhook lookups
CREATE INDEX IF NOT EXISTS payments_lenco_transaction_id_idx 
  ON public.payments(lenco_transaction_id) 
  WHERE lenco_transaction_id IS NOT NULL;

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS payments_created_at_idx 
  ON public.payments(created_at);

-- Composite index for common query: user_id + status
CREATE INDEX IF NOT EXISTS payments_user_status_idx 
  ON public.payments(user_id, status);

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE INDEXES
-- ============================================================================

-- Index on user_id (already exists, ensure it's there)
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx 
  ON public.user_subscriptions(user_id);

-- Index on plan_id
CREATE INDEX IF NOT EXISTS user_subscriptions_plan_id_idx 
  ON public.user_subscriptions(plan_id);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx 
  ON public.user_subscriptions(status);

-- Index on payment_status for filtering
CREATE INDEX IF NOT EXISTS user_subscriptions_payment_status_idx 
  ON public.user_subscriptions(payment_status);

-- Index on start_date for date range queries
CREATE INDEX IF NOT EXISTS user_subscriptions_start_date_idx 
  ON public.user_subscriptions(start_date);

-- Index on end_date for expiry checks
CREATE INDEX IF NOT EXISTS user_subscriptions_end_date_idx 
  ON public.user_subscriptions(end_date) 
  WHERE end_date IS NOT NULL;

-- Composite index for active subscriptions
CREATE INDEX IF NOT EXISTS user_subscriptions_active_idx 
  ON public.user_subscriptions(user_id, status) 
  WHERE status = 'active';

-- ============================================================================
-- SUBSCRIPTION_PLANS TABLE INDEXES
-- ============================================================================

-- Unique index on name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_name_unique_idx 
  ON public.subscription_plans(lower(name));

-- Index on category for filtering
CREATE INDEX IF NOT EXISTS subscription_plans_category_idx 
  ON public.subscription_plans(category);

-- Index on popular flag for featured plans
CREATE INDEX IF NOT EXISTS subscription_plans_popular_idx 
  ON public.subscription_plans(popular) 
  WHERE popular = true;

-- ============================================================================
-- WEBHOOK_LOGS TABLE INDEXES
-- ============================================================================

-- Index on reference for lookups
CREATE INDEX IF NOT EXISTS webhook_logs_reference_idx 
  ON public.webhook_logs(reference);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS webhook_logs_status_idx 
  ON public.webhook_logs(status);

-- Index on event_type for filtering
CREATE INDEX IF NOT EXISTS webhook_logs_event_type_idx 
  ON public.webhook_logs(event_type);

-- Index on processed_at for time-based queries
CREATE INDEX IF NOT EXISTS webhook_logs_processed_at_idx 
  ON public.webhook_logs(processed_at);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx 
  ON public.webhook_logs(created_at);

-- ============================================================================
-- ASSESSMENT TABLES INDEXES
-- ============================================================================

-- SME Needs Assessments
CREATE INDEX IF NOT EXISTS sme_needs_assessments_user_id_idx 
  ON public.sme_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS sme_needs_assessments_completed_at_idx 
  ON public.sme_needs_assessments(completed_at);

-- Professional Needs Assessments
CREATE INDEX IF NOT EXISTS professional_needs_assessments_user_id_idx 
  ON public.professional_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS professional_needs_assessments_completed_at_idx 
  ON public.professional_needs_assessments(completed_at);

-- Investor Needs Assessments
CREATE INDEX IF NOT EXISTS investor_needs_assessments_user_id_idx 
  ON public.investor_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS investor_needs_assessments_completed_at_idx 
  ON public.investor_needs_assessments(completed_at);

-- Donor Needs Assessments
CREATE INDEX IF NOT EXISTS donor_needs_assessments_user_id_idx 
  ON public.donor_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS donor_needs_assessments_completed_at_idx 
  ON public.donor_needs_assessments(completed_at);

-- Government Needs Assessments
CREATE INDEX IF NOT EXISTS government_needs_assessments_user_id_idx 
  ON public.government_needs_assessments(user_id);
CREATE INDEX IF NOT EXISTS government_needs_assessments_completed_at_idx 
  ON public.government_needs_assessments(completed_at);

-- ============================================================================
-- AUDIT_LOGS TABLE INDEXES (from previous migration)
-- ============================================================================

-- These should already exist from 20251119180000_add_audit_logs.sql
-- but we include them here for completeness
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx 
  ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_type_idx 
  ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx 
  ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx 
  ON public.audit_logs(created_at);

-- Composite index for common audit queries
CREATE INDEX IF NOT EXISTS audit_logs_user_table_idx 
  ON public.audit_logs(user_id, table_name);

-- ============================================================================
-- USER_ROLES TABLE INDEXES (from previous migration)
-- ============================================================================

-- These should already exist from 20251119180100_add_user_roles.sql
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx 
  ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_name_idx 
  ON public.user_roles(role_name);

COMMIT;
