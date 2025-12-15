BEGIN;

-- Allow anonymous/public read access to active compliance templates for the Compliance Hub landing experience
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'compliance_templates'
      AND polname = 'Public can read active compliance templates'
  ) THEN
    CREATE POLICY "Public can read active compliance templates"
      ON public.compliance_templates
      FOR SELECT
      USING (is_active = true);
  END IF;
END
$$;

COMMIT;
