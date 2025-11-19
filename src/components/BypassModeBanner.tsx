// TEMPORARY BYPASS MODE: remove after auth errors are fixed
/**
 * BypassModeBanner Component
 * 
 * Displays a prominent banner when the application is running in bypass/fallback onboarding mode.
 * This makes it visually clear that this is temporary behavior, not final production functionality.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { isAuthBypassEnabled } from '@/lib/authBypass';

interface BypassModeBannerProps {
  className?: string;
}

export const BypassModeBanner: React.FC<BypassModeBannerProps> = ({ className = '' }) => {
  // Only render if bypass mode is enabled
  if (!isAuthBypassEnabled()) {
    return null;
  }

  return (
    <Alert 
      variant="warning" 
      className={`border-amber-500 bg-amber-50 ${className}`}
    >
      <AlertTitle className="text-amber-900 font-semibold">
        ⚠️ Temporary Onboarding Mode Active
      </AlertTitle>
      <AlertDescription className="text-amber-800">
        You are using a temporary onboarding mode while we finalize our systems. 
        You can still sign up, sign in, and create your profile. Some features may be limited.
      </AlertDescription>
    </Alert>
  );
};

interface BypassUserBadgeProps {
  isVisible: boolean;
  className?: string;
}

export const BypassUserBadge: React.FC<BypassUserBadgeProps> = ({ 
  isVisible, 
  className = '' 
}) => {
  // Only render if bypass mode is enabled AND the flag is set
  if (!isAuthBypassEnabled() || !isVisible) {
    return null;
  }

  return (
    <span 
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-amber-100 text-amber-800 border border-amber-300 ${className}`}
      title="You are logged in via temporary onboarding mode"
    >
      🔧 Temporary Mode
    </span>
  );
};

export default BypassModeBanner;
