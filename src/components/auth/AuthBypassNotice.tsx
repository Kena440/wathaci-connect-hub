import { isAuthBypassEnabled } from '@/lib/auth-bypass';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';

export const AuthBypassNotice = () => {
  // TEMPORARY BYPASS MODE: remove after auth errors are fixed
  const { user } = useAppContext();
  const bypassEnabled = isAuthBypassEnabled();

  if (!bypassEnabled) {
    return null;
  }

  const isBypassUser = Boolean((user as any)?.isBypassUser || user?.user_metadata?.isBypassUser);

  return (
    <div className="w-full bg-amber-100 text-amber-900 border-b border-amber-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-sm">
        <span className="font-medium">You are using a temporary onboarding mode while we fix some technical issues. You can still sign up, sign in, and create your profile.</span>
        {isBypassUser ? (
          <Badge variant="secondary" className="bg-amber-200 text-amber-900 border border-amber-300">
            Onboarding (Temporary Mode)
          </Badge>
        ) : null}
      </div>
    </div>
  );
};

export default AuthBypassNotice;
