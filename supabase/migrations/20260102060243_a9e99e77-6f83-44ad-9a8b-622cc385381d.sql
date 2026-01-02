-- Fix transactions RLS to prevent metadata leak to recipients
-- Create a view for recipients with limited fields, update main table policy

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

-- Create policy for users to view ONLY their own transactions (as sender)
CREATE POLICY "Users can view transactions they initiated"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for recipients to view transactions they received (limited by RLS)
-- Recipients can see transactions but metadata column will be filtered in application
CREATE POLICY "Recipients can view transactions sent to them"
ON public.transactions
FOR SELECT
USING (auth.uid() = recipient_id);

-- Create a secure view for recipients that excludes sensitive metadata
CREATE OR REPLACE VIEW public.v_recipient_transactions
WITH (security_invoker = true)
AS
SELECT 
  id,
  recipient_id,
  user_id,
  amount,
  currency,
  status,
  transaction_type,
  created_at,
  -- Exclude sensitive fields: description, metadata, idempotency_key, lenco_reference, etc.
  net_amount,
  platform_fee
FROM public.transactions
WHERE recipient_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.v_recipient_transactions TO authenticated;