import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface ViewOnlyBannerProps {
  onUpgrade?: () => void;
  message?: string;
}

export const ViewOnlyBanner = ({ onUpgrade, message }: ViewOnlyBannerProps) => (
  <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          <Lock className="mr-1 h-4 w-4" /> View-only
        </Badge>
        <p className="text-sm text-orange-900">
          {message || 'You currently have view-only access. Subscribe to unlock full services on this page.'}
        </p>
      </div>
      <Button onClick={onUpgrade} className="bg-orange-600 hover:bg-orange-700 w-full md:w-auto">
        Subscribe to unlock
      </Button>
    </div>
  </div>
);

