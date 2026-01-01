import { useEntitlements } from '@/hooks/useEntitlements';
import { Button } from '@/components/ui/button';
import { Crown, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';

export const GracePeriodBanner = () => {
  const navigate = useNavigate();
  const { entitlements, loading, inGracePeriod, hasFullAccess, isAdmin } = useEntitlements();
  const [dismissed, setDismissed] = useState(false);

  // Don't show for admins, loading state, or if dismissed
  if (loading || isAdmin || dismissed || !inGracePeriod) {
    return null;
  }

  // Don't show if user has an active subscription
  if (entitlements?.subscription?.status === 'active') {
    return null;
  }

  const gracePeriodEnd = entitlements?.gracePeriodEnd 
    ? new Date(entitlements.gracePeriodEnd) 
    : new Date('2026-01-20T00:00:00+02:00');
  
  const daysRemaining = differenceInDays(gracePeriodEnd, new Date());

  return (
    <div className="bg-gradient-to-r from-accent/20 via-accent/10 to-primary/10 border-b border-accent/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20">
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div className="text-sm">
              <span className="text-foreground font-medium">
                Free access for all features!
              </span>
              <span className="text-muted-foreground ml-2">
                {daysRemaining > 0 ? (
                  <>
                    Ends in <strong className="text-accent">{daysRemaining} days</strong> 
                    {' '}({format(gracePeriodEnd, 'MMM d, yyyy')})
                  </>
                ) : (
                  <>Ends on {format(gracePeriodEnd, 'MMMM d, yyyy')}</>
                )}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/subscription-plans')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Crown className="w-4 h-4 mr-1" />
              Subscribe Now
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setDismissed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GracePeriodBanner;
