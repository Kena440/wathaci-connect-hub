import { Megaphone } from 'lucide-react';
import {
  getSubscriptionGraceBannerText,
  getSubscriptionGraceFollowUpText,
} from '@/lib/subscriptionWindow';
import { cn } from '@/lib/utils';

interface OnboardingGraceBannerProps {
  className?: string;
}

export const OnboardingGraceBanner = ({ className }: OnboardingGraceBannerProps) => {
  return (
    <div
      className={cn(
        'mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Megaphone className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold">{getSubscriptionGraceBannerText()}</p>
          <p className="text-emerald-800/90">{getSubscriptionGraceFollowUpText()}</p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGraceBanner;
