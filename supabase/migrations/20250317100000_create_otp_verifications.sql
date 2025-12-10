-- Create OTP verifications table for secure OTP storage
-- This table stores hashed OTP codes for phone number verification via SMS/WhatsApp

BEGIN;

-- Create the otp_verifications table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  hashed_code text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS otp_verifications_phone_idx ON public.otp_verifications(phone);
CREATE INDEX IF NOT EXISTS otp_verifications_expires_at_idx ON public.otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS otp_verifications_user_id_idx ON public.otp_verifications(user_id);

-- RLS: Enable Row Level Security
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own OTP records (if authenticated)
CREATE POLICY otp_verifications_user_access ON public.otp_verifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policy: Service role can access all records (for backend operations)
-- Note: This is implicit as service_role bypasses RLS

-- Add comment for documentation
-- Add comment for documentation
COMMENT ON TABLE public.otp_verifications IS
  'Stores OTP verification codes for phone number verification via SMS and WhatsApp. Used for SMS and WhatsApp OTP flows and related verification logic.';

COMMIT;
