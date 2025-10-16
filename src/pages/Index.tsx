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
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('/images/ChatGPT%20Image%20Sep%2014%2C%202025%2C%2011_09_30%20PM.png')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/70 to-green-50/60" />
        </div>
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