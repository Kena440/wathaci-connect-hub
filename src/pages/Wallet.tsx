import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { WalletDashboard } from '@/components/payments';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import heroImage from '@/assets/hero-wallet.jpg';

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
      <PageHero
        title="My Wallet"
        description="Manage your balance, view transactions, and request withdrawals"
        backgroundImage={heroImage}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <WalletDashboard />
      </div>
    </AppLayout>
  );
};

export default Wallet;