import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Crown } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { isSubscriptionTemporarilyDisabled, SUBSCRIPTION_GRACE_LABEL } from '@/lib/subscriptionWindow';

export const TrialBanner = () => {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    checkTrialStatus();
  }, []);

  const checkTrialStatus = async () => {
    try {
      if (isSubscriptionTemporarilyDisabled()) {
        setShowBanner(true);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user has active subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subscription) return; // User has active subscription

      // Check trial status
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', user.id)
        .single();

      if (profile) {
        const trialEnd = new Date(profile.created_at);
        trialEnd.setDate(trialEnd.getDate() + 14);
        const now = new Date();
        const timeDiff = trialEnd.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysRemaining > 0) {
          setDaysLeft(daysRemaining);
          setShowBanner(true);
        } else {
          setDaysLeft(0);
          setShowBanner(true);
        }
      }
    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  };

  const graceActive = isSubscriptionTemporarilyDisabled();

  if (!showBanner && !graceActive) return null;

  const bannerText = graceActive
    ? `🎉 You have full access during the WATHACI Connect grace period until ${SUBSCRIPTION_GRACE_LABEL}.`
    : daysLeft && daysLeft > 0
      ? `${daysLeft} days left in your free trial`
      : 'Your free trial has expired - upgrade to continue';

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-orange-800">{bannerText}</span>
        {!graceActive && (
          <Button
            size="sm"
            onClick={() => navigate('/subscription-plans')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Crown className="w-4 h-4 mr-1" />
            Upgrade Now
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};