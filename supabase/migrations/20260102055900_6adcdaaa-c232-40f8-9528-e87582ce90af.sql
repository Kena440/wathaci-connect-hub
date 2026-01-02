-- Update freelancer_profiles to require authentication for viewing
-- This prevents anonymous scraping while maintaining marketplace functionality

DROP POLICY IF EXISTS "Users can view all freelancer profiles" ON public.freelancer_profiles;

-- Only authenticated users can view freelancer profiles (marketplace browsing)
CREATE POLICY "Authenticated users can view freelancer profiles"
ON public.freelancer_profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);