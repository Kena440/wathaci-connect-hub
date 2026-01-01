-- ============================================
-- WATHACI CONNECT: Payment & Entitlement System
-- Production-Ready Migration
-- ============================================

-- 1. Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}',
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);

-- Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update webhook events (via edge functions)
CREATE POLICY "Service role can manage webhook events"
  ON public.webhook_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 2. Add idempotency_key to transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN idempotency_key text UNIQUE;
  END IF;
END $$;

-- 3. Create atomic wallet transaction function
CREATE OR REPLACE FUNCTION public.apply_wallet_transaction(
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_transaction_type text,
  p_description text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_provider_reference text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_tx record;
  v_transaction_id uuid;
  v_balance_field text;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- Check for idempotency (prevent double-processing)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, status INTO v_existing_tx
    FROM public.transactions
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'transaction_id', v_existing_tx.id,
        'message', 'Transaction already processed'
      );
    END IF;
  END IF;

  -- Determine balance field based on currency
  IF p_currency = 'USD' THEN
    v_balance_field := 'balance_usd';
  ELSE
    v_balance_field := 'balance_zmw';
  END IF;

  -- Get current balance with row lock
  EXECUTE format(
    'SELECT %I FROM public.payment_accounts WHERE user_id = $1 FOR UPDATE',
    v_balance_field
  ) INTO v_current_balance USING p_user_id;

  IF v_current_balance IS NULL THEN
    -- Create payment account if not exists
    INSERT INTO public.payment_accounts (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    v_current_balance := 0;
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance + p_amount;

  -- Prevent negative balance for withdrawals
  IF v_new_balance < 0 AND p_amount < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'current_balance', v_current_balance,
      'requested_amount', ABS(p_amount)
    );
  END IF;

  -- Insert transaction record
  INSERT INTO public.transactions (
    user_id,
    transaction_type,
    amount,
    currency,
    status,
    description,
    idempotency_key,
    lenco_reference,
    metadata
  ) VALUES (
    p_user_id,
    p_transaction_type::transaction_type,
    ABS(p_amount),
    p_currency,
    'successful'::payment_status,
    p_description,
    p_idempotency_key,
    p_provider_reference,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  -- Update wallet balance atomically
  EXECUTE format(
    'UPDATE public.payment_accounts SET %I = $1, updated_at = now() WHERE user_id = $2',
    v_balance_field
  ) USING v_new_balance, p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance,
    'amount', p_amount
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 4. Grace period constant: January 20, 2026 00:00 Africa/Lusaka
-- Create entitlement functions

CREATE OR REPLACE FUNCTION public.get_grace_period_end()
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT '2026-01-20 00:00:00+02'::timestamptz; -- Africa/Lusaka is UTC+2
$$;

-- 5. Check if user has full access (admin, grace period, or active subscription)
CREATE OR REPLACE FUNCTION public.has_full_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_in_grace_period boolean;
  v_has_active_subscription boolean;
BEGIN
  -- Check if user is admin (always full access)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN true;
  END IF;

  -- Check if we're in grace period (before Jan 20, 2026)
  v_in_grace_period := now() < public.get_grace_period_end();
  
  IF v_in_grace_period THEN
    RETURN true;
  END IF;

  -- Check for active subscription
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status = 'active'
      AND current_period_end > now()
  ) INTO v_has_active_subscription;

  RETURN v_has_active_subscription;
END;
$$;

-- 6. Get detailed user entitlements
CREATE OR REPLACE FUNCTION public.get_user_entitlements(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_in_grace_period boolean;
  v_subscription record;
  v_plan_features jsonb;
  v_result jsonb;
BEGIN
  -- Check admin status
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  -- Check grace period
  v_in_grace_period := now() < public.get_grace_period_end();

  -- Get subscription info
  SELECT s.*, sp.features, sp.name as plan_name
  INTO v_subscription
  FROM public.subscriptions s
  LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Build entitlements response
  v_result := jsonb_build_object(
    'has_full_access', v_is_admin OR v_in_grace_period OR (v_subscription IS NOT NULL AND v_subscription.current_period_end > now()),
    'is_admin', v_is_admin,
    'in_grace_period', v_in_grace_period,
    'grace_period_end', public.get_grace_period_end(),
    'subscription', CASE 
      WHEN v_subscription IS NOT NULL THEN jsonb_build_object(
        'id', v_subscription.id,
        'status', v_subscription.status,
        'plan_name', v_subscription.plan_name,
        'current_period_end', v_subscription.current_period_end,
        'features', COALESCE(v_subscription.features, '[]'::jsonb)
      )
      ELSE NULL
    END,
    -- Feature limits for non-subscribed users after grace period
    'limits', CASE 
      WHEN v_is_admin OR v_in_grace_period OR (v_subscription IS NOT NULL AND v_subscription.current_period_end > now()) THEN jsonb_build_object(
        'funding_matches_per_month', -1, -- unlimited
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

-- 7. Admin reconciliation function
CREATE OR REPLACE FUNCTION public.admin_repair_wallet_transaction(
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  v_actor_id := auth.uid();
  
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_actor_id AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Apply the adjustment
  v_result := public.apply_wallet_transaction(
    p_user_id,
    p_amount,
    p_currency,
    'refund',
    'Admin adjustment: ' || p_reason,
    'ADMIN-' || v_actor_id::text || '-' || extract(epoch from now())::text,
    'admin',
    NULL,
    jsonb_build_object('adjusted_by', v_actor_id, 'reason', p_reason)
  );

  -- Log to audit
  INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after, metadata)
  VALUES (
    v_actor_id,
    'wallet_adjustment',
    'payment_accounts',
    p_user_id::text,
    jsonb_build_object('amount', p_amount, 'currency', p_currency),
    jsonb_build_object('reason', p_reason, 'result', v_result)
  );

  RETURN v_result;
END;
$$;

-- 8. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.transactions(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON public.transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON public.webhook_events(provider, event_id);

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.apply_wallet_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_full_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_entitlements TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_grace_period_end TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_repair_wallet_transaction TO authenticated;