import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FreelancerDirectory } from '@/components/FreelancerDirectory';
import { FreelancerMatcher } from '@/components/FreelancerMatcher';
import { CollaborationSuggestions } from '@/components/CollaborationSuggestions';
import { DonateButton } from '@/components/DonateButton';
import AppLayout from '@/components/AppLayout';
import IndustryMatcher from '@/components/industry/IndustryMatcher';
import { Users, Lightbulb, Heart, Target } from 'lucide-react';
import BackToHomeButton from '@/components/BackToHomeButton';

const FreelancerHub = () => {
  const [activeTab, setActiveTab] = useState('directory');

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 relative">
        <div 
          className="fixed inset-0 bg-center bg-cover"
          style={{
            backgroundImage: "url('/images/Freelancer Hub.png')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/70 via-emerald-600/60 to-blue-800/70" />
        <div className="relative z-10 py-16 text-white">
          <div className="max-w-6xl mx-auto px-6 mb-8">
            <BackToHomeButton variant="secondary" />
          </div>
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

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 bg-gray-50">
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