-- Add Paddle-specific columns to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS product_id text,
  ADD COLUMN IF NOT EXISTS price_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

-- Add unique constraints for Paddle
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_paddle_id 
  ON public.subscriptions(paddle_subscription_id) WHERE paddle_subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_env 
  ON public.subscriptions(user_id, environment);

CREATE INDEX IF NOT EXISTS idx_subscriptions_environment 
  ON public.subscriptions(environment);

-- Update has_active_subscription to filter by environment
CREATE OR REPLACE FUNCTION public.has_active_subscription(
  user_uuid uuid,
  check_env text DEFAULT 'live'
)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
    AND environment = check_env
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- Update has_full_access to check both environments
CREATE OR REPLACE FUNCTION public.has_full_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_in_grace_period boolean;
  v_has_active_subscription boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
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
$$;

-- Update get_user_entitlements to handle Paddle fields
CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_admin boolean;
  v_in_grace_period boolean;
  v_subscription record;
  v_result jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  v_in_grace_period := now() < public.get_grace_period_end();

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

  v_result := jsonb_build_object(
    'has_full_access', v_is_admin OR v_in_grace_period OR (v_subscription IS NOT NULL AND v_subscription.current_period_end > now()),
    'is_admin', v_is_admin,
    'in_grace_period', v_in_grace_period,
    'grace_period_end', public.get_grace_period_end(),
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
      WHEN v_is_admin OR v_in_grace_period OR (v_subscription IS NOT NULL AND v_subscription.current_period_end > now()) THEN jsonb_build_object(
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
$$;