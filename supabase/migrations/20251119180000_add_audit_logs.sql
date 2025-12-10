-- ============================================================================
-- Add Audit Logs Table for Tracking User Actions (Safe + Idempotent Version)
-- ============================================================================

BEGIN;

-- 1. Create audit_logs table WITHOUT the FK constraint initially
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,  -- FK added conditionally later
  action_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Add foreign key to profiles table ONLY IF profiles exists
DO $block$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
  ) THEN
    -- Drop existing FK safely
    ALTER TABLE public.audit_logs
      DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

    -- Add FK once
    ALTER TABLE public.audit_logs
      ADD CONSTRAINT audit_logs_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END;
$block$;

-- 3. Indexes (always safe)
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_type_idx ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx  ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx  ON public.audit_logs(created_at);

-- 4. Enable RLS (table always exists by this point)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Drop & recreate policies safely
DROP POLICY IF EXISTS audit_logs_select_own   ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_service_role ON public.audit_logs;

-- Allow users to view their own audit logs
CREATE POLICY audit_logs_select_own
  ON public.audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Full access for service role
CREATE POLICY audit_logs_service_role
  ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Documentation comments (always safe)
COMMENT ON TABLE public.audit_logs IS
  'Tracks all user actions for security and audit purposes';

COMMENT ON COLUMN public.audit_logs.action_type IS
  'Type of action: create, update, delete, login, logout, password_change';

COMMENT ON COLUMN public.audit_logs.old_data IS
  'Previous state of the record (for updates/deletes)';

COMMENT ON COLUMN public.audit_logs.new_data IS
  'New state of the record (for creates/updates)';

COMMIT;
