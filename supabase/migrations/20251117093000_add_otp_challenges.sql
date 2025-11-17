BEGIN;

-- One-time password storage for SMS/WhatsApp login and phone verification
CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  hashed_code text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  used_at timestamptz,
  last_attempt_at timestamptz
);

CREATE INDEX IF NOT EXISTS otp_challenges_phone_channel_idx ON public.otp_challenges (phone, channel);
CREATE INDEX IF NOT EXISTS otp_challenges_expires_idx ON public.otp_challenges (expires_at);
CREATE INDEX IF NOT EXISTS otp_challenges_used_idx ON public.otp_challenges (used_at);

-- Track phone verification timestamps alongside the existing phone field
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

COMMIT;
