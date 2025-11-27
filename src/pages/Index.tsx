import React from 'react';
import AppLayout from '@/components/AppLayout';
import HeroSection from '@/components/HeroSection';
import ServicesGrid from '@/components/ServicesGrid';
import MarketplacePreview from '@/components/MarketplacePreview';
import StatsSection from '@/components/StatsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { useAppContext } from '@/contexts/AppContext';

const Index: React.FC = () => {
  const { user } = useAppContext();

  return (
    <AppLayout>
      <div className="homepage-hero relative flex min-h-screen flex-col overflow-hidden bg-white/40 backdrop-blur-sm">
        <div className="relative z-10">
          <HeroSection />
          {user && (
            <div className="container mx-auto px-4 py-6">
              <SubscriptionBanner
                userType={user.account_type}
                compact={true}
                dismissible={true}
              />
            </div>
          )}
          <ServicesGrid />
          <MarketplacePreview />
          <StatsSection />
          <TestimonialsSection />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
