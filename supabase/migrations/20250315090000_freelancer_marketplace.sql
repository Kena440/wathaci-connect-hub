BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Ensure update_updated_at_column exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Professional profiles
CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  headline text,
  bio text,
  email text,
  msisdn text,
  location_city text,
  location_country text DEFAULT 'Zambia',
  years_experience integer,
  languages text[] DEFAULT '{}',
  service_categories text[] DEFAULT '{}',
  skills text[] DEFAULT '{}',
  industries text[] DEFAULT '{}',
  rate_type text,
  rate_min numeric,
  rate_max numeric,
  currency text DEFAULT 'ZMW',
  availability_status text,
  verification_status text DEFAULT 'pending',
  is_public boolean DEFAULT true,
  profile_photo_url text,
  portfolio_url text,
  linkedin_url text,
  website_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS professional_profiles_profile_id_idx ON public.professional_profiles(profile_id);
CREATE INDEX IF NOT EXISTS professional_profiles_public_idx ON public.professional_profiles(is_public);
CREATE INDEX IF NOT EXISTS professional_profiles_categories_idx ON public.professional_profiles USING GIN(service_categories);
CREATE INDEX IF NOT EXISTS professional_profiles_skills_idx ON public.professional_profiles USING GIN(skills);

CREATE TRIGGER set_professional_profiles_updated_at
BEFORE UPDATE ON public.professional_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Professional services
CREATE TABLE IF NOT EXISTS public.professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  delivery_mode text[] DEFAULT '{}',
  price_type text,
  price_amount numeric,
  currency text DEFAULT 'ZMW',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS professional_services_professional_idx ON public.professional_services(professional_id);
CREATE INDEX IF NOT EXISTS professional_services_active_idx ON public.professional_services(is_active);
CREATE INDEX IF NOT EXISTS professional_services_category_idx ON public.professional_services(category);

CREATE TRIGGER set_professional_services_updated_at
BEFORE UPDATE ON public.professional_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- SME requests for support
CREATE TABLE IF NOT EXISTS public.sme_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sme_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  category text,
  budget_min numeric,
  budget_max numeric,
  currency text DEFAULT 'ZMW',
  preferred_delivery_mode text[] DEFAULT '{}',
  location_city text,
  deadline timestamptz,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sme_service_requests_sme_idx ON public.sme_service_requests(sme_id);
CREATE INDEX IF NOT EXISTS sme_service_requests_status_idx ON public.sme_service_requests(status);

CREATE TRIGGER set_sme_service_requests_updated_at
BEFORE UPDATE ON public.sme_service_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Invites from SME requests to professionals
CREATE TABLE IF NOT EXISTS public.service_request_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.sme_service_requests(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'sent',
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_request_invites_request_idx ON public.service_request_invites(request_id);
CREATE INDEX IF NOT EXISTS service_request_invites_professional_idx ON public.service_request_invites(professional_id);

CREATE TRIGGER set_service_request_invites_updated_at
BEFORE UPDATE ON public.service_request_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Saved professionals
CREATE TABLE IF NOT EXISTS public.saved_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sme_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_professionals_unique ON public.saved_professionals(sme_id, professional_id);

-- Enable RLS
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sme_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_professionals ENABLE ROW LEVEL SECURITY;

-- Policies for professional_profiles
CREATE POLICY "Public can read public professional profiles"
ON public.professional_profiles
FOR SELECT
USING (is_public = true);

CREATE POLICY "Professional can update own profile"
ON public.professional_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Professional can insert own profile"
ON public.professional_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policies for professional_services
CREATE POLICY "Public can read active professional services"
ON public.professional_services
FOR SELECT
USING (is_active = true);

CREATE POLICY "Professional can manage own services"
ON public.professional_services
FOR ALL
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- Policies for SME requests
CREATE POLICY "SME can create request"
ON public.sme_service_requests
FOR INSERT
WITH CHECK (auth.uid() = sme_id);

CREATE POLICY "SME can read own requests"
ON public.sme_service_requests
FOR SELECT
USING (auth.uid() = sme_id);

CREATE POLICY "SME can update own requests"
ON public.sme_service_requests
FOR UPDATE
USING (auth.uid() = sme_id)
WITH CHECK (auth.uid() = sme_id);

-- Policies for invites
CREATE POLICY "SME can manage invites for own requests"
ON public.service_request_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.sme_service_requests r
    WHERE r.id = request_id AND r.sme_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sme_service_requests r
    WHERE r.id = request_id AND r.sme_id = auth.uid()
  )
);

CREATE POLICY "Professional can read invites sent to them"
ON public.service_request_invites
FOR SELECT
USING (auth.uid() = professional_id);

CREATE POLICY "Professional can update invite status"
ON public.service_request_invites
FOR UPDATE
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- Policies for saved professionals
CREATE POLICY "SME can manage saved professionals"
ON public.saved_professionals
FOR ALL
USING (auth.uid() = sme_id)
WITH CHECK (auth.uid() = sme_id);

COMMIT;
