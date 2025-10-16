import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AccessGateProps {
  children: React.ReactNode;
  feature: string;
}

export const AccessGate = ({ children, feature }: AccessGateProps) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isTrialActive, setIsTrialActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check subscription status
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('id, end_date, payment_status, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('payment_status', 'paid')
        .order('end_date', { ascending: false })
        .limit(1);

      if (!subscriptionError && subscriptions && subscriptions.length > 0) {
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Check trial status (14 days from profile creation)
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      if (profile) {
        const trialEnd = new Date(profile.created_at);
        trialEnd.setDate(trialEnd.getDate() + 14);
        const now = new Date();
        
        if (now < trialEnd) {
          setIsTrialActive(true);
          setHasAccess(true);
        }
      }
    } catch (error) {
      console.error('Error checking access:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-32 rounded"></div>;
  }

  if (!hasAccess) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Lock className="w-5 h-5" />
            Premium Feature - {feature}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-orange-700">
            <Eye className="w-4 h-4" />
            <span>View-only access. Subscribe for full functionality.</span>
          </div>
          <Button 
            onClick={() => navigate('/subscription-plans')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Subscribe Now
          </Button>
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};