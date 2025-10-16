import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, CreditCard, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { subscriptionService } from '@/lib/services/subscription-service';
import { LencoPayment } from '@/components/LencoPayment';
import type { UserSubscription } from '@/@types/database';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  lencoAmount: number;
  userTypes?: string[];
}

interface SubscriptionCardProps {
  plan: SubscriptionPlan;
  userType?: string;
  compact?: boolean;
}

const MAX_POLL_ATTEMPTS = 12;
const POLL_INTERVAL = 10000; // 10 seconds

export const SubscriptionCard = ({ plan, userType, compact = false }: SubscriptionCardProps) => {
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [subscriptionResult, setSubscriptionResult] = useState<{ reference: string } | null>(null);
  const [pendingSubscription, setPendingSubscription] = useState<UserSubscription | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAppContext();

  const pendingPaymentReference = useMemo(
    () => pendingSubscription?.payment_reference ?? null,
    [pendingSubscription?.payment_reference]
  );

  const paymentMetadata = useMemo(
    () => ({
      subscription_id: pendingSubscription?.id,
      plan_id: plan.id,
      plan_name: plan.name,
      plan_period: plan.period,
    }),
    [pendingSubscription?.id, plan.id, plan.name, plan.period]
  );

  const paymentDescription = useMemo(
    () => `${plan.name} Plan Subscription - ${plan.price}${plan.period}`,
    [plan.name, plan.period, plan.price]
  );

  const handleDialogChange = (open: boolean) => {
    setShowPayment(open);
    if (!open) {
      setSubscriptionResult(null);
    }
  };

  const handleSelectPlan = async (selectedPaymentMethod: 'mobile_money' | 'card') => {
    try {
      if (!user) {
        navigate('/signin');
        return;
      }

      const activeSubscription = await subscriptionService.getCurrentUserSubscription(user.id);
      if (activeSubscription.data) {
        toast({
          title: "Active Subscription Found",
          description: "You already have an active subscription. Please cancel it first to subscribe to a new plan.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      const pendingResult = await subscriptionService.ensurePendingSubscription(user.id, plan.id);

      if (pendingResult.error || !pendingResult.data) {
        throw pendingResult.error || new Error('Unable to prepare subscription');
      }

      setPendingSubscription(pendingResult.data);
      if (pendingResult.data.payment_reference) {
        setSubscriptionResult({ reference: pendingResult.data.payment_reference });
      } else {
        setSubscriptionResult(null);
      }

      setPaymentMethod(selectedPaymentMethod);
      setShowPayment(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Unable to start subscription checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentReference: string, attempt: number = 0): Promise<void> => {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      toast({
        title: "Verification Timeout",
        description: "We could not confirm your payment yet. Please contact support if it was deducted.",
        variant: "destructive",
      });
      return;
    }

    try {
      const verificationResult = await subscriptionService.verifySubscriptionPayment(paymentReference);

      if (verificationResult.success) {
        toast({
          title: "Subscription Activated!",
          description: `Welcome to the ${plan.name} plan!`,
        });
        setShowPayment(false);
        setSubscriptionResult(null);
        setPendingSubscription(null);
        window.location.reload();
      } else {
        setTimeout(() => pollPaymentStatus(paymentReference, attempt + 1), POLL_INTERVAL);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Payment Verification Failed",
        description: "Please contact support if payment was deducted",
        variant: "destructive",
      });
    }
  };

  const handlePaymentInitialized = async (paymentData: { reference: string }) => {
    if (!pendingSubscription || !user) return;

    const attachResult = await subscriptionService.attachPaymentReference(
      pendingSubscription.id,
      paymentData.reference,
      {
        userId: user.id,
        paymentMethod,
      }
    );

    if (attachResult.error || !attachResult.data) {
      toast({
        title: "Subscription tracking error",
        description: attachResult.error?.message || 'Failed to link payment to subscription record',
        variant: "destructive",
      });
      return;
    }

    setPendingSubscription(attachResult.data);
    setSubscriptionResult({ reference: paymentData.reference });
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    if (paymentData.reference) {
      await pollPaymentStatus(paymentData.reference);
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setSubscriptionResult(null);
  };

  const sharedPaymentProps = {
    amount: plan.lencoAmount / 100,
    transactionType: 'subscription' as const,
    onSuccess: handlePaymentSuccess,
    onCancel: handlePaymentCancel,
    onInitialized: handlePaymentInitialized,
    metadata: paymentMetadata,
    initialReference: pendingPaymentReference,
    resumePendingPayment: true,
  };

  if (compact) {
    return (
      <>
        <Card className={`${plan.popular ? 'border-blue-500 shadow-md' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-gray-500 text-sm ml-1">{plan.period}</span>
                </div>
              </div>
              {plan.popular && <Badge className="bg-blue-500">Popular</Badge>}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              size="sm"
              className="w-full mb-2"
              variant={plan.popular ? 'default' : 'outline'}
              onClick={() => handleSelectPlan('mobile_money')}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Subscribe
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Mobile Money & Card accepted
            </p>
          </CardContent>
        </Card>

        <Dialog open={showPayment} onOpenChange={handleDialogChange}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Subscribe to {plan.name}</DialogTitle>
            </DialogHeader>

            {subscriptionResult && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Subscription payment started. Reference: <span className="font-mono">{subscriptionResult.reference}</span>
                </AlertDescription>
              </Alert>
            )}

            <LencoPayment
              {...sharedPaymentProps}
              description={`${plan.name} Plan - ${plan.price}${plan.period}`}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Card className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}>
        {plan.popular && (
          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
            Most Popular
          </Badge>
        )}
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{plan.name}</CardTitle>
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-bold">{plan.price}</span>
            <span className="text-gray-500 ml-1">{plan.period}</span>
          </div>
          <CardDescription>{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2">
            <Button
              className="w-full"
              variant={plan.popular ? 'default' : 'outline'}
              onClick={() => handleSelectPlan('card')}
              disabled={loading}
            >
              {loading && paymentMethod === 'card' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Subscribe with Card
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleSelectPlan('mobile_money')}
              disabled={loading}
            >
              {loading && paymentMethod === 'mobile_money' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4 mr-2" />
              )}
              Pay with Mobile Money
            </Button>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              💳 Secure payments by Lenco | 🔒 Bank-level encryption
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPayment} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
          </DialogHeader>

          {subscriptionResult && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Subscription payment started. Reference: <span className="font-mono">{subscriptionResult.reference}</span>
              </AlertDescription>
            </Alert>
          )}

          <LencoPayment
            {...sharedPaymentProps}
            description={paymentDescription}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
