import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Crown, 
  Check, 
  Loader2, 
  Calendar,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { CheckoutModal } from './CheckoutModal';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  account_type: string;
  price_zmw: number;
  price_usd: number;
  billing_interval: string;
  features: string[];
  is_active: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
  trial_end: string | null;
  currency: string;
  plan: SubscriptionPlan;
}

interface SubscriptionManagerProps {
  accountType?: string;
}

export const SubscriptionManager = ({ accountType }: SubscriptionManagerProps) => {
  const { user, session } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'ZMW' | 'USD'>('ZMW');
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const fetchData = async () => {
    if (!session?.access_token) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-subscriptions', {
        body: { action: 'get_plans' }
      });

      if (error) throw error;
      
      // Parse features from JSON string if needed
      const parsedPlans = (data.plans || []).map((plan: any) => ({
        ...plan,
        features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features
      }));
      setPlans(parsedPlans);

      // Get current subscription
      const { data: subData, error: subError } = await supabase.functions.invoke('lenco-subscriptions', {
        body: { action: 'get_subscription' }
      });

      if (subError) throw subError;
      
      if (subData.subscription) {
        const sub = subData.subscription;
        sub.plan = typeof sub.plan?.features === 'string' 
          ? { ...sub.plan, features: JSON.parse(sub.plan.features) }
          : sub.plan;
        setSubscription(sub);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    const price = selectedCurrency === 'USD' ? plan.price_usd : plan.price_zmw;
    
    // If free plan, subscribe directly
    if (price === 0) {
      setIsProcessing(true);
      try {
        const { data, error } = await supabase.functions.invoke('lenco-subscriptions', {
          body: {
            action: 'subscribe',
            plan_id: plan.id,
            currency: selectedCurrency
          }
        });

        if (error) throw error;

        if (data.success) {
          toast.success('Subscription activated!');
          fetchData();
        } else {
          throw new Error(data.error || 'Subscription failed');
        }
      } catch (error) {
        console.error('Subscription error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to subscribe');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Show checkout for paid plans
      setCheckoutPlan(plan);
      setShowCheckout(true);
    }
  };

  const handleCancelSubscription = async () => {
    if (!session?.access_token) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-subscriptions', {
        body: { action: 'cancel' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else {
        throw new Error(data.error || 'Cancellation failed');
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckoutSuccess = () => {
    toast.success('Payment initiated! Your subscription will be activated once payment is confirmed.');
    setShowCheckout(false);
    setCheckoutPlan(null);
    fetchData();
  };

  const filteredPlans = accountType 
    ? plans.filter(p => p.account_type === accountType)
    : plans;

  const groupedPlans = filteredPlans.reduce((acc, plan) => {
    if (!acc[plan.account_type]) {
      acc[plan.account_type] = [];
    }
    acc[plan.account_type].push(plan);
    return acc;
  }, {} as Record<string, SubscriptionPlan[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

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
                className={subscription.status === 'active' ? 'bg-green-500' : ''}
              >
                {subscription.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">{subscription.plan?.name}</h3>
                <p className="text-muted-foreground">{subscription.plan?.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Billing Period</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(subscription.current_period_start), 'MMM d')} - {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="font-medium text-foreground">
                    {subscription.currency === 'USD' 
                      ? `$${subscription.plan?.price_usd}` 
                      : `K${subscription.plan?.price_zmw}`
                    }/{subscription.plan?.billing_interval}
                  </p>
                </div>
              </div>

              {subscription.cancel_at_period_end && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    Subscription will end on {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          {!subscription.cancel_at_period_end && (
            <CardFooter>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Your subscription will remain active until the end of the current billing period. You won't be charged again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={isProcessing}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Yes, Cancel'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Currency Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {subscription ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <Select
          value={selectedCurrency}
          onValueChange={(value: 'ZMW' | 'USD') => setSelectedCurrency(value)}
        >
          <SelectTrigger className="w-32 bg-background border-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            <SelectItem value="ZMW">ZMW</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Plans Grid */}
      {Object.entries(groupedPlans).map(([type, typePlans]) => (
        <div key={type} className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {type.replace('_', ' ')} Plans
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {typePlans.map((plan) => {
              const price = selectedCurrency === 'USD' ? plan.price_usd : plan.price_zmw;
              const currencySymbol = selectedCurrency === 'USD' ? '$' : 'K';
              const isCurrentPlan = subscription?.plan_id === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative bg-card border-border transition-all hover:shadow-lg ${
                    isCurrentPlan ? 'ring-2 ring-accent' : ''
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground">Current Plan</Badge>
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
                        {currencySymbol}{price}
                      </span>
                      <span className="text-muted-foreground">/{plan.billing_interval}</span>
                    </div>
                    <ul className="space-y-2">
                      {(plan.features || []).map((feature, idx) => (
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
                      disabled={isCurrentPlan || isProcessing}
                      className={`w-full ${
                        isCurrentPlan 
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : price === 0 ? (
                        'Get Started Free'
                      ) : (
                        `Subscribe - ${currencySymbol}${price}`
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Checkout Modal */}
      {checkoutPlan && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setCheckoutPlan(null);
          }}
          amount={selectedCurrency === 'USD' ? checkoutPlan.price_usd : checkoutPlan.price_zmw}
          currency={selectedCurrency}
          description={`Subscription: ${checkoutPlan.name}`}
          transactionType="subscription"
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
};

export default SubscriptionManager;