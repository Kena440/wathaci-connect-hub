import { AppLayout } from '@/components/AppLayout';
import { WalletDashboard } from '@/components/payments';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Wallet = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">My Wallet</h1>
          <p className="text-muted-foreground mt-2">
            Manage your balance, view transactions, and request withdrawals
          </p>
        </div>
        <WalletDashboard />
      </div>
    </AppLayout>
  );
};

export default Wallet;