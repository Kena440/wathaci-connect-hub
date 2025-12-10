-- ============================================================================
-- SAFE AUDIT TRIGGER MIGRATION
-- ============================================================================

BEGIN;

-- ============================================================================
-- SAFELY ENSURE audit_logs TABLE EXISTS (if missing, skip entire audit logic)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='audit_logs'
  ) THEN
    RAISE NOTICE 'audit_logs table does not exist — skipping all audit triggers.';
  END IF;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Log Profile Changes (always safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.audit_logs (
        user_id, action_type, table_name, record_id, old_data, new_data
      ) VALUES (
        OLD.id, 'update', 'profiles', OLD.id,
        to_jsonb(OLD), to_jsonb(NEW)
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, action_type, table_name, record_id, old_data
    ) VALUES (
      OLD.id, 'delete', 'profiles', OLD.id, to_jsonb(OLD)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Audit logging failed for profiles: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger ONLY if profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    DROP TRIGGER IF EXISTS profile_audit_trigger ON public.profiles;
    CREATE TRIGGER profile_audit_trigger
      AFTER UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.log_profile_changes();
  ELSE
    RAISE NOTICE 'Skipping profile_audit_trigger; profiles table missing.';
  END IF;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Log Subscription Changes (safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_subscription_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action_type, table_name, record_id, new_data
    ) VALUES (
      NEW.user_id, 'create', 'user_subscriptions', NEW.id, to_jsonb(NEW)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.audit_logs (
        user_id, action_type, table_name, record_id, old_data, new_data
      ) VALUES (
        OLD.user_id, 'update', 'user_subscriptions',
        OLD.id, to_jsonb(OLD), to_jsonb(NEW)
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, action_type, table_name, record_id, old_data
    ) VALUES (
      OLD.user_id, 'delete', 'user_subscriptions', OLD.id, to_jsonb(OLD)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Audit logging failed for user_subscriptions: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create subscription trigger ONLY if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='user_subscriptions'
  ) THEN
    DROP TRIGGER IF EXISTS subscription_audit_trigger ON public.user_subscriptions;
    CREATE TRIGGER subscription_audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
      FOR EACH ROW EXECUTE FUNCTION public.log_subscription_changes();
  ELSE
    RAISE NOTICE 'Skipping subscription_audit_trigger; user_subscriptions table missing.';
  END IF;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Log Payment Changes (safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_payment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action_type, table_name, record_id, new_data
    ) VALUES (
      NEW.user_id, 'create', 'payments', NEW.id, to_jsonb(NEW)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status OR OLD.amount IS DISTINCT FROM NEW.amount THEN
      INSERT INTO public.audit_logs (
        user_id, action_type, table_name, record_id, old_data, new_data
      ) VALUES (
        OLD.user_id, 'update', 'payments', OLD.id,
        jsonb_build_object('status', OLD.status, 'amount', OLD.amount, 'paid_at', OLD.paid_at),
        jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'paid_at', NEW.paid_at)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Audit logging failed for payments: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create payment trigger ONLY if payments table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='payments'
  ) THEN
    DROP TRIGGER IF EXISTS payment_audit_trigger ON public.payments;
    CREATE TRIGGER payment_audit_trigger
      AFTER INSERT OR UPDATE ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.log_payment_changes();
  ELSE
    RAISE NOTICE 'Skipping payment_audit_trigger; payments table missing.';
  END IF;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Log Transaction Changes (safe)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action_type, table_name, record_id, new_data
    ) VALUES (
      NEW.user_id, 'create', 'transactions', NEW.id, to_jsonb(NEW)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (
        user_id, action_type, table_name, record_id, old_data, new_data
      ) VALUES (
        OLD.user_id, 'update', 'transactions', OLD.id,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Audit logging failed for transactions: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create transaction trigger ONLY if transactions table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='transactions'
  ) THEN
    DROP TRIGGER IF EXISTS transaction_audit_trigger ON public.transactions;
    CREATE TRIGGER transaction_audit_trigger
      AFTER INSERT OR UPDATE ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.log_transaction_changes();
  ELSE
    RAISE NOTICE 'Skipping transaction_audit_trigger; transactions table missing.';
  END IF;
END;
$$;

COMMIT;
