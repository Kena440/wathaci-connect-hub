-- Fix RLS to allow anonymous/public access to the directory view
-- The view uses security_invoker=on, so we need anon access on base tables

-- For public directory browsing, allow anonymous SELECT on profiles with account_type
DROP POLICY IF EXISTS "Allow directory browsing" ON public.profiles;
CREATE POLICY "Allow directory browsing"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (account_type IS NOT NULL);

-- Also need to allow SELECT on role-specific tables for the view JOINs
-- SME profiles - allow public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sme_profiles' AND policyname = 'Allow public directory read'
  ) THEN
    CREATE POLICY "Allow public directory read"
    ON public.sme_profiles FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- Freelancer profiles - allow public read  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'freelancer_profiles' AND policyname = 'Allow public directory read'
  ) THEN
    CREATE POLICY "Allow public directory read"
    ON public.freelancer_profiles FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- Investor profiles - already has public read policy
-- Government profiles - allow public read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'government_profiles' AND policyname = 'Allow public directory read'
  ) THEN
    CREATE POLICY "Allow public directory read"
    ON public.government_profiles FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;