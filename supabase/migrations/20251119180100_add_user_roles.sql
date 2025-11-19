-- ============================================================================
-- Add User Roles Table for Role-Based Access Control (Optional/Future)
-- ============================================================================
-- This migration creates the user_roles table to support future role-based
-- access control (RBAC). Currently not actively used but provides foundation.
-- ============================================================================

BEGIN;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  granted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Ensure a user can only have one instance of each role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_name_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_name_key UNIQUE(user_id, role_name);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS user_roles_role_name_idx ON public.user_roles(role_name);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_service_role" ON public.user_roles;

-- Users can view their own roles
CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role has full access for admin operations
CREATE POLICY "user_roles_service_role"
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.user_roles IS 'Role-based access control - currently for future use';
COMMENT ON COLUMN public.user_roles.role_name IS 'Role name: user, admin, super_admin, moderator';

COMMIT;
