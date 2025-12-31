import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

interface DonateButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export const DonateButton = ({ 
  variant = 'outline', 
  size = 'sm',
  className = '',
  showText = true 
}: DonateButtonProps) => {
  return (
    <Link to="/donate">
      <Button 
        variant={variant} 
        size={size} 
        className={`text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 ${className}`}
      >
        <Heart className={`h-4 w-4 ${showText ? 'mr-2' : ''}`} />
        {showText && 'Donate'}
      </Button>
    </Link>
  );
};