import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FreelancerDirectory } from '@/components/FreelancerDirectory';
import { FreelancerMatcher } from '@/components/FreelancerMatcher';
import { CollaborationSuggestions } from '@/components/CollaborationSuggestions';
import { DonateButton } from '@/components/DonateButton';
import AppLayout from '@/components/AppLayout';
import IndustryMatcher from '@/components/industry/IndustryMatcher';
import { Users, Lightbulb, Target } from 'lucide-react';
import SeoMeta from '@/components/SeoMeta';

const FreelancerHub = () => {
  const [activeTab, setActiveTab] = useState('directory');

  return (
    <AppLayout>
      <SeoMeta
        title="Professional services marketplace in Zambia | Freelancer Hub"
        description="Find and hire vetted professionals in Zambia for SME advisory, compliance, finance, marketing, and technology projects. Wathaci Connect aligns experts with SMEs, investors, and donor programmes."
        keywords={[
          'Professional services marketplace Zambia',
          'Hire freelancers in Zambia',
          'SME advisory services Lusaka',
          'Business consultants for SMEs',
          'Digital services marketplace Africa'
        ]}
        canonicalPath="/freelancer-hub"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'ProfessionalService',
            name: 'Wathaci Connect Freelancer Hub',
            serviceType: [
              'Business advisory services for SMEs',
              'Legal and compliance consulting',
              'Finance and accounting services',
              'Digital marketing and technology delivery'
            ],
            areaServed: ['Zambia', 'Africa'],
            url: 'https://wathaci.com/freelancer-hub'
          }
        ]}
      />
      <div className="min-h-screen bg-gray-50 relative">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-center bg-cover"
          style={{
            backgroundImage: "url('/images/Freelancer Hub.png')",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-600/70 via-emerald-600/60 to-blue-800/70"
        />
        <div className="relative z-10 py-16 text-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-bold mb-4">Freelancer Hub</h1>
                <p className="text-xl">Connect, collaborate, and grow your business network</p>
              </div>
              <DonateButton />
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 bg-gray-50 space-y-10">
          <section className="bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Professional services marketplace built for Zambia&apos;s SMEs</h2>
            <p className="text-gray-700 leading-relaxed">
              The Freelancer Hub is the go-to marketplace for Zambian professionals to package services and for SMEs to book trusted
              advisors. Whether you need investment readiness support, compliance documentation, or a growth marketing sprint,
              Wathaci Connect matches you to experts who understand the local business landscape.
            </p>
            <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm text-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">For professionals</h3>
                <p>Publish offers, negotiate securely, and reach donor-funded programmes seeking vetted partners in Zambia.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">For SMEs</h3>
                <p>Search by industry, budget, and location to find compliant advisors who can fast-track funding applications.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">For investors &amp; donors</h3>
                <p>Source technical assistance providers to support portfolio companies and grant recipients with credible delivery partners.</p>
              </div>
            </div>
          </section>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4">
              <TabsTrigger value="matcher" className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Find Freelancer
              </TabsTrigger>
              <TabsTrigger value="directory" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Freelancer Directory
              </TabsTrigger>
              <TabsTrigger value="industry" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Industry Match
              </TabsTrigger>
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                AI Suggestions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="matcher" className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">AI-Powered Freelancer Matching</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Describe your project and let our AI find the perfect freelancers for you.
                </p>
              </div>
              <FreelancerMatcher />
            </TabsContent>

            <TabsContent value="directory" className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Find the Right Freelancer</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Browse our curated directory of skilled freelancers across Zambia. 
                  Filter by skills, location, and budget to find your perfect match.
                </p>
              </div>
              <FreelancerDirectory />
            </TabsContent>
            <TabsContent value="industry" className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Industry-Specific Matching</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Find specialized freelancers, funding, and partnerships tailored to your specific industry sector.
                </p>
              </div>
              <IndustryMatcher />
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Smart Collaboration Opportunities</h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Our AI analyzes your profile and market trends to suggest valuable 
                  collaboration opportunities that match your skills and goals.
                </p>
              </div>
              <CollaborationSuggestions />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
};

export default FreelancerHub;