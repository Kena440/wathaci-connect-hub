
-- Time-boxed promotion window: August 2026 (UTC). Reversible: drop/replace this function.
CREATE OR REPLACE FUNCTION public.is_promo_free_period()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT now() >= '2026-08-01 00:00:00+00'::timestamptz
     AND now() <  '2026-09-01 00:00:00+00'::timestamptz;
$$;

CREATE OR REPLACE FUNCTION public.has_full_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_in_grace_period boolean;
  v_has_active_subscription boolean;
BEGIN
  -- Temporary promotion: August 2026 is free for everyone.
  IF public.is_promo_free_period() THEN RETURN true; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'::public.app_role
  ) INTO v_is_admin;
  IF v_is_admin THEN RETURN true; END IF;

  v_in_grace_period := now() < public.get_grace_period_end();
  IF v_in_grace_period THEN RETURN true; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
      AND current_period_end > now()
  ) INTO v_has_active_subscription;

  RETURN v_has_active_subscription;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_in_grace_period boolean;
  v_promo_free boolean;
  v_subscription record;
  v_full boolean;
  v_result jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'::public.app_role
  ) INTO v_is_admin;

  v_in_grace_period := now() < public.get_grace_period_end();
  v_promo_free := public.is_promo_free_period();

  SELECT s.*, sp.features, sp.name as plan_name
  INTO v_subscription
  FROM public.subscriptions s
  LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY
    CASE WHEN s.environment = 'live' THEN 0 ELSE 1 END,
    s.created_at DESC
  LIMIT 1;

  v_full := v_promo_free
         OR v_is_admin
         OR v_in_grace_period
         OR (v_subscription IS NOT NULL AND v_subscription.current_period_end > now());

  v_result := jsonb_build_object(
    'has_full_access', v_full,
    'is_admin', v_is_admin,
    'in_grace_period', v_in_grace_period,
    'grace_period_end', public.get_grace_period_end(),
    'promo_free_period', v_promo_free,
    'promo_free_period_end', '2026-08-31 23:59:59+00'::timestamptz,
    'subscription', CASE
      WHEN v_subscription IS NOT NULL THEN jsonb_build_object(
        'id', v_subscription.id,
        'status', v_subscription.status,
        'plan_name', COALESCE(v_subscription.plan_name, v_subscription.product_id),
        'current_period_end', v_subscription.current_period_end,
        'features', COALESCE(v_subscription.features, '[]'::jsonb),
        'environment', v_subscription.environment,
        'product_id', v_subscription.product_id,
        'price_id', v_subscription.price_id,
        'cancel_at_period_end', v_subscription.cancel_at_period_end
      )
      ELSE NULL
    END,
    'limits', CASE
      WHEN v_full THEN jsonb_build_object(
        'funding_matches_per_month', -1,
        'contact_requests_per_week', -1,
        'ai_analysis_enabled', true,
        'document_uploads_enabled', true,
        'premium_analytics', true
      )
      ELSE jsonb_build_object(
        'funding_matches_per_month', 3,
        'contact_requests_per_week', 5,
        'ai_analysis_enabled', false,
        'document_uploads_enabled', false,
        'premium_analytics', false
      )
    END
  );

  RETURN v_result;
END;
$function$;
