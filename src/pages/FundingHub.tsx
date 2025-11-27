import React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { FundingHub as FundingHubComponent } from '@/components/funding/FundingHub';
import { FundingMatcher } from '@/components/funding/FundingMatcher';
import LiveFundingMatcher from '@/components/funding/LiveFundingMatcher';
import { AutomatedMatchingEngine } from '@/components/funding/AutomatedMatchingEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FundingHub = () => {
  const sharedProps = { viewOnly: false } as const;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
          <div className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-center bg-cover opacity-70"
              style={{ backgroundImage: "url('/images/Funding%20Hub.png')" }}
            />
            <div className="relative z-10 max-w-6xl mx-auto px-4 py-10 min-h-[60vh]">
              <div className="mb-6 text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">AI-Powered Funding Hub</h1>
                <p className="text-gray-700 max-w-3xl mx-auto md:mx-0">
                  Discover live funding opportunities and get matched with expert professionals using advanced AI
                </p>
              </div>

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
                <FundingHubComponent />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FundingHub;
