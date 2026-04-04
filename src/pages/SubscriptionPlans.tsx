import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { SubscriptionManager } from '@/components/payments';
import { PaymentTestModeBanner } from '@/components/PaymentTestModeBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, HelpCircle } from 'lucide-react';

export const SubscriptionPlans = () => {
  const [selectedUserType, setSelectedUserType] = useState<string | undefined>(undefined);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.account_type) {
      setSelectedUserType(profile.account_type);
    }
  }, [profile]);

  return (
    <AppLayout>
      <PaymentTestModeBanner />
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
              <Crown className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Subscription Plans
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan to unlock your business potential on WATHACI Connect
            </p>
          </div>

          {/* Subscription Manager with Paddle Checkout */}
          {user ? (
            <SubscriptionManager accountType={selectedUserType} />
          ) : (
            <div className="text-center py-12">
              <Card className="max-w-md mx-auto bg-card border-border">
                <CardContent className="p-8">
                  <Crown className="w-12 h-12 text-accent mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Sign in to Subscribe</h3>
                  <p className="text-muted-foreground mb-6">
                    Create an account or sign in to choose a subscription plan
                  </p>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    Sign In / Sign Up
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Help Section */}
          <div className="text-center mt-12">
            <Card className="max-w-2xl mx-auto bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-lg text-foreground">Need Help Choosing?</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Our team can help you find the perfect plan for your specific business needs
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" className="border-border">
                    Contact Sales
                  </Button>
                  <Button 
                    onClick={() => user ? navigate('/wallet') : navigate('/auth')}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    {user ? 'View My Wallet' : 'Get Started'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
