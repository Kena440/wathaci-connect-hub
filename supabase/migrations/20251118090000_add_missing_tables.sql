-- Ensure subscription_plans table exists for frontend plan browsing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
    CREATE TABLE subscription_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      price text NOT NULL,
      period text NOT NULL,
      description text,
      features text[] DEFAULT ARRAY[]::text[],
      popular boolean DEFAULT false,
      lenco_amount integer NOT NULL,
      user_types text[] DEFAULT ARRAY[]::text[],
      category text NOT NULL DEFAULT 'basic',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Ensure user_subscriptions table exists for managing user plans
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_subscriptions') THEN
    CREATE TABLE user_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
      plan_id uuid REFERENCES subscription_plans (id) ON DELETE SET NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
      start_date timestamptz NOT NULL,
      end_date timestamptz NOT NULL,
      payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
      payment_reference text,
      auto_renew boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Ensure transactions table exists for payment tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    CREATE TABLE transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
      subscription_id uuid REFERENCES user_subscriptions (id) ON DELETE SET NULL,
      amount numeric(12,2) NOT NULL,
      currency text NOT NULL DEFAULT 'ZMW',
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
      payment_method text NOT NULL CHECK (payment_method IN ('phone', 'card')),
      reference_number text UNIQUE NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Ensure marketplace_orders table exists for checkout logging
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_orders') THEN
    CREATE TABLE marketplace_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
      items jsonb NOT NULL,
      total_amount numeric(12,2) NOT NULL,
      payment_reference text,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Ensure freelancers directory table exists for hub and stats
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'freelancers') THEN
    CREATE TABLE freelancers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
      full_name text,
      email text,
      skills text[] DEFAULT ARRAY[]::text[],
      bio text,
      status text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Ensure business_stats table exists for impact reporting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_stats') THEN
    CREATE TABLE business_stats (
      id bigserial PRIMARY KEY,
      stat_type text UNIQUE NOT NULL,
      stat_value numeric NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      order_index integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS and policies for user-owned data
ALTER TABLE IF EXISTS user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS business_stats ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans (public read)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscription_plans' AND policyname = 'Allow public read subscription plans') THEN
    CREATE POLICY "Allow public read subscription plans" ON subscription_plans
      FOR SELECT USING (true);
  END IF;
END $$;

-- Policies for business_stats (public read of active stats)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'business_stats' AND policyname = 'Allow public read active stats') THEN
    CREATE POLICY "Allow public read active stats" ON business_stats
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- Policies for user-owned tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_subscriptions' AND policyname = 'Users manage own subscriptions') THEN
    CREATE POLICY "Users manage own subscriptions" ON user_subscriptions
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users manage own transactions') THEN
    CREATE POLICY "Users manage own transactions" ON transactions
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marketplace_orders' AND policyname = 'Users manage own marketplace orders') THEN
    CREATE POLICY "Users manage own marketplace orders" ON marketplace_orders
      USING (user_id IS NULL OR auth.uid() = user_id)
      WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'freelancers' AND policyname = 'Users manage own freelancer profiles') THEN
    CREATE POLICY "Users manage own freelancer profiles" ON freelancers
      USING (user_id IS NULL OR auth.uid() = user_id)
      WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
  END IF;
END $$;
