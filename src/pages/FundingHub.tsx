import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { FundingHub as FundingHubComponent } from '@/components/funding/FundingHub';
import { FundingMatcher } from '@/components/funding/FundingMatcher';
import LiveFundingMatcher from '@/components/funding/LiveFundingMatcher';
import { AutomatedMatchingEngine } from '@/components/funding/AutomatedMatchingEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import SeoMeta from '@/components/SeoMeta';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

const FundingHub = () => {
  const { isSubscribed } = useSubscriptionAccess('funding hub');
  const { user } = useAppContext();
  const { toast } = useToast();
  const isAuthenticated = Boolean(user);

  // TEMPORARY: subscription gating bypass for Funding Hub analysis (see subscriptionDebug.ts)
  // TODO: Restore subscription-gated viewOnly handling when analysis is complete.
  const sharedProps = { viewOnly: !isSubscribed } as const;

  const promptLogin = () =>
    toast({
      title: 'Sign in required',
      description: 'Please sign in to apply or request support on funding opportunities.',
    });

  return (
    <AppLayout>
      <SeoMeta
        title="Investor and donor funding hub | Wathaci Connect"
        description="Discover Zambian SME deals, impact programmes, and technical assistance partners. The Funding Hub matches investors and donors with vetted SMEs, proposals, and sector experts."
        keywords={[
          'Investment opportunities Zambia SMEs',
          'Donor programmes Zambia',
          'Funding hub for SMEs',
          'Connect entrepreneurs with investors in Zambia',
          'Impact investment pipeline Africa'
        ]}
        canonicalPath="/funding-hub"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Wathaci Connect Funding Hub',
            serviceType: 'Funding and investor matching for Zambian SMEs',
            areaServed: ['Zambia', 'Africa'],
            provider: {
              '@type': 'Organization',
              name: 'Wathaci Connect'
            },
            offers: {
              '@type': 'Offer',
              url: 'https://wathaci.com/funding-hub',
              description: 'Pipeline discovery, live funding calls, and AI-matched investment opportunities for SMEs.'
            }
          }
        ]}
      />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
          <div className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-center bg-cover opacity-70"
              style={{ backgroundImage: "url('/images/Funding%20Hub.png')" }}
            />
            <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 min-h-[60vh]">
              <div className="mb-6 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">AI-Powered Investor and Donor Funding Hub</h1>
                <p className="text-gray-700 max-w-3xl mx-auto md:mx-0">
                  Discover live funding opportunities, connect entrepreneurs with investors in Zambia, and build technical assistance
                  teams for grant programmes using verifiable SME data.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-gray-800 text-sm mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">For Investors</h2>
                  <p>Source investment-ready SMEs, track compliance, and deploy capital through curated deal pipelines.</p>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">For Donors</h2>
                  <p>Launch calls for proposals, align grantees with expert consultants, and report on programme delivery.</p>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">For SMEs</h2>
                  <p>Match with funding that fits your stage, build investor-grade documents, and respond to opportunities quickly.</p>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="mb-6 rounded-lg border border-orange-200 bg-white/80 p-4 text-left shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">Browse First, Sign In to Act</h3>
                  <p className="text-sm text-gray-700">
                    You can explore public funding opportunities without an account. Sign in when you are ready to apply or request
                    matching support.
                  </p>
                </div>
              )}

            <Tabs defaultValue="automated" className="space-y-6 relative w-full">
              <TabsList className="flex w-full flex-wrap gap-2 bg-white/90 backdrop-blur justify-center md:justify-start">
                <TabsTrigger value="automated">Automated Engine</TabsTrigger>
                <TabsTrigger value="matcher">AI Matcher</TabsTrigger>
                <TabsTrigger value="live-matcher">Live Opportunities</TabsTrigger>
                <TabsTrigger value="ai-analyzer">AI Analyzer</TabsTrigger>
                <TabsTrigger value="discovery">Discovery Hub</TabsTrigger>
              </TabsList>

              <TabsContent value="automated">
                <AutomatedMatchingEngine {...sharedProps} />
              </TabsContent>

              <TabsContent value="matcher">
                <FundingMatcher {...sharedProps} />
              </TabsContent>

              <TabsContent value="live-matcher">
                <LiveFundingMatcher {...sharedProps} />
              </TabsContent>

              <TabsContent value="ai-analyzer">
                <div className="p-8 text-center">
                  <h3 className="text-xl font-semibold mb-4">AI Analyzer Coming Soon</h3>
                  <p className="text-gray-600">Advanced AI analysis features will be available soon.</p>
                </div>
              </TabsContent>

              <TabsContent value="discovery">
                <FundingHubComponent
                  onAuthRequired={promptLogin}
                  isAuthenticated={isAuthenticated}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FundingHub;
