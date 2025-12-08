import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useProfile } from '@/hooks/useProfile';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAuthenticated(false);
        navigate('/signin', { replace: true });
      } else {
        setAuthenticated(true);
      }
      setChecking(false);
    };

    check();
  }, [navigate]);

  if (checking) return <div>Checking authentication…</div>;
  if (!authenticated) return null;

  return <>{children}</>;
}

interface RequireCompletedProfileProps {
  children: ReactNode;
}

export function RequireCompletedProfile({ children }: RequireCompletedProfileProps) {
  const { loading, profile, error } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (error || !profile) {
      navigate('/onboarding/account-type', { replace: true });
      return;
    }

    if (!profile.account_type) {
      navigate('/onboarding/account-type', { replace: true });
      return;
    }

    if (!profile.profile_completed) {
      navigate(`/onboarding/${profile.account_type}`, { replace: true });
    }
  }, [loading, profile, error, navigate]);

  if (loading) return <div>Loading your profile…</div>;
  if (error) return <div>Something went wrong loading your profile.</div>;

  return <>{children}</>;
}
