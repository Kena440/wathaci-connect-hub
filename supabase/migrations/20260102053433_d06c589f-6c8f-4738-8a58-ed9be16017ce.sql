-- Fix donations table RLS to prevent unauthorized access to anonymous donation data

-- Drop and recreate policies to ensure proper protection
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can view all donations" ON public.donations;

-- Users can ONLY view their own donations (where user_id matches their auth.uid())
-- This explicitly excludes anonymous donations from regular user access
CREATE POLICY "Users can view their own donations"
ON public.donations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Admins can view ALL donations (including anonymous ones) for management
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));