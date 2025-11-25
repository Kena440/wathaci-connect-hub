import { ReactNode, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { LoadingScreen } from './LoadingScreen';

interface AccountTypeRouteProps {
  allowed: Array<string>;
  children: ReactNode;
}

export const AccountTypeRoute = ({ allowed, children }: AccountTypeRouteProps) => {
  const { profile, user, loading } = useAppContext();

  const accountType = useMemo(() => {
    if (profile?.account_type) return profile.account_type;
    if ((user as any)?.account_type) return (user as any).account_type;
    if (user?.user_metadata?.account_type) return user.user_metadata.account_type;
    return null;
  }, [profile?.account_type, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  const normalizedType = typeof accountType === 'string' ? accountType.toLowerCase() : null;
  const normalizedAllowed = allowed.map((value) => value.toLowerCase());

  if (!normalizedType || !normalizedAllowed.includes(normalizedType)) {
    return <Navigate to="/get-started" replace />;
  }

  return <>{children}</>;
};
