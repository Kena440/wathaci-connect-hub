import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Crown,
  Check,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { format } from 'date-fns';

type Currency = 'ZMW' | 'USD';

interface Plan {
  id: string;
  name: string;
  account_type: string;
  billing_interval: string;
  price_usd: number;
  price_zmw: number;
  description: string | null;
  features: unknown;
}

interface PendingPayment {
  planName: string;
  reference: string;
  transactionId?: string;
  amount: number;
  currency: Currency;
}

const toFeatureList = (features: unknown): string[] => {
  if (Array.isArray(features)) return features.map((f) => String(f));
  if (features && typeof features === 'object') {
    return Object.entries(features as Record<string, unknown>)
      .filter(([, v]) => v !== false && v !== null)
      .map(([k, v]) => (typeof v === 'boolean' ? k : `${k}: ${String(v)}`));
  }
  return [];
};

interface LencoSubscriptionManagerProps {
  accountType?: string;
}

export const LencoSubscriptionManager = ({ accountType }: LencoSubscriptionManagerProps) => {
  const { user } = useAuth();
  const { entitlements, subscription, refresh } = useEntitlements();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>('ZMW');
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pending, setPending] = useState<PendingPayment | null>(null);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, account_type, billing_interval, price_usd, price_zmw, description, features')
        .eq('is_active', true)
        .order('price_zmw', { ascending: true });

      if (error) throw error;
      setPlans((data || []) as Plan[]);
    } catch (error) {
      console.error('Failed to load subscription plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const matching = accountType ? plans.filter((p) => p.account_type === accountType) : [];
  const visiblePlans = matching.length > 0 ? matching : plans;

  const symbol = currency === 'USD' ? '$' : 'K';
  const priceOf = (plan: Plan) => Number(currency === 'USD' ? plan.price_usd : plan.price_zmw) || 0;

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return;
    }

    setActionPlanId(plan.id);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-subscriptions', {
        body: { action: 'subscribe', plan_id: plan.id, currency },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create subscription');

      if (data.payment?.reference) {
        setPending({
          planName: plan.name,
          reference: data.payment.reference,
          transactionId: data.payment.transaction_id,
          amount: Number(data.payment.amount) || priceOf(plan),
          currency: (data.payment.currency as Currency) || currency,
        });
        toast.success('Subscription created — complete payment to activate');
      } else {
        toast.success(data.message || 'Subscription activated');
        refresh();
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to subscribe');
    } finally {
      setActionPlanId(null);
    }
  };

  const handleVerifyPayment = async () => {
    if (!pending) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-payments', {
        body: { action: 'verify', reference: pending.reference },
      });

      if (error) throw error;

      const status = data?.transaction?.status;
      if (status === 'successful') {
        toast.success('Payment confirmed — your subscription is active!');
        setPending(null);
        refresh();
      } else if (status === 'failed') {
        toast.error('Payment failed. Please try again.');
        setPending(null);
      } else {
        toast.info('Payment is still pending. Complete the payment and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-subscriptions', {
        body: { action: 'cancel' },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to cancel subscription');

      toast.success(data.message || 'Subscription cancelled');
      refresh();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

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
              <h3 className="text-xl font-bold text-foreground">{subscription.planName}</h3>

              {subscription.currentPeriodEnd && (
                <div className="text-sm text-muted-foreground">
                  Current period ends: {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                </div>
              )}

              {entitlements?.subscription?.cancelAtPeriodEnd && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    Subscription will end on{' '}
                    {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
          {!entitlements?.subscription?.cancelAtPeriodEnd && (
            <CardFooter>
              <Button
                variant="outline"
                className="border-border"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Pending payment */}
      {pending && (
        <Card className="bg-card border-accent/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Wallet className="w-5 h-5 text-accent" />
              Complete Payment — {pending.planName}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Pay{' '}
              <strong className="text-foreground">
                {pending.currency === 'USD' ? '$' : 'K'}
                {pending.amount.toFixed(2)}
              </strong>{' '}
              using your preferred method and include the reference below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-accent/10 border border-accent/20 p-4">
              <p className="font-medium text-foreground">Payment Reference</p>
              <p className="text-sm font-mono text-accent break-all">{pending.reference}</p>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 text-accent" />
              <p>After paying, click "Verify Payment" to activate your subscription.</p>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline" className="border-border" onClick={() => setPending(null)}>
              Dismiss
            </Button>
            <Button
              onClick={handleVerifyPayment}
              disabled={verifying}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Payment'
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Header + currency */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">
          {subscription ? 'Change Plan' : 'Choose a Plan'}
        </h2>
        <div className="space-y-2 w-full sm:w-56">
          <Label className="text-foreground">Currency</Label>
          <Select value={currency} onValueChange={(v: Currency) => setCurrency(v)}>
            <SelectTrigger className="bg-background border-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-50">
              <SelectItem value="ZMW">ZMW (Zambian Kwacha)</SelectItem>
              <SelectItem value="USD">USD (US Dollar)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plans */}
      {plansLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading plans...
        </div>
      ) : visiblePlans.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center text-muted-foreground">
            No subscription plans are available right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePlans.map((plan) => {
            const price = priceOf(plan);
            const isCurrentPlan = subscription?.planName === plan.name;
            const features = toFeatureList(plan.features);
            const busy = actionPlanId === plan.id;

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
                    {plan.description || `For ${plan.account_type.replace('_', ' ')} accounts`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-foreground">
                      {price === 0 ? 'Free' : `${symbol}${price.toFixed(2)}`}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground">
                        /{plan.billing_interval === 'yearly' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isCurrentPlan || busy}
                    className={`w-full ${
                      isCurrentPlan
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                    }`}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : price === 0 ? (
                      'Activate Free Plan'
                    ) : (
                      `Subscribe — ${symbol}${price.toFixed(2)}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LencoSubscriptionManager;
