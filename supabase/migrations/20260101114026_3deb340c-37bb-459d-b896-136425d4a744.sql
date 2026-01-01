-- =====================================================
-- Push Notifications & Funding Matching System
-- =====================================================

-- 1. Push Subscriptions table for FCM/Web Push tokens
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('fcm', 'webpush')),
  endpoint text,
  p256dh text,
  auth text,
  fcm_token text,
  device_info jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Notification Preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_updates boolean DEFAULT true,
  funding_alerts boolean DEFAULT true,
  match_alerts boolean DEFAULT true,
  messages boolean DEFAULT true,
  frequency text DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  quiet_hours jsonb DEFAULT '{"enabled": false}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Notifications table for in-app inbox
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  type text NOT NULL CHECK (type IN ('funding', 'match', 'system', 'message', 'order')),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. SME Professional Matches table
CREATE TABLE IF NOT EXISTS public.sme_professional_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sme_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score numeric NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  reasons text[] DEFAULT '{}',
  recommended_scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sme_id, professional_id)
);

-- 5. PWA Install Analytics table
CREATE TABLE IF NOT EXISTS public.pwa_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('prompt_shown', 'prompt_accepted', 'prompt_dismissed', 'installed')),
  device_info jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns to funding_opportunities if not present
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'type') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'summary') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN summary text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'target_stage') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN target_stage text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'region_focus') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN region_focus text[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'requirements') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN requirements text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'source_url') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN source_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'confidence_score') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN confidence_score numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'funding_opportunities' AND column_name = 'last_checked_at') THEN
    ALTER TABLE public.funding_opportunities ADD COLUMN last_checked_at timestamptz;
  END IF;
END $$;

-- 6. Funding Matches table (SME-specific matches)
CREATE TABLE IF NOT EXISTS public.funding_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_id uuid NOT NULL REFERENCES public.funding_opportunities(id) ON DELETE CASCADE,
  sme_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score numeric NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  reasons text[] DEFAULT '{}',
  action_plan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(funding_id, sme_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_professional_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for sme_professional_matches
CREATE POLICY "SMEs can view their matches"
  ON public.sme_professional_matches FOR SELECT
  USING (auth.uid() = sme_id OR auth.uid() = professional_id);

-- RLS Policies for funding_matches
CREATE POLICY "SMEs can view their funding matches"
  ON public.funding_matches FOR SELECT
  USING (auth.uid() = sme_id);

-- RLS Policies for pwa_analytics (insert only for logged in users)
CREATE POLICY "Users can insert analytics"
  ON public.pwa_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view analytics"
  ON public.pwa_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_sme_professional_matches_sme ON public.sme_professional_matches(sme_id);
CREATE INDEX IF NOT EXISTS idx_sme_professional_matches_professional ON public.sme_professional_matches(professional_id);
CREATE INDEX IF NOT EXISTS idx_funding_matches_sme ON public.funding_matches(sme_id);
CREATE INDEX IF NOT EXISTS idx_funding_matches_funding ON public.funding_matches(funding_id);
CREATE INDEX IF NOT EXISTS idx_funding_opportunities_active ON public.funding_opportunities(is_active) WHERE is_active = true;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_push_subscriptions_timestamp
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_notification_preferences_timestamp
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_preferences_updated_at();