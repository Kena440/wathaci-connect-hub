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
      <div className="relative min-h-screen bg-gray-50">
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-center bg-cover"
          style={{
            backgroundImage:
              "url('/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2001_52_19%20PM.png')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-blue-600/70 to-emerald-600/70"
        />
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