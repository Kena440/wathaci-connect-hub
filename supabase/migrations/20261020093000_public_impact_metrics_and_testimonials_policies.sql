-- Ensure public impact metrics and testimonials are safely readable for anonymous users
DO $$
BEGIN
  -- Create impact_metrics table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'impact_metrics'
  ) THEN
    CREATE TABLE public.impact_metrics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      label text NOT NULL,
      value numeric,
      suffix text,
      is_public boolean DEFAULT true,
      sort_order integer,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  -- Ensure helpful indexes for ordering and filtering
  CREATE INDEX IF NOT EXISTS impact_metrics_public_idx ON public.impact_metrics (is_public, sort_order NULLS LAST);

  ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;

  -- Reset public impact metrics policies
  DROP POLICY IF EXISTS "Public can read public impact metrics" ON public.impact_metrics;
  CREATE POLICY "Public can read public impact metrics"
    ON public.impact_metrics
    FOR SELECT
    TO anon, authenticated
    USING (is_public = true);

  GRANT SELECT ON public.impact_metrics TO anon, authenticated;
  GRANT ALL ON public.impact_metrics TO service_role;

  -- Harden testimonials read policies for anonymous users
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testimonials'
  ) THEN
    ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read of active testimonials" ON public.testimonials;
    DROP POLICY IF EXISTS "Allow public read active testimonials" ON public.testimonials;
    DROP POLICY IF EXISTS "Allow public read of active featured testimonials" ON public.testimonials;
    DROP POLICY IF EXISTS "Public can read active testimonials" ON public.testimonials;

    CREATE POLICY "Public can read active testimonials"
      ON public.testimonials
      FOR SELECT
      TO anon, authenticated
      USING (status = 'active');

    DROP POLICY IF EXISTS "Allow service role full access to testimonials" ON public.testimonials;
    CREATE POLICY "Allow service role full access to testimonials"
      ON public.testimonials
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    DROP POLICY IF EXISTS "Only service role can insert testimonials" ON public.testimonials;
    CREATE POLICY "Only service role can insert testimonials"
      ON public.testimonials
      FOR INSERT
      TO service_role
      WITH CHECK (auth.role() = 'service_role');

    DROP POLICY IF EXISTS "Only service role can update testimonials" ON public.testimonials;
    CREATE POLICY "Only service role can update testimonials"
      ON public.testimonials
      FOR UPDATE
      TO service_role
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');

    GRANT SELECT ON public.testimonials TO anon, authenticated;
    GRANT ALL ON public.testimonials TO service_role;
  END IF;

  NOTIFY pgrst, 'reload schema';
END$$;
