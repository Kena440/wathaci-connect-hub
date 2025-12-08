import { ReactNode, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAppContext } from "@/contexts/AppContext";
import { getOnboardingStartPath, isOnboardingPath, normalizeAccountType } from "@/lib/onboardingPaths";
import { logger } from "@/lib/logger";

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, loading } = useSupabaseAuth();
  const { profile, refreshUser } = useAppContext();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    if (!loading && user && !profile && !checkingProfile) {
      setCheckingProfile(true);
      refreshUser()
        .catch((error) => {
          logger.error("Failed to refresh profile inside PrivateRoute", error, {
            event: "auth:guard:refresh-error",
            userId: user.id,
          });
        })
        .finally(() => setCheckingProfile(false));
    }
  }, [checkingProfile, loading, profile, refreshUser, user]);

  const normalizedAccountType = useMemo(
    () => normalizeAccountType(profile?.account_type ?? user?.account_type),
    [profile?.account_type, user?.account_type]
  );

  const profileCompleted = profile?.profile_completed ?? user?.profile_completed ?? false;
  const onboardingPath = getOnboardingStartPath(normalizedAccountType);
  const inOnboarding = isOnboardingPath(location.pathname);

  if (loading || checkingProfile) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!profileCompleted && !inOnboarding) {
    logger.info("Redirecting authenticated user to onboarding", {
      event: "auth:guard:onboarding-redirect",
      userId: user.id,
      target: onboardingPath,
      accountType: normalizedAccountType,
    });
    return <Navigate to={onboardingPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
