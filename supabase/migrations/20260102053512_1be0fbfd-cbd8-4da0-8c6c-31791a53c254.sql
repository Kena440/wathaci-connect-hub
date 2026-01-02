-- Strengthen transactions table RLS for financial data protection

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;

-- Users can view their own transactions (as payer or recipient)
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = recipient_id);

-- Only system (via edge functions with service role) should insert transactions
-- But we allow authenticated users to insert their own transactions for wallet operations
CREATE POLICY "Users can create their own transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own transactions (for limited fields like cancellation)
CREATE POLICY "Users can update their own pending transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all transactions for reconciliation and auditing
CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update transactions for reconciliation
CREATE POLICY "Admins can update transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));