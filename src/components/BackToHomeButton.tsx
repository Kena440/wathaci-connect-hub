import type { ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BackToHomeButtonProps {
  className?: string;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
}

export const BackToHomeButton = ({
  className,
  variant = 'secondary',
  size = 'sm',
}: BackToHomeButtonProps) => {
  return (
    <div className={cn('inline-flex', className)}>
      <Button asChild variant={variant} size={size} className="gap-2">
        <Link to="/">
          <Home className="h-4 w-4" aria-hidden="true" />
          <span className="font-semibold">Back to Home</span>
        </Link>
      </Button>
    </div>
  );
};

export default BackToHomeButton;
