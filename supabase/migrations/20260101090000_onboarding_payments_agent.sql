BEGIN;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_status_enum') THEN
    CREATE TYPE public.profile_status_enum AS ENUM ('incomplete', 'pending_verification', 'active');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
    CREATE TYPE public.subscription_status_enum AS ENUM ('active', 'expired', 'canceled', 'grace_period');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE public.payment_status_enum AS ENUM ('initiated', 'pending', 'succeeded', 'failed', 'refunded');
  END IF;
END
$$;

-- Profiles guardrails
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status profile_status_enum NOT NULL DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS payment_phone text,
  ADD COLUMN IF NOT EXISTS use_same_phone boolean,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

UPDATE public.profiles
SET user_id = id
WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(status);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  payment_provider text NOT NULL,
  provider_payment_id text,
  status payment_status_enum NOT NULL DEFAULT 'initiated',
  type text NOT NULL DEFAULT 'subscription',
  metadata jsonb,
  reference text UNIQUE,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

-- Ensure all expected columns exist even if payments table pre-dates this migration
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS provider_reference text,
  ADD COLUMN IF NOT EXISTS lenco_transaction_id text;

-- Only create the index if the column now exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'payments'
      AND column_name  = 'provider_payment_id'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_unique_idx
      ON public.payments(provider_payment_id)
      WHERE provider_payment_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payments_user_status_idx
  ON public.payments(user_id, status);


-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan_code text NOT NULL,
  status subscription_status_enum NOT NULL DEFAULT 'grace_period',
  valid_from timestamptz DEFAULT timezone('utc', now()),
  valid_to timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS subscriptions_user_status_idx
  ON public.subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS subscriptions_plan_idx
  ON public.subscriptions(plan_code);

-- Agent logs
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb,
  status text NOT NULL DEFAULT 'info',
  message text,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS agent_logs_user_event_idx
  ON public.agent_logs(user_id, event_type);

-- Bookkeeping triggers
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

COMMIT;
