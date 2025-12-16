-- Ensure the freelancers relation exists with the columns expected by the frontend and edge functions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'freelancers'
  ) THEN
    CREATE TABLE public.freelancers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      name text,
      full_name text,
      title text,
      email text,
      skills text[] DEFAULT ARRAY[]::text[],
      bio text,
      status text NOT NULL DEFAULT 'active',
      availability_status text NOT NULL DEFAULT 'available',
      hourly_rate numeric(12,2),
      currency text NOT NULL DEFAULT 'ZMW',
      location text,
      country text,
      rating numeric(4,2) DEFAULT 5,
      reviews_count integer DEFAULT 0,
      profile_image_url text,
      years_experience integer DEFAULT 0,
      linkedin_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Align existing freelancers table with expected columns
ALTER TABLE public.freelancers
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS hourly_rate numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZMW',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS rating numeric(4,2) DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS years_experience integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.freelancers
  ALTER COLUMN availability_status SET DEFAULT 'available',
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN currency SET DEFAULT 'ZMW';

-- Backfill name and availability defaults for existing rows
UPDATE public.freelancers
SET
  name = COALESCE(name, full_name, name),
  availability_status = COALESCE(availability_status, status, 'available'),
  currency = COALESCE(currency, 'ZMW'),
  status = COALESCE(status, 'active')
WHERE name IS NULL
   OR availability_status IS NULL
   OR currency IS NULL
   OR status IS NULL;

-- Ensure RLS is enabled for PostgREST visibility
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;

-- Allow public read access to available freelancers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'freelancers'
      AND policyname = 'Public can read available freelancers'
  ) THEN
    CREATE POLICY "Public can read available freelancers" ON public.freelancers
      FOR SELECT
      TO anon, authenticated
      USING (availability_status = 'available');
  END IF;
END $$;
