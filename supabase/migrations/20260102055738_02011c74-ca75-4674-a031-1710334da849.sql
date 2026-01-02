-- Drop existing policies and recreate with proper security
DROP POLICY IF EXISTS "Anonymous users can create donations" ON public.donations;
DROP POLICY IF EXISTS "Authenticated users can create donations" ON public.donations;
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;

-- Anonymous users can ONLY insert donations (no SELECT/UPDATE/DELETE)
-- They must have NULL user_id and can only provide their own contact info
CREATE POLICY "Anonymous users can insert donations only"
ON public.donations
FOR INSERT
WITH CHECK (
  user_id IS NULL
  AND status = 'pending'
);

-- Authenticated users can create their own donations
CREATE POLICY "Authenticated users can create their own donations"
ON public.donations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id = auth.uid() OR user_id IS NULL)
);

-- Users can ONLY view their own donations (must have user_id matching their auth id)
CREATE POLICY "Users can view only their own donations"
ON public.donations
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL 
  AND auth.uid() = user_id
);

-- Admins can view all donations
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update donations (for status changes, etc.)
CREATE POLICY "Admins can update donations"
ON public.donations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- No DELETE policy - donations should never be deleted (audit trail)