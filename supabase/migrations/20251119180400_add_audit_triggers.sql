-- ============================================================================
-- Add Audit Triggers for Automatic Activity Logging
-- ============================================================================
-- This migration creates triggers to automatically log changes to critical
-- tables for security auditing and debugging purposes.
-- ============================================================================

BEGIN;

-- ============================================================================
-- TRIGGER FUNCTION: Log Profile Changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only log if data actually changed
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.audit_logs (
        user_id,
        action_type,
        table_name,
        record_id,
        old_data,
        new_data
      )
      VALUES (
        OLD.id,
        'update',
        'profiles',
        OLD.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      old_data
    )
    VALUES (
      OLD.id,
      'delete',
      'profiles',
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if audit logging fails
    RAISE WARNING 'Audit logging failed for profiles: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS profile_audit_trigger ON public.profiles;
CREATE TRIGGER profile_audit_trigger
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_changes();

-- ============================================================================
-- TRIGGER FUNCTION: Log Subscription Changes
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
      user_id,
      action_type,
      table_name,
      record_id,
      new_data
    )
    VALUES (
      NEW.user_id,
      'create',
      'user_subscriptions',
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.audit_logs (
        user_id,
        action_type,
        table_name,
        record_id,
        old_data,
        new_data
      )
      VALUES (
        OLD.user_id,
        'update',
        'user_subscriptions',
        OLD.id,
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action_type,
      table_name,
      record_id,
      old_data
    )
    VALUES (
      OLD.user_id,
      'delete',
      'user_subscriptions',
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Audit logging failed for user_subscriptions: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS subscription_audit_trigger ON public.user_subscriptions;
CREATE TRIGGER subscription_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_changes();

-- ============================================================================
-- TRIGGER FUNCTION: Log Payment Changes
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
      user_id,
      action_type,
      table_name,
      record_id,
      new_data
    )
    VALUES (
      NEW.user_id,
      'create',
      'payments',
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if status changed or other critical fields
    IF OLD.status IS DISTINCT FROM NEW.status OR 
       OLD.amount IS DISTINCT FROM NEW.amount THEN
      INSERT INTO public.audit_logs (
        user_id,
        action_type,
        table_name,
        record_id,
        old_data,
        new_data
      )
      VALUES (
        OLD.user_id,
        'update',
        'payments',
        OLD.id,
        jsonb_build_object(
          'status', OLD.status,
          'amount', OLD.amount,
          'paid_at', OLD.paid_at
        ),
        jsonb_build_object(
          'status', NEW.status,
          'amount', NEW.amount,
          'paid_at', NEW.paid_at
        )
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS payment_audit_trigger ON public.payments;
CREATE TRIGGER payment_audit_trigger
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_changes();

-- ============================================================================
-- TRIGGER FUNCTION: Log Transaction Changes
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
      user_id,
      action_type,
      table_name,
      record_id,
      new_data
    )
    VALUES (
      NEW.user_id,
      'create',
      'transactions',
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log if status changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (
        user_id,
        action_type,
        table_name,
        record_id,
        old_data,
        new_data
      )
      VALUES (
        OLD.user_id,
        'update',
        'transactions',
        OLD.id,
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS transaction_audit_trigger ON public.transactions;
CREATE TRIGGER transaction_audit_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_transaction_changes();

-- ============================================================================
-- Add Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION public.log_profile_changes() IS 'Automatically logs changes to user profiles for audit trail';
COMMENT ON FUNCTION public.log_subscription_changes() IS 'Automatically logs changes to user subscriptions for audit trail';
COMMENT ON FUNCTION public.log_payment_changes() IS 'Automatically logs payment status changes for audit trail';
COMMENT ON FUNCTION public.log_transaction_changes() IS 'Automatically logs transaction status changes for audit trail';

COMMIT;
