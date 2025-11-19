-- ============================================================================
-- Enhanced Profile Creation Trigger with Comprehensive Error Handling
-- ============================================================================
-- This trigger creates a profile record when a new user signs up via Supabase Auth.
-- It includes robust error handling and logging to help diagnose signup issues.
-- ============================================================================

BEGIN;

-- Enhanced trigger function with error logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_account_type public.account_type_enum;
  v_error_message text;
  v_error_detail text;
BEGIN
  -- Extract email from the new user record
  v_email := NEW.email;
  
  -- Extract metadata from raw_user_meta_data if available
  BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    v_account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type_enum, 'SME');
  EXCEPTION
    WHEN OTHERS THEN
      -- If metadata extraction fails, use safe defaults
      v_full_name := '';
      v_account_type := 'SME';
  END;

  -- Attempt to insert the profile
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name,
      account_type,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      v_email,
      v_full_name,
      v_account_type,
      timezone('utc', now()),
      timezone('utc', now())
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = COALESCE(NULLIF(public.profiles.email, ''), EXCLUDED.email),
      full_name = CASE
        WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = ''
        THEN EXCLUDED.full_name
        ELSE public.profiles.full_name
      END,
      updated_at = timezone('utc', now());
    
    -- Profile created successfully
    RETURN NEW;
    
  EXCEPTION
    WHEN unique_violation THEN
      -- Log unique constraint violation
      v_error_message := 'Unique constraint violation: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;
      
      INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
      VALUES (
        NEW.id,
        v_error_message,
        v_error_detail,
        'unique_violation in handle_new_user trigger'
      );
      
      -- Don't fail user creation for duplicate profile
      RETURN NEW;
      
    WHEN not_null_violation THEN
      -- Log NOT NULL constraint violation
      v_error_message := 'NOT NULL constraint violation: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;
      
      INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
      VALUES (
        NEW.id,
        v_error_message,
        v_error_detail,
        'not_null_violation in handle_new_user trigger'
      );
      
      -- Don't fail user creation - profile can be created later
      RETURN NEW;
      
    WHEN check_violation THEN
      -- Log CHECK constraint violation
      v_error_message := 'CHECK constraint violation: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;
      
      INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
      VALUES (
        NEW.id,
        v_error_message,
        v_error_detail,
        'check_violation in handle_new_user trigger'
      );
      
      RETURN NEW;
      
    WHEN foreign_key_violation THEN
      -- Log foreign key violation
      v_error_message := 'Foreign key violation: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;
      
      INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
      VALUES (
        NEW.id,
        v_error_message,
        v_error_detail,
        'foreign_key_violation in handle_new_user trigger'
      );
      
      RETURN NEW;
      
    WHEN OTHERS THEN
      -- Log any other error
      v_error_message := 'Unexpected error in handle_new_user: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;
      
      -- Attempt to log error (use another exception block in case this fails)
      BEGIN
        INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
        VALUES (
          NEW.id,
          v_error_message,
          v_error_detail,
          'unexpected_error in handle_new_user trigger'
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- If we can't even log the error, just continue
          -- This prevents cascading failures
          NULL;
      END;
      
      -- Don't fail user creation even if profile creation fails
      RETURN NEW;
  END;
END;
$$;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new auth.users with comprehensive error logging to profile_errors table';

COMMIT;
