import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, CreditCard, Smartphone, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase-enhanced';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { subscriptionService } from '@/lib/services/subscription-service';
import { LencoPayment } from '@/components/LencoPayment';

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

export const SubscriptionCard = ({ plan, userType, compact = false }: SubscriptionCardProps) => {
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [subscriptionResult, setSubscriptionResult] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAppContext();

  const handleSelectPlan = async (selectedPaymentMethod: 'mobile_money' | 'card') => {
    try {
      if (!user) {
        navigate('/signin');
        return;
      }

      // Check if user already has an active subscription
      const activeSubscription = await subscriptionService.getCurrentUserSubscription(user.id);
      if (activeSubscription.data) {
        toast({
          title: "Active Subscription Found",
          description: "You already have an active subscription. Please cancel it first to subscribe to a new plan.",
          variant: "destructive",
        });
        return;
      }

      setPaymentMethod(selectedPaymentMethod);
      setShowPayment(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Please sign in to subscribe",
        variant: "destructive",
      });
    }
  };

  const handleSubscription = async (paymentDetails: {
    email: string;
    name: string;
    phone?: string;
    provider?: 'mtn' | 'airtel' | 'zamtel';
  }) => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await subscriptionService.subscribeToPlan(
        user.id,
        plan.id,
        paymentMethod,
        paymentDetails
      );

      if (result.success) {
        setSubscriptionResult(result);
        
        if (paymentMethod === 'card' && result.payment_url) {
          // For card payments, redirect to payment gateway
          window.open(result.payment_url, '_blank');
          toast({
            title: "Redirecting to Payment",
            description: "Please complete payment in the new window",
          });
        } else {
          // For mobile money, show instructions
          toast({
            title: "Payment Initiated",
            description: "Please check your mobile money for payment instructions",
            duration: 10000,
          });
        }

        // Start payment verification polling
        if (result.subscription?.payment_reference) {
          setTimeout(() => {
            pollPaymentStatus(result.subscription!.payment_reference!);
          }, 5000);
        }
      } else {
        throw new Error(result.error || 'Subscription failed');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription Failed",
        description: error.message || 'Failed to create subscription',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (paymentReference: string) => {
    try {
      const verificationResult = await subscriptionService.verifySubscriptionPayment(paymentReference);
      
      if (verificationResult.success) {
        toast({
          title: "Subscription Activated!",
          description: `Welcome to the ${plan.name} plan!`,
        });
        setShowPayment(false);
        setSubscriptionResult(null);
        
        // Refresh user data or redirect
        window.location.reload();
      } else {
        // Continue polling for 2 minutes
        setTimeout(() => pollPaymentStatus(paymentReference), 10000);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Payment Verification Failed",
        description: "Please contact support@wathaci.com if payment was deducted",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      if (paymentData.reference) {
        await pollPaymentStatus(paymentData.reference);
      }
    } catch (error) {
      console.error('Payment success handler error:', error);
    }
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

        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Subscribe to {plan.name}</DialogTitle>
            </DialogHeader>
            
            {subscriptionResult && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Subscription created! Complete payment to activate your plan.
                </AlertDescription>
              </Alert>
            )}

            <LencoPayment
              amount={plan.lencoAmount / 100}
              description={`${plan.name} Plan - ${plan.price}${plan.period}`}
              transactionType="subscription"
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowPayment(false);
                setSubscriptionResult(null);
              }}
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

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
          </DialogHeader>
          
          {subscriptionResult && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Subscription created! Complete payment to activate your {plan.name} plan.
              </AlertDescription>
            </Alert>
          )}

          <LencoPayment
            amount={plan.lencoAmount / 100}
            description={`${plan.name} Plan Subscription - ${plan.price}${plan.period}`}
            transactionType="subscription"
            onSuccess={handlePaymentSuccess}
            onCancel={() => {
              setShowPayment(false);
              setSubscriptionResult(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};