-- Fix partnership_applications RLS policies to prevent email-based exploitation
-- 1. Require authentication for INSERT (with user_id set)
-- 2. Remove email matching from SELECT (only use user_id)

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.partnership_applications;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.partnership_applications;

-- Authenticated users can submit applications (must set their own user_id)
CREATE POLICY "Authenticated users can submit applications"
ON public.partnership_applications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- Users can only view applications they created (by user_id, not email)
CREATE POLICY "Users can view their own applications"
ON public.partnership_applications
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.partnership_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));