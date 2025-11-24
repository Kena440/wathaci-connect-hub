-- Snapshot of trigger function definitions captured for consolidation review.
-- Source of truth should be refreshed with supabase/backups/capture_trigger_function_defs.sql against the target database.

-- handle_new_user -- public
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
  v_email := NEW.email;

  BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    v_account_type := COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type_enum, 'SME');
  EXCEPTION
    WHEN OTHERS THEN
      v_full_name := '';
      v_account_type := 'SME';
  END;

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

    RETURN NEW;

  EXCEPTION
    WHEN unique_violation THEN
      v_error_message := 'Unique constraint violation: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;

      INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
      VALUES (
        NEW.id,
        v_error_message,
        v_error_detail,
        'unique_violation in handle_new_user trigger'
      );

      RETURN NEW;

    WHEN not_null_violation THEN
      v_error_message := 'NOT NULL constraint violation: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;

      INSERT INTO public.profile_errors (user_id, error_message, error_detail, error_context)
      VALUES (
        NEW.id,
        v_error_message,
        v_error_detail,
        'not_null_violation in handle_new_user trigger'
      );

      RETURN NEW;

    WHEN check_violation THEN
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
      v_error_message := 'Unexpected error in handle_new_user: ' || SQLERRM;
      v_error_detail := 'SQLSTATE: ' || SQLSTATE;

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
          NULL;
      END;

      RETURN NEW;
  END;
END;
$$;

-- autocreate_profile_on_user -- auth
-- Definition not present in the codebase; capture from the live database via capture_trigger_function_defs.sql.

-- handle_auth_user_created -- auth
-- Definition not present in the codebase; capture from the live database via capture_trigger_function_defs.sql.
