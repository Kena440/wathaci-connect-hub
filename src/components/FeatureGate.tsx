import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEntitlements } from '@/hooks/useEntitlements';
import { format } from 'date-fns';

type LimitKeys = 'aiAnalysisEnabled' | 'contactRequestsPerWeek' | 'documentUploadsEnabled' | 'fundingMatchesPerMonth' | 'premiumAnalytics';

interface FeatureGateProps {
  children: ReactNode;
  feature: string;
  requiredFeature?: LimitKeys;
  showUpgradePrompt?: boolean;
  fallback?: ReactNode;
}

export const FeatureGate = ({ 
  children, 
  feature,
  requiredFeature,
  showUpgradePrompt = true,
  fallback
}: FeatureGateProps) => {
  const navigate = useNavigate();
  const { entitlements, loading, hasFullAccess, inGracePeriod, canUseFeature } = useEntitlements();

  if (loading) {
    return (
      <div className="animate-pulse bg-muted rounded-lg h-32" />
    );
  }

  // Check if user has access
  const hasAccess = requiredFeature 
    ? canUseFeature(requiredFeature)
    : hasFullAccess;

  if (hasAccess) {
    return (
      <>
        {inGracePeriod && entitlements?.gracePeriodEnd && (
          <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-muted-foreground">
              Free access until{' '}
              <strong className="text-foreground">
                {format(new Date(entitlements.gracePeriodEnd), 'MMMM d, yyyy')}
              </strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-xs"
              onClick={() => navigate('/subscription-plans')}
            >
              <Crown className="w-3 h-3 mr-1" />
              Subscribe Now
            </Button>
          </div>
        )}
        {children}
      </>
    );
  }

  // User doesn't have access
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Lock className="w-5 h-5 text-accent" />
            Premium Feature
          </CardTitle>
          <Badge variant="secondary" className="bg-accent/10 text-accent">
            <Sparkles className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          <strong className="text-foreground">{feature}</strong> is a premium feature. 
          Subscribe to unlock full access to all platform capabilities.
        </p>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => navigate('/subscription-plans')}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Crown className="w-4 h-4 mr-2" />
            View Plans
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/wallet')}
          >
            View Wallet
          </Button>
        </div>

        {/* Preview of locked content */}
        <div className="relative mt-4">
          <div className="opacity-30 pointer-events-none blur-sm">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-muted-foreground">
              Subscribe to unlock
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureGate;
