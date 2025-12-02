import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Crown, Zap } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { getPlansForUserType, getUserTypeLabel } from '@/data/subscriptionPlans';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { isSubscriptionTemporarilyDisabled, SUBSCRIPTION_GRACE_LABEL } from '@/lib/subscriptionWindow';

interface SubscriptionBannerProps {
  userType?: string;
  compact?: boolean;
  dismissible?: boolean;
}

export const SubscriptionBanner = ({ 
  userType, 
  compact = false, 
  dismissible = true 
}: SubscriptionBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAppContext();
  const graceActive = isSubscriptionTemporarilyDisabled();

  if (dismissed || !user) return null;

  if (graceActive) {
    return (
      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
        <CardContent className="p-4 flex flex-col gap-2 text-emerald-900">
          <div className="flex items-center gap-2 font-semibold">
            <Crown className="h-5 w-5 text-emerald-600" />
            Full access unlocked during the grace period
          </div>
          <p>
            🎉 Subscription requirements are paused for all signed-up users until {SUBSCRIPTION_GRACE_LABEL}. Explore the platform freely and keep building momentum.
          </p>
        </CardContent>
      </Card>
    );
  }

  const plans = userType ? getPlansForUserType(userType) : [];
  const popularPlan = plans.find(plan => plan.popular);

  if (compact && popularPlan) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Crown className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">
                  Upgrade to {popularPlan.name}
                </p>
                <p className="text-sm text-gray-600">
                  {popularPlan.price}{popularPlan.period} • Unlock premium features
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <SubscriptionCard plan={popularPlan} userType={userType} compact />
              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                Unlock Premium Features for {userType ? getUserTypeLabel(userType) : 'Your Account'}
              </h3>
              <p className="text-blue-100">
                Get AI-powered matching, unlimited connections, and priority support
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  Mobile Money
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  Card Payments
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="secondary" 
              className="bg-white text-blue-600 hover:bg-gray-100"
              onClick={() => window.location.href = '/subscription-plans'}
            >
              View Plans
            </Button>
            {dismissible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissed(true)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};