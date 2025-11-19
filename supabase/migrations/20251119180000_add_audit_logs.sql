-- ============================================================================
-- Add Audit Logs Table for Tracking User Actions
-- ============================================================================
-- This migration creates the audit_logs table to track all user actions
-- for security, debugging, and compliance purposes.
-- ============================================================================

BEGIN;

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_type_idx ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "audit_logs_select_own" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_role" ON public.audit_logs;

-- Allow users to view their own audit logs
CREATE POLICY "audit_logs_select_own"
  ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "audit_logs_service_role"
  ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.audit_logs IS 'Tracks all user actions for security and audit purposes';
COMMENT ON COLUMN public.audit_logs.action_type IS 'Type of action: create, update, delete, login, logout, password_change';
COMMENT ON COLUMN public.audit_logs.old_data IS 'Previous state of the record (for updates/deletes)';
COMMENT ON COLUMN public.audit_logs.new_data IS 'New state of the record (for creates/updates)';

COMMIT;
