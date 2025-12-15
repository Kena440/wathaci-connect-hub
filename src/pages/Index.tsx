import React from 'react';
import AppLayout from '@/components/AppLayout';
import HeroSection from '@/components/HeroSection';
import ServicesGrid from '@/components/ServicesGrid';
import MarketplacePreview from '@/components/MarketplacePreview';
import StatsSection from '@/components/StatsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { useAppContext } from '@/contexts/AppContext';
import SeoMeta from '@/components/SeoMeta';

const Index: React.FC = () => {
  const { user } = useAppContext();

  return (
    <AppLayout>
      <SeoMeta
        title="Wathaci Connect - Zambian business platform for SME growth"
        description="Wathaci Connect is the Zambian SME ecosystem platform connecting entrepreneurs to business advisory services, compliance support, funding and investment matching across Africa."
        keywords={[
          'Wathaci Connect',
          'Zambian business platform',
          'SME ecosystem Zambia',
          'Entrepreneur support Zambia',
          'Funding and investment matching',
          'Business opportunities Zambia',
          'SME digital transformation'
        ]}
        canonicalPath="/"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Wathaci Connect',
            url: 'https://wathaci.com',
            logo: 'https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png',
            description:
              'Zambian SME growth platform delivering business advisory services, compliance support, investment readiness, and opportunity matching across Africa.',
            sameAs: [
              'https://www.linkedin.com/company/wathaci',
              'https://x.com/wathaci'
            ]
          },
          {
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'Wathaci Connect Zambia',
            url: 'https://wathaci.com',
            image: 'https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png',
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'ZM',
              addressLocality: 'Lusaka'
            },
            areaServed: ['Zambia', 'Africa'],
            description:
              'Local business innovation hub for SME compliance support, strategic partnerships, and investor engagement portal services in Zambia.',
            priceRange: '$$'
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Wathaci Connect',
            url: 'https://wathaci.com',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://wathaci.com/marketplace?q={search_term_string}',
              'query-input': 'required name=search_term_string'
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            name: 'Business advisory services and SME compliance support',
            areaServed: ['Zambia', 'Africa'],
            serviceType: [
              'Business advisory services',
              'SME compliance support',
              'Investment readiness and funding matching',
              'Strategic partnerships facilitation'
            ],
            provider: {
              '@type': 'Organization',
              name: 'Wathaci Connect'
            },
            description:
              'Digital platform offering SME compliance tools, opportunity matching engine, and business advisory services for Zambian entrepreneurs.'
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Opportunity matching engine',
            description:
              'Funding and investment matching product that connects entrepreneurs with investors in Zambia through the Wathaci Connect platform.',
            brand: {
              '@type': 'Organization',
              name: 'Wathaci Connect'
            },
            offers: {
              '@type': 'Offer',
              url: 'https://wathaci.com/marketplace',
              availability: 'https://schema.org/InStock'
            }
          }
        ]}
      />
      <div className="relative min-h-screen overflow-hidden bg-white/40 backdrop-blur-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-center bg-no-repeat bg-cover"
          style={{
            backgroundImage: "url('/images/Homepage%20Background%202.png')",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-600/40 to-emerald-600/40"
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
