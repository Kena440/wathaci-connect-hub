-- ============================================================================
-- Profile Errors Table for Debugging User Creation Issues
-- ============================================================================
-- This table logs errors that occur during profile creation via triggers.
-- It helps diagnose "Database error saving new user" issues without causing
-- user signup to fail completely.
-- ============================================================================

BEGIN;

-- Create table to log profile creation errors
CREATE TABLE IF NOT EXISTS public.profile_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, -- May be NULL if we can't extract the user ID
  error_message text NOT NULL,
  error_detail text,
  error_hint text,
  error_context text,
  error_time timestamptz NOT NULL DEFAULT timezone('utc', now()),
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  notes text
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS profile_errors_user_id_idx ON public.profile_errors(user_id);
CREATE INDEX IF NOT EXISTS profile_errors_error_time_idx ON public.profile_errors(error_time DESC);
CREATE INDEX IF NOT EXISTS profile_errors_resolved_idx ON public.profile_errors(resolved) WHERE NOT resolved;

-- Enable RLS but allow service role to access everything
ALTER TABLE public.profile_errors ENABLE ROW LEVEL SECURITY;

-- Admin users can view all errors
DROP POLICY IF EXISTS profile_errors_admin_all ON public.profile_errors;
CREATE POLICY profile_errors_admin_all ON public.profile_errors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.account_type = 'ADMIN'
    )
  );

-- Service role can do everything (for trigger use)
-- No policy needed - service role bypasses RLS

-- Add helpful comments
COMMENT ON TABLE public.profile_errors IS 'Logs errors that occur during profile creation to help diagnose signup issues';
COMMENT ON COLUMN public.profile_errors.user_id IS 'The auth.users.id if available when error occurred';
COMMENT ON COLUMN public.profile_errors.error_message IS 'Main error message from SQLERRM';
COMMENT ON COLUMN public.profile_errors.error_detail IS 'Additional error details from SQLSTATE or exception';
COMMENT ON COLUMN public.profile_errors.error_context IS 'Context about what was being attempted when error occurred';

COMMIT;
