import React from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import HeroSection from '@/components/HeroSection';
import ServicesGrid from '@/components/ServicesGrid';
import MarketplacePreview from '@/components/MarketplacePreview';
import StatsSection from '@/components/StatsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Heart, Users, Sparkles } from 'lucide-react';

const DonateCTA = () => (
  <section className="py-16 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 text-rose-500 mb-6">
          <Heart className="h-8 w-8" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Help Zambian SMEs Thrive
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Your donation directly supports small and medium enterprises across Zambia. 
          Help us create jobs, build skills, and transform communities.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/donate">
            <Button size="lg" className="bg-rose-500 hover:bg-rose-600 text-white shadow-lg">
              <Heart className="h-5 w-5 mr-2" />
              Donate Now
            </Button>
          </Link>
          <Link to="/about-us">
            <Button size="lg" variant="outline" className="border-rose-200 text-rose-600 hover:bg-rose-50">
              <Users className="h-5 w-5 mr-2" />
              Learn More
            </Button>
          </Link>
        </div>
        <div className="flex justify-center items-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>2,500+ SMEs Supported</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>15,000+ Jobs Created</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Index: React.FC = () => {
  const { profile } = useAuth();

  return (
    <AppLayout>
      <HeroSection />
      {profile && (
        <div className="container mx-auto px-4 py-6">
          <SubscriptionBanner 
            userType={profile.account_type || undefined} 
            compact={true}
            dismissible={true}
          />
        </div>
      )}
      <ServicesGrid />
      <DonateCTA />
      <MarketplacePreview />
      <StatsSection />
      <TestimonialsSection />
    </AppLayout>
  );
};

export default Index;