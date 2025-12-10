-- Create registrations table for backend user registration tracking
-- This table is used by the backend API to store initial user registrations
-- before they complete the full Supabase authentication flow

BEGIN;

-- Create the registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  account_type text NOT NULL,
  company text,
  mobile_number text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  registered_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Create index for efficient lookups by email
CREATE INDEX IF NOT EXISTS registrations_email_idx ON public.registrations(email);
CREATE INDEX IF NOT EXISTS registrations_created_at_idx ON public.registrations(created_at);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_registrations_updated_at ON public.registrations;
CREATE TRIGGER set_registrations_updated_at
BEFORE UPDATE ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS: Enable Row Level Security
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role to manage all registrations (backend API)
-- Individual users don't need to access this table directly
-- Service role bypasses RLS by default

-- Add comment for documentation
COMMENT ON TABLE public.registrations IS
  'Stores initial user registrations from the backend API. Used to capture early onboarding data and status flags before profile completion.';

COMMIT;
