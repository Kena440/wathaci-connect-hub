-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'successful', 'failed', 'refunded', 'cancelled');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due', 'trialing');

-- Create transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('service_purchase', 'subscription', 'platform_fee', 'payout', 'refund');

-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  account_type TEXT NOT NULL,
  price_zmw NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id),
  transaction_type transaction_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  platform_fee NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2),
  status payment_status NOT NULL DEFAULT 'pending',
  lenco_reference TEXT,
  lenco_transaction_id TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  service_id UUID,
  subscription_id UUID REFERENCES public.subscriptions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create platform_fee_tiers table for tiered fees
CREATE TABLE public.platform_fee_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_amount NUMERIC(10,2) NOT NULL,
  max_amount NUMERIC(10,2),
  fee_percentage NUMERIC(5,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wallet/payment_accounts table
CREATE TABLE public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance_zmw NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_balance_zmw NUMERIC(10,2) NOT NULL DEFAULT 0,
  pending_balance_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  lenco_account_id TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  mobile_money_number TEXT,
  mobile_money_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_fee_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Subscription plans are public read
CREATE POLICY "Anyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Admin can manage subscription plans
CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

-- Platform fee tiers are public read
CREATE POLICY "Anyone can view platform fee tiers"
ON public.platform_fee_tiers
FOR SELECT
USING (is_active = true);

-- Users can view their own payment account
CREATE POLICY "Users can view their own payment account"
ON public.payment_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own payment account
CREATE POLICY "Users can update their own payment account"
ON public.payment_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own payment account
CREATE POLICY "Users can insert their own payment account"
ON public.payment_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_accounts_updated_at
BEFORE UPDATE ON public.payment_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, description, account_type, price_zmw, price_usd, billing_interval, features) VALUES
('Sole Proprietor Basic', 'Essential tools for individual entrepreneurs', 'sole_proprietor', 99.00, 5.00, 'monthly', '["Basic profile listing", "5 marketplace posts/month", "Email support"]'),
('Sole Proprietor Pro', 'Advanced features for growing businesses', 'sole_proprietor', 249.00, 12.00, 'monthly', '["Featured profile listing", "Unlimited marketplace posts", "Priority support", "Analytics dashboard"]'),
('Professional Basic', 'For professionals offering services', 'professional', 149.00, 7.50, 'monthly', '["Professional profile", "10 client connections/month", "Portfolio showcase"]'),
('Professional Pro', 'Premium features for established professionals', 'professional', 349.00, 17.50, 'monthly', '["Verified badge", "Unlimited client connections", "Featured listings", "Advanced analytics"]'),
('SME Starter', 'For small and medium enterprises', 'sme', 299.00, 15.00, 'monthly', '["Company profile", "20 marketplace listings", "Team access (3 users)", "Basic compliance tools"]'),
('SME Growth', 'Scale your business operations', 'sme', 599.00, 30.00, 'monthly', '["Unlimited listings", "Team access (10 users)", "Advanced compliance", "Investor matching", "Priority support"]'),
('Investor Basic', 'Access investment opportunities', 'investor', 199.00, 10.00, 'monthly', '["Browse SME directory", "5 connection requests/month", "Investment alerts"]'),
('Investor Premium', 'Full access to investment ecosystem', 'investor', 499.00, 25.00, 'monthly', '["Unlimited connections", "Priority deal flow", "Due diligence tools", "Co-investment network"]'),
('Donor Access', 'For donors and funding organizations', 'donor', 0.00, 0.00, 'monthly', '["Full platform access", "Impact tracking", "Grant management"]'),
('Government Portal', 'Government and regulatory access', 'government', 0.00, 0.00, 'monthly', '["Full platform access", "Compliance monitoring", "Report generation"]');

-- Insert default platform fee tiers (ZMW)
INSERT INTO public.platform_fee_tiers (min_amount, max_amount, fee_percentage, currency) VALUES
(0, 500, 5.00, 'ZMW'),
(500.01, 2000, 4.00, 'ZMW'),
(2000.01, 10000, 3.00, 'ZMW'),
(10000.01, NULL, 2.50, 'ZMW');

-- Insert default platform fee tiers (USD)
INSERT INTO public.platform_fee_tiers (min_amount, max_amount, fee_percentage, currency) VALUES
(0, 25, 5.00, 'USD'),
(25.01, 100, 4.00, 'USD'),
(100.01, 500, 3.00, 'USD'),
(500.01, NULL, 2.50, 'USD');

-- Function to calculate platform fee based on amount
CREATE OR REPLACE FUNCTION public.calculate_platform_fee(p_amount NUMERIC, p_currency TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_fee_percentage NUMERIC;
BEGIN
  SELECT fee_percentage INTO v_fee_percentage
  FROM public.platform_fee_tiers
  WHERE currency = p_currency
    AND is_active = true
    AND p_amount >= min_amount
    AND (max_amount IS NULL OR p_amount <= max_amount)
  LIMIT 1;
  
  IF v_fee_percentage IS NULL THEN
    v_fee_percentage := 5.00; -- Default 5%
  END IF;
  
  RETURN ROUND(p_amount * (v_fee_percentage / 100), 2);
END;
$$;

-- Function to create payment account for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_payment_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_accounts (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger to create payment account on user creation
CREATE TRIGGER on_auth_user_created_payment_account
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_payment_account();