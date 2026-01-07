import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, CreditCard, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSelectPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setShowPayment(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Please sign in to subscribe",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        toast({
          title: "Subscription Activated!",
          description: `Welcome to the ${plan.name} plan!`,
        });
        setShowPayment(false);
      }
    } catch (error) {
      console.error('Subscription update error:', error);
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
              onClick={handleSelectPlan}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Subscribe
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Subscribe to {plan.name}</DialogTitle>
            </DialogHeader>
            <LencoPayment
              amount={plan.price}
              description={`${plan.name} Plan`}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPayment(false)}
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
          <Button 
            className="w-full" 
            variant={plan.popular ? 'default' : 'outline'}
            onClick={handleSelectPlan}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Subscribe
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
          </DialogHeader>
          <LencoPayment
            amount={plan.price}
            description={`${plan.name} Plan Subscription`}
            onSuccess={handlePaymentSuccess}
            onCancel={() => setShowPayment(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
