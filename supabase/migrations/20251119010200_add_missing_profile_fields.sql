-- Add missing payment and profile fields to profiles table
-- This migration ensures all TypeScript interface fields have corresponding database columns

BEGIN;

-- Step 1: Add payment-related fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payment_phone text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS use_same_phone boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS card_details jsonb;

-- Step 2: Add profile-related fields  
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS coordinates jsonb,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS industry_sector text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS employee_count integer,
  ADD COLUMN IF NOT EXISTS annual_revenue numeric,
  ADD COLUMN IF NOT EXISTS funding_stage text,
  ADD COLUMN IF NOT EXISTS qualifications jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience_years integer,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS gaps_identified text[] DEFAULT ARRAY[]::text[];

-- Step 3: Add account-type-specific fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS investment_focus text,
  ADD COLUMN IF NOT EXISTS investment_ticket_min numeric,
  ADD COLUMN IF NOT EXISTS investment_ticket_max numeric,
  ADD COLUMN IF NOT EXISTS investment_stage text,
  ADD COLUMN IF NOT EXISTS investment_regions text,
  ADD COLUMN IF NOT EXISTS impact_focus text,
  ADD COLUMN IF NOT EXISTS support_services text,
  ADD COLUMN IF NOT EXISTS support_preferences text,
  ADD COLUMN IF NOT EXISTS partnership_preferences text,
  ADD COLUMN IF NOT EXISTS donor_type text,
  ADD COLUMN IF NOT EXISTS funding_focus text,
  ADD COLUMN IF NOT EXISTS annual_funding_budget numeric,
  ADD COLUMN IF NOT EXISTS institution_type text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS government_focus text,
  ADD COLUMN IF NOT EXISTS programs text,
  ADD COLUMN IF NOT EXISTS partnership_needs text;

-- Step 4: Add check constraints for payment_method
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_payment_method_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('phone', 'card'));

-- Step 5: Add check constraint for payment_phone format (same as msisdn)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_payment_phone_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_payment_phone_format_check
  CHECK (payment_phone IS NULL OR payment_phone ~ '^\+?[0-9]{9,15}$');

-- Step 6: Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS profiles_country_idx ON public.profiles(country);
CREATE INDEX IF NOT EXISTS profiles_industry_sector_idx ON public.profiles(industry_sector);
CREATE INDEX IF NOT EXISTS profiles_payment_method_idx ON public.profiles(payment_method);

-- Step 7: Add comments for documentation
COMMENT ON COLUMN public.profiles.payment_phone IS 'Phone number used for mobile money payments';
COMMENT ON COLUMN public.profiles.payment_method IS 'Preferred payment method: phone or card';
COMMENT ON COLUMN public.profiles.use_same_phone IS 'Whether to use primary phone number for payments';
COMMENT ON COLUMN public.profiles.card_details IS 'Encrypted card details (JSON with last4, expiry_month, expiry_year, cardholder_name)';
COMMENT ON COLUMN public.profiles.qualifications IS 'Professional qualifications (JSON array with institution, degree, name, field, year)';
COMMENT ON COLUMN public.profiles.gaps_identified IS 'Identified skills or knowledge gaps (text array)';

COMMIT;
