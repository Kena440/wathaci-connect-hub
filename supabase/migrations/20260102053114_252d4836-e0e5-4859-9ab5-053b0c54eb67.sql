-- Fix donations table RLS policies to protect sensitive donor information

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view their own donations" ON public.donations;
DROP POLICY IF EXISTS "Anyone can create donations" ON public.donations;

-- Create proper RLS policies for donations table

-- Users can only view their own donations (when logged in)
CREATE POLICY "Users can view their own donations"
ON public.donations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all donations for reporting/reconciliation
CREATE POLICY "Admins can view all donations"
ON public.donations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to create donations (for logged-in donors)
CREATE POLICY "Authenticated users can create donations"
ON public.donations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow anonymous donations from unauthenticated users (public donation form)
CREATE POLICY "Anonymous users can create donations"
ON public.donations
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Admins can update donation status (for payment reconciliation)
CREATE POLICY "Admins can update donations"
ON public.donations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));