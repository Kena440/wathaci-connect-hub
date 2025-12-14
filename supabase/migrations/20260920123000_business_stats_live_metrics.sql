-- Live business_stats metrics derived from transactional tables
-- Adds canonical metric_key/value columns and keeps business_stats in sync via triggers

-- 1) Align schema to expose metric_key/value + unit
ALTER TABLE IF EXISTS public.business_stats
  ADD COLUMN IF NOT EXISTS metric_key text,
  ADD COLUMN IF NOT EXISTS value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit text;

UPDATE public.business_stats
SET metric_key = COALESCE(metric_key, stat_type);

ALTER TABLE IF EXISTS public.business_stats
  ALTER COLUMN metric_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_stats_metric_key_key'
      AND conrelid = 'public.business_stats'::regclass
  ) THEN
    ALTER TABLE public.business_stats ADD CONSTRAINT business_stats_metric_key_key UNIQUE (metric_key);
  END IF;
END $$;

UPDATE public.business_stats
SET value = COALESCE(value, stat_value, 0);

-- 2) Live refresh function computing metrics from source tables
CREATE OR REPLACE FUNCTION public.refresh_business_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH metrics AS (
    SELECT
      'total_users'::text AS metric_key,
      'Total Registered Users'::text AS label,
      COUNT(*)::numeric AS value,
      'users'::text AS unit,
      'Distinct profiles across all account types'::text AS description,
      1 AS order_index,
      true AS is_active
    FROM public.profiles

    UNION ALL

    SELECT
      'smes_supported',
      'SMEs Supported',
      COUNT(*)::numeric,
      'organizations',
      'Profiles with account_type IN (''sme'', ''sole_proprietor'')',
      2,
      true
    FROM public.profiles
    WHERE account_type IN ('sme', 'sole_proprietor')

    UNION ALL

    SELECT
      'professionals',
      'Business Professionals',
      COUNT(*)::numeric,
      'people',
      'Profiles with account_type = ''professional''',
      3,
      true
    FROM public.profiles
    WHERE account_type = 'professional'

    UNION ALL

    SELECT
      'freelancers_active',
      'Independent Freelancers',
      COUNT(*)::numeric,
      'people',
      'Freelancers where status is not ''inactive''',
      4,
      true
    FROM public.freelancers
    WHERE COALESCE(status, 'active') <> 'inactive'

    UNION ALL

    SELECT
      'investors',
      'Active Investors',
      COUNT(*)::numeric,
      'people',
      'Profiles with account_type = ''investor''',
      5,
      true
    FROM public.profiles
    WHERE account_type = 'investor'

    UNION ALL

    SELECT
      'donors',
      'Donors & Supporters',
      COUNT(*)::numeric,
      'people',
      'Profiles with account_type = ''donor''',
      6,
      true
    FROM public.profiles
    WHERE account_type = 'donor'

    UNION ALL

    SELECT
      'total_funding_zmw',
      'Total Funding Processed',
      COALESCE(SUM(amount), 0)::numeric,
      'ZMW',
      'Sum of transactions.amount where status = ''completed''',
      7,
      true
    FROM public.transactions
    WHERE status = 'completed'

    UNION ALL

    SELECT
      'projects_completed',
      'Projects Completed',
      COUNT(*)::numeric,
      'projects',
      'Marketplace orders where status is not pending/failed/refunded/cancelled',
      8,
      true
    FROM public.marketplace_orders
    WHERE COALESCE(status, 'pending') NOT IN ('pending', 'failed', 'refunded', 'cancelled')

    UNION ALL

    SELECT
      'jobs_supported',
      'Jobs Supported',
      COALESCE(SUM(employee_count), 0)::numeric,
      'jobs',
      'Sum of employee_count on active SME profiles',
      9,
      true
    FROM public.sme_profiles
    WHERE COALESCE(is_active, true) = true

    UNION ALL

    SELECT
      'countries_served',
      'Countries Served',
      COUNT(DISTINCT location_country)::numeric,
      'countries',
      'Distinct SME profile countries with a value',
      10,
      true
    FROM public.sme_profiles
    WHERE COALESCE(is_active, true) = true
      AND location_country IS NOT NULL
      AND length(trim(location_country)) > 0

    UNION ALL

    SELECT
      'success_stories',
      'Verified SME Stories',
      COUNT(*)::numeric,
      'stories',
      'Sme profiles approved and marked complete',
      11,
      true
    FROM public.sme_profiles
    WHERE COALESCE(is_active, true) = true
      AND approval_status = 'approved'
      AND COALESCE(is_profile_complete, false) = true
  )
  INSERT INTO public.business_stats AS bs
    (metric_key, stat_type, stat_value, value, label, description, unit, is_active, order_index)
  SELECT
    m.metric_key,
    m.metric_key,
    m.value,
    m.value,
    m.label,
    m.description,
    m.unit,
    m.is_active,
    m.order_index
  FROM metrics m
  ON CONFLICT (metric_key)
  DO UPDATE SET
    stat_type = EXCLUDED.stat_type,
    stat_value = EXCLUDED.stat_value,
    value = EXCLUDED.value,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    unit = EXCLUDED.unit,
    is_active = EXCLUDED.is_active,
    order_index = EXCLUDED.order_index,
    updated_at = timezone('utc', now());
END;
$$;

-- 3) Trigger function to refresh after relevant data changes
CREATE OR REPLACE FUNCTION public.refresh_business_stats_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_business_stats();
  RETURN NULL;
END;
$$;

-- 4) Attach refresh trigger to source tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_business_stats_on_profiles'
  ) THEN
    CREATE TRIGGER refresh_business_stats_on_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.profiles
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_business_stats_trigger();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_business_stats_on_freelancers'
  ) THEN
    CREATE TRIGGER refresh_business_stats_on_freelancers
    AFTER INSERT OR UPDATE OR DELETE ON public.freelancers
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_business_stats_trigger();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_business_stats_on_transactions'
  ) THEN
    CREATE TRIGGER refresh_business_stats_on_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_business_stats_trigger();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_business_stats_on_marketplace_orders'
  ) THEN
    CREATE TRIGGER refresh_business_stats_on_marketplace_orders
    AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_orders
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_business_stats_trigger();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'refresh_business_stats_on_sme_profiles'
  ) THEN
    CREATE TRIGGER refresh_business_stats_on_sme_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.sme_profiles
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_business_stats_trigger();
  END IF;
END;
$$;

-- 5) Seed/refresh values immediately
SELECT public.refresh_business_stats();
