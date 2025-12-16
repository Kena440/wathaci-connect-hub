-- Ensure public impact metrics endpoint resolves for anonymous users
-- Covers table creation, schema alignment, policies, and schema cache reload

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create table if missing
CREATE TABLE IF NOT EXISTS public.impact_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value numeric NOT NULL,
  suffix text,
  is_public boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bring any pre-existing table into alignment with the contract
ALTER TABLE public.impact_metrics
  ALTER COLUMN value SET NOT NULL,
  ALTER COLUMN is_public SET NOT NULL,
  ALTER COLUMN is_public SET DEFAULT false,
  ALTER COLUMN sort_order SET NOT NULL,
  ALTER COLUMN sort_order SET DEFAULT 0,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now();

-- Normalise any legacy nulls before enforcing constraints
UPDATE public.impact_metrics
SET value = COALESCE(value, 0),
    is_public = COALESCE(is_public, false),
    sort_order = COALESCE(sort_order, 0),
    created_at = COALESCE(created_at, now()),
    updated_at = COALESCE(updated_at, now())
WHERE value IS NULL
   OR is_public IS NULL
   OR sort_order IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

-- Public listing index
CREATE INDEX IF NOT EXISTS idx_impact_metrics_public_sort
  ON public.impact_metrics (is_public, sort_order);

-- Keep timestamps current
DROP TRIGGER IF EXISTS trg_impact_metrics_updated_at ON public.impact_metrics;
CREATE TRIGGER trg_impact_metrics_updated_at
BEFORE UPDATE ON public.impact_metrics
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS for safe public reads
ALTER TABLE public.impact_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "impact_metrics_public_read" ON public.impact_metrics;
CREATE POLICY "impact_metrics_public_read"
  ON public.impact_metrics
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Service role retains full access for management flows
DROP POLICY IF EXISTS "impact_metrics_service_role_all" ON public.impact_metrics;
CREATE POLICY "impact_metrics_service_role_all"
  ON public.impact_metrics
  FOR ALL
  TO service_role
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.impact_metrics TO anon, authenticated;
GRANT ALL ON public.impact_metrics TO service_role;

-- Refresh PostgREST cache so the endpoint is immediately discoverable
NOTIFY pgrst, 'reload schema';
