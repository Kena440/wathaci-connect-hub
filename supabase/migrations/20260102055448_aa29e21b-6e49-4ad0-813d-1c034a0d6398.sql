-- Create a separate payment_details table for sensitive payment information
CREATE TABLE public.payment_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method text,
  payment_phone text,
  card_details jsonb DEFAULT '{}'::jsonb,
  bank_name text,
  bank_account_number text,
  mobile_money_provider text,
  mobile_money_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with strict policies
ALTER TABLE public.payment_details ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payment details
CREATE POLICY "Users can view their own payment details"
ON public.payment_details
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own payment details
CREATE POLICY "Users can insert their own payment details"
ON public.payment_details
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment details
CREATE POLICY "Users can update their own payment details"
ON public.payment_details
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view payment details for support purposes (read-only)
CREATE POLICY "Admins can view payment details"
ON public.payment_details
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_payment_details_updated_at
  BEFORE UPDATE ON public.payment_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing payment data from profiles to payment_details
INSERT INTO public.payment_details (user_id, payment_method, payment_phone, card_details)
SELECT id, payment_method, payment_phone, card_details
FROM public.profiles
WHERE payment_method IS NOT NULL 
   OR payment_phone IS NOT NULL 
   OR card_details IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Also migrate from payment_accounts if they have bank/mobile money info
UPDATE public.payment_details pd
SET 
  bank_name = pa.bank_name,
  bank_account_number = pa.bank_account_number,
  mobile_money_provider = pa.mobile_money_provider,
  mobile_money_number = pa.mobile_money_number
FROM public.payment_accounts pa
WHERE pd.user_id = pa.user_id;

-- Remove payment-sensitive columns from profiles table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS payment_phone,
  DROP COLUMN IF EXISTS card_details;

-- Add index for faster lookups
CREATE INDEX idx_payment_details_user_id ON public.payment_details(user_id);