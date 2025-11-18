-- Compliance Hub Database Schema
-- Phase 1: Tables, RLS policies, and seed data for compliance tracking

BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: compliance_templates
-- Purpose: Store predefined standard compliance items (ZRA, PACRA, NAPSA, etc.)
-- This is system data, readable by all authenticated users.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  authority TEXT NOT NULL,
  description TEXT,
  default_frequency TEXT NOT NULL CHECK (default_frequency IN ('MONTHLY', 'ANNUAL', 'QUARTERLY', 'ONE_OFF')),
  default_days_before_due_reminder INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Add index on authority for filtering
CREATE INDEX IF NOT EXISTS idx_compliance_templates_authority ON public.compliance_templates(authority);
CREATE INDEX IF NOT EXISTS idx_compliance_templates_is_active ON public.compliance_templates(is_active);

-- Enable RLS on compliance_templates
ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_templates'
      AND polname = 'Templates are viewable by authenticated users'
  ) THEN
    CREATE POLICY "Templates are viewable by authenticated users"
      ON public.compliance_templates
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- =============================================================================
-- TABLE: compliance_tasks
-- Purpose: Store user-specific compliance tasks (from templates or custom)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.compliance_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  authority TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'ONE_OFF' CHECK (frequency IN ('MONTHLY', 'ANNUAL', 'QUARTERLY', 'ONE_OFF')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'OVERDUE')),
  remind_via_email BOOLEAN NOT NULL DEFAULT true,
  remind_via_sms BOOLEAN NOT NULL DEFAULT false,
  remind_via_whatsapp BOOLEAN NOT NULL DEFAULT false,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_user_id ON public.compliance_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_due_date ON public.compliance_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_status ON public.compliance_tasks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_tasks_user_status ON public.compliance_tasks(user_id, status);

-- Enable RLS on compliance_tasks
ALTER TABLE public.compliance_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view only their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_tasks'
      AND polname = 'Tasks are viewable by owners'
  ) THEN
    CREATE POLICY "Tasks are viewable by owners"
      ON public.compliance_tasks
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Policy: Users can insert only their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_tasks'
      AND polname = 'Tasks are insertable by owners'
  ) THEN
    CREATE POLICY "Tasks are insertable by owners"
      ON public.compliance_tasks
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Policy: Users can update only their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_tasks'
      AND polname = 'Tasks are updatable by owners'
  ) THEN
    CREATE POLICY "Tasks are updatable by owners"
      ON public.compliance_tasks
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- Policy: Users can delete only their own tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_tasks'
      AND polname = 'Tasks are deletable by owners'
  ) THEN
    CREATE POLICY "Tasks are deletable by owners"
      ON public.compliance_tasks
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- =============================================================================
-- TRIGGER: Update updated_at timestamp automatically
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_compliance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Apply trigger to compliance_templates
DROP TRIGGER IF EXISTS update_compliance_templates_updated_at ON public.compliance_templates;
CREATE TRIGGER update_compliance_templates_updated_at
  BEFORE UPDATE ON public.compliance_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compliance_updated_at();

-- Apply trigger to compliance_tasks
DROP TRIGGER IF EXISTS update_compliance_tasks_updated_at ON public.compliance_tasks;
CREATE TRIGGER update_compliance_tasks_updated_at
  BEFORE UPDATE ON public.compliance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_compliance_updated_at();

-- =============================================================================
-- SEED DATA: Standard compliance templates
-- =============================================================================

-- Insert standard Zambian compliance templates
INSERT INTO public.compliance_templates (code, name, authority, description, default_frequency, default_days_before_due_reminder)
VALUES
  (
    'ZRA_MONTHLY_RETURN',
    'ZRA Monthly Tax Return',
    'ZRA',
    'Monthly tax return filing with Zambia Revenue Authority',
    'MONTHLY',
    7
  ),
  (
    'ZRA_ANNUAL_RETURN',
    'ZRA Annual Income Tax Return',
    'ZRA',
    'Annual income tax return filing with Zambia Revenue Authority',
    'ANNUAL',
    30
  ),
  (
    'PACRA_ANNUAL_RETURN',
    'PACRA Annual Return',
    'PACRA',
    'Annual company return filing with Patents and Companies Registration Agency',
    'ANNUAL',
    30
  ),
  (
    'NAPSA_MONTHLY_RETURN',
    'NAPSA Monthly Return',
    'NAPSA',
    'Monthly social security contribution filing with National Pension Scheme Authority',
    'MONTHLY',
    7
  )
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  authority = EXCLUDED.authority,
  description = EXCLUDED.description,
  default_frequency = EXCLUDED.default_frequency,
  default_days_before_due_reminder = EXCLUDED.default_days_before_due_reminder,
  updated_at = timezone('utc', now());

COMMIT;
