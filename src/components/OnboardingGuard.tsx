import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

// Routes that don't require profile completion
const EXEMPT_ROUTES = [
  '/onboarding/profile',
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
];

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) {
        setProfileComplete(null);
        setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_profile_complete')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking profile:', error);
          setProfileComplete(false);
        } else {
          setProfileComplete(data?.is_profile_complete ?? false);
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
        setProfileComplete(false);
      } finally {
        setChecking(false);
      }
    };

    if (!authLoading) {
      checkProfileCompletion();
    }
  }, [user, authLoading]);

  // Still loading auth state
  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if current route is exempt
  const isExemptRoute = EXEMPT_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  // User is logged in, profile incomplete, and not on exempt route
  if (user && profileComplete === false && !isExemptRoute) {
    return <Navigate to="/onboarding/profile" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
