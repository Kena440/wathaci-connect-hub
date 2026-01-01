import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRef, useEffect, useState } from 'react';
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

// Routes that require authentication but not profile completion
const PUBLIC_ROUTES = [
  '/',
  '/marketplace',
  '/freelancer-hub',
  '/funding-hub',
  '/resources',
  '/get-started',
  '/subscription-plans',
  '/partnership-hub',
  '/about-us',
  '/donate',
  '/install',
  '/profile/',
];

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, loading: authLoading, profile, profileLoading } = useAuth();
  const location = useLocation();
  const redirectingRef = useRef(false);
  const [hasDecided, setHasDecided] = useState(false);

  // Reset redirect ref when location changes
  useEffect(() => {
    redirectingRef.current = false;
    setHasDecided(false);
  }, [location.pathname]);

  // Wait until auth and profile are fully loaded
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if current route is exempt from profile completion requirement
  const isExemptRoute = EXEMPT_ROUTES.some(route => 
    location.pathname.startsWith(route)
  );

  // Check if current route is public (doesn't require auth)
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    location.pathname === route || location.pathname.startsWith(route)
  );

  // Not logged in - allow access to public and auth routes
  if (!user) {
    return <>{children}</>;
  }

  // User is logged in - check profile completion
  const isProfileComplete = profile?.is_profile_complete === true;

  // Already on onboarding page
  if (location.pathname.startsWith('/onboarding/profile')) {
    // If profile is complete, redirect away from onboarding
    if (isProfileComplete && !redirectingRef.current) {
      redirectingRef.current = true;
      const from = (location.state as any)?.from?.pathname || '/';
      return <Navigate to={from} replace />;
    }
    // Profile incomplete, stay on onboarding
    return <>{children}</>;
  }

  // Profile is incomplete and not on exempt route - redirect to onboarding
  if (!isProfileComplete && !isExemptRoute && !redirectingRef.current) {
    redirectingRef.current = true;
    return <Navigate to="/onboarding/profile" state={{ from: location }} replace />;
  }

  // Profile is complete or on exempt route - allow access
  return <>{children}</>;
}