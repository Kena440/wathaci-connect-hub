import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Crown, 
  Check, 
  Loader2, 
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

interface PlanConfig {
  productId: string;
  name: string;
  description: string;
  prices: {
    id: string;
    interval: string;
    label: string;
    displayPrice: string;
  }[];
  features: string[];
  userTypes: string[];
  tier: number;
}

const PLANS: PlanConfig[] = [
  {
    productId: 'basic_plan',
    name: 'Basic',
    description: 'Perfect for getting started',
    prices: [
      { id: 'basic_monthly', interval: 'month', label: 'Monthly', displayPrice: '$2/mo' },
    ],
    features: ['Platform access', 'Basic matching', 'Email support', '5 connections/month'],
    userTypes: ['sole_proprietor', 'professional', 'freelancer'],
    tier: 1,
  },
  {
    productId: 'pro_plan',
    name: 'Professional',
    description: 'For growing businesses',
    prices: [
      { id: 'pro_monthly', interval: 'month', label: 'Monthly', displayPrice: '$5/mo' },
    ],
    features: ['AI-powered matching', 'Unlimited connections', 'Advanced analytics', 'Phone support', 'Custom integrations'],
    userTypes: ['sme', 'professional', 'freelancer'],
    tier: 2,
  },
  {
    productId: 'enterprise_plan',
    name: 'Enterprise',
    description: 'For large organizations',
    prices: [
      { id: 'enterprise_monthly', interval: 'month', label: 'Monthly', displayPrice: '$10/mo' },
    ],
    features: ['White-label solution', 'API access', 'Custom features', 'Account manager', 'SLA guarantee', 'Priority development'],
    userTypes: ['investor', 'donor', 'government', 'sme'],
    tier: 3,
  },
];

interface SubscriptionManagerProps {
  accountType?: string;
}

export const SubscriptionManager = ({ accountType }: SubscriptionManagerProps) => {
  const { user } = useAuth();
  const { entitlements, subscription, refresh } = useEntitlements();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [selectedInterval, setSelectedInterval] = useState<string>('month');

  // Filter plans by user type if provided
  const filteredPlans = accountType
    ? PLANS.filter(p => p.userTypes.includes(accountType))
    : PLANS;

  const handleSubscribe = async (plan: PlanConfig) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    // Find the price for the selected interval
    const price = plan.prices.find(p => p.interval === selectedInterval) || plan.prices[0];

    try {
      await openCheckout({
        priceId: price.id,
        customerEmail: user.email || undefined,
        customData: { userId: user.id },
        successUrl: `${window.location.origin}/subscription-plans?checkout=success`,
      });
    } catch (error) {
      toast.error('Failed to open checkout. Please try again.');
    }
  };

  // Check for checkout success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      toast.success('Subscription activated! Welcome to your new plan.');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh entitlements
      setTimeout(() => refresh(), 2000);
    }
  }, []);

  const currentProductId = subscription?.productId || entitlements?.subscription?.product_id;

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      {subscription && (
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-accent" />
                Current Subscription
              </CardTitle>
              <Badge 
                variant={subscription.status === 'active' ? 'default' : 'secondary'}
                className={subscription.status === 'active' ? 'bg-green-600 text-white' : ''}
              >
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{subscription.planName}</h3>
              </div>
              
              {subscription.currentPeriodEnd && (
                <div className="text-sm text-muted-foreground">
                  Current period ends: {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                </div>
              )}

              {entitlements?.subscription?.cancel_at_period_end && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    Subscription will end on {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {subscription ? 'Change Plan' : 'Choose a Plan'}
        </h2>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => {
          const price = plan.prices.find(p => p.interval === selectedInterval) || plan.prices[0];
          const isCurrentPlan = currentProductId === plan.productId;
          
          return (
            <Card 
              key={plan.productId} 
              className={`relative bg-card border-border transition-all hover:shadow-lg ${
                isCurrentPlan ? 'ring-2 ring-accent' : ''
              } ${plan.tier === 2 ? 'md:scale-105' : ''}`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground">Current Plan</Badge>
                </div>
              )}
              {plan.tier === 2 && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-foreground">
                    {price.displayPrice.split('/')[0]}
                  </span>
                  <span className="text-muted-foreground">/{price.displayPrice.split('/')[1]}</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan || checkoutLoading}
                  className={`w-full ${
                    isCurrentPlan 
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                  }`}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    `Subscribe — ${price.displayPrice}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionManager;
