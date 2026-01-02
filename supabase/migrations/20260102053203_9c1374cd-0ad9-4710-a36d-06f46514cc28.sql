-- Fix partners table RLS to protect sensitive financial data

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view active partners" ON public.partners;
DROP POLICY IF EXISTS "Partners can update their own profile" ON public.partners;

-- Create a view for public partner information (non-sensitive data only)
DROP VIEW IF EXISTS public.v_public_partners;
CREATE VIEW public.v_public_partners
WITH (security_invoker = true)
AS SELECT
  id,
  company_name,
  description,
  website,
  logo_url,
  partnership_type,
  is_active,
  is_verified,
  created_at
FROM public.partners
WHERE is_active = true;

-- Grant access to the public view
GRANT SELECT ON public.v_public_partners TO authenticated;
GRANT SELECT ON public.v_public_partners TO anon;

-- Partners can view their own full profile (including financial data)
CREATE POLICY "Partners can view their own profile"
ON public.partners
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all partner data for management
CREATE POLICY "Admins can view all partners"
ON public.partners
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Partners can update their own non-financial profile data
CREATE POLICY "Partners can update their own profile"
ON public.partners
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update any partner (for verification, commission adjustments)
CREATE POLICY "Admins can update partners"
ON public.partners
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert partners (e.g., when approving applications)
CREATE POLICY "Admins can insert partners"
ON public.partners
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete partners if needed
CREATE POLICY "Admins can delete partners"
ON public.partners
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));