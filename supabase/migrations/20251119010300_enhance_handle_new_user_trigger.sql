-- Enhance handle_new_user trigger to extract more fields from auth.users metadata
-- This ensures profiles are created with all available data from signup

BEGIN;

-- Update the handle_new_user function to extract metadata fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_first_name text;
  v_last_name text;
  v_account_type text;
  v_phone text;
  v_mobile_number text;
  v_accepted_terms boolean;
  v_newsletter_opt_in boolean;
  v_profile_completed boolean;
BEGIN
  -- Extract basic fields
  v_email := NEW.email;
  
  -- Extract metadata fields if they exist
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name := NEW.raw_user_meta_data->>'last_name';
  v_account_type := NEW.raw_user_meta_data->>'account_type';
  v_phone := NEW.raw_user_meta_data->>'phone';
  v_mobile_number := NEW.raw_user_meta_data->>'mobile_number';
  v_accepted_terms := COALESCE((NEW.raw_user_meta_data->>'accepted_terms')::boolean, false);
  v_newsletter_opt_in := COALESCE((NEW.raw_user_meta_data->>'newsletter_opt_in')::boolean, false);
  v_profile_completed := COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false);
  
  -- If first_name and last_name not provided but full_name is, try to split it
  IF v_full_name IS NOT NULL AND v_first_name IS NULL AND v_last_name IS NULL THEN
    -- Simple split on first space
    IF position(' ' IN v_full_name) > 0 THEN
      v_first_name := split_part(v_full_name, ' ', 1);
      v_last_name := substring(v_full_name FROM position(' ' IN v_full_name) + 1);
    ELSE
      v_first_name := v_full_name;
    END IF;
  END IF;
  
  -- Use mobile_number as phone if phone not provided
  IF v_phone IS NULL AND v_mobile_number IS NOT NULL THEN
    v_phone := v_mobile_number;
  END IF;
  
  -- Insert profile with all available data
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    account_type,
    phone,
    msisdn,
    payment_phone,
    payment_method,
    accepted_terms,
    newsletter_opt_in,
    profile_completed
  )
  VALUES (
    NEW.id,
    v_email,
    COALESCE(v_full_name, TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''))),
    v_first_name,
    v_last_name,
    COALESCE(v_account_type::public.account_type_enum, 'sme'::public.account_type_enum),
    v_phone,
    v_phone, -- msisdn same as phone
    v_phone, -- payment_phone same as phone initially
    CASE WHEN v_phone IS NOT NULL THEN 'phone' ELSE NULL END,
    v_accepted_terms,
    v_newsletter_opt_in,
    v_profile_completed
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Trigger function that automatically creates a profile when a new user signs up. ' ||
  'Extracts data from auth.users.raw_user_meta_data to populate profile fields.';

COMMIT;
