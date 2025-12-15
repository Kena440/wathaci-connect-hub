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
          'SME digital transformation',
          'Connect entrepreneurs with investors in Zambia',
          'Professional services marketplace Zambia',
          'SME compliance support Lusaka'
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
          },
          {
            '@context': 'https://schema.org',
            '@type': 'OfferCatalog',
            name: 'Wathaci Connect service catalog',
            url: 'https://wathaci.com/marketplace',
            itemListElement: [
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Professional services marketplace in Zambia',
                  description:
                    'Business advisory, legal, finance, and compliance experts for SMEs across Zambia and the wider African region.'
                }
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'SME compliance and readiness tools',
                  description: 'Readiness checklists, AI document generators, and compliance workflows tailored to Zambian regulations.'
                }
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Funding and investment matching',
                  description: 'Investor and donor matching engine for SMEs seeking capital and growth partnerships in Zambia.'
                }
              },
              {
                '@type': 'Offer',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Partnership and donor discovery',
                  description:
                    'Partnership hub for ecosystem builders, donor programmes, and corporate innovation teams focused on Zambia SMEs.'
                }
              }
            ]
          },
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How does Wathaci Connect match entrepreneurs with investors in Zambia?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text:
                    'Wathaci Connect uses an AI-driven opportunity matching engine to align SME profiles with donor, investor, and grant opportunities that match their sector, stage, and capital needs in Zambia.'
                }
              },
              {
                '@type': 'Question',
                name: 'Can professionals sell services to SMEs online in Zambia?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text:
                    'Yes. Verified professionals can list advisory, legal, finance, marketing, and technology services on the Wathaci Connect marketplace to reach SMEs nationwide.'
                }
              },
              {
                '@type': 'Question',
                name: 'Does the platform support SME compliance and investment readiness?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text:
                    'The platform includes compliance workflows, readiness assessments, and AI document generation to help SMEs formalise, stay compliant, and prepare investor-grade documentation.'
                }
              }
            ]
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
          <section className="container mx-auto px-4 py-12">
            <div className="bg-white/80 backdrop-blur shadow-lg rounded-2xl p-8 border border-emerald-100">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Professionals, SMEs, and Investors—One Connected Zambia SME Ecosystem
              </h2>
              <p className="text-gray-700 text-lg mb-6">
                Wathaci Connect delivers a three-phase onboarding journey that aligns the core of Zambia&apos;s SME economy:
                professionals monetise their expertise, SMEs unlock business support and funding, and donors or investors find
                verifiable pipeline opportunities.
              </p>
              <div className="grid md:grid-cols-3 gap-6 text-gray-800">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Phase 1: Professionals</h3>
                  <p className="text-sm leading-relaxed">
                    Create a service profile, publish packages, and appear in the professional services marketplace so SMEs can
                    easily source trusted advisors across legal, finance, technology, and growth marketing.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Phase 2: SMEs</h3>
                  <p className="text-sm leading-relaxed">
                    Complete readiness assessments, generate compliance documents, and use the opportunity matching engine to
                    reach investors, donors, and corporate partners seeking Zambian SMEs.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Phase 3: Donors &amp; Investors</h3>
                  <p className="text-sm leading-relaxed">
                    Access a curated pipeline of investment-ready SMEs, verify documentation, and use the Funding Hub to launch
                    calls for proposals or co-create programmes with ecosystem partners.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <TestimonialsSection />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
