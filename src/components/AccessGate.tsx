import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Eye, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEntitlements } from '@/hooks/useEntitlements';

interface AccessGateProps {
  children: React.ReactNode;
  feature: string;
}

export const AccessGate = ({ children, feature }: AccessGateProps) => {
  const { hasFullAccess, loading } = useEntitlements();
  const navigate = useNavigate();

  if (loading) {
    return <div className="animate-pulse bg-muted h-32 rounded"></div>;
  }

  // During grace period or with full access, show content
  if (hasFullAccess) {
    return <>{children}</>;
  }

  // After grace period without subscription
  return (
    <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Lock className="w-5 h-5" />
          Premium Feature - {feature}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Eye className="w-4 h-4" />
          <span>View-only access. Subscribe for full functionality.</span>
        </div>
        <Button 
          onClick={() => navigate('/subscription-plans')}
          className="bg-primary hover:bg-primary/90"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Subscribe Now
        </Button>
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export default AccessGate;
