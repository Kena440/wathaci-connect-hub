-- Ensure public testimonials endpoint remains publicly readable for active featured rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'testimonials'
  ) THEN
    ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read of active testimonials" ON public.testimonials;
    DROP POLICY IF EXISTS "Allow public read active testimonials" ON public.testimonials;

    CREATE POLICY "Allow public read of active featured testimonials"
      ON public.testimonials
      FOR SELECT
      TO anon, authenticated
      USING (status = 'active' AND featured IS TRUE);

    -- keep service role with full access for admin workflows
    DROP POLICY IF EXISTS "Allow service role full access to testimonials" ON public.testimonials;
    CREATE POLICY "Allow service role full access to testimonials"
      ON public.testimonials
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    GRANT SELECT ON public.testimonials TO anon, authenticated;
    GRANT ALL ON public.testimonials TO service_role;

    NOTIFY pgrst, 'reload schema';
  ELSE
    RAISE NOTICE 'public.testimonials does not exist; skipping policy update';
  END IF;
END$$;
