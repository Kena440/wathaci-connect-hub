import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, ShoppingCart, Users, Building, BookOpen } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import AISearch from '@/components/marketplace/AISearch';
import AIRecommendations from '@/components/marketplace/AIRecommendations';
import AIPricingSuggestions from '@/components/marketplace/AIPricingSuggestions';
import AIAssistant from '@/components/marketplace/AIAssistant';
import { IntegratedMarketplace } from '@/components/marketplace/IntegratedMarketplace';
import { ComplianceGate } from '@/components/marketplace/ComplianceGate';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import heroMarketplace from '@/assets/hero-marketplace.jpg';

const Marketplace = () => {
  const [activeTab, setActiveTab] = useState('integrated');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [cart, setCart] = useState<any[]>([]);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
  };

  const handleSelectRecommendation = (recommendation: any) => {
    console.log('Selected recommendation:', recommendation);
  };

  const handlePriceSelect = (price: number) => {
    console.log('Selected price:', price);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <PageHero
          title="AI-Powered Marketplace"
          description="Discover services from freelancers, partners, and resources with intelligent AI analysis"
          backgroundImage={heroMarketplace}
        >
          <div className="flex justify-center gap-4 flex-wrap">
            <Button 
              variant={activeTab === 'integrated' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('integrated')}
              className="text-lg px-6 flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              All Services
            </Button>
            <Button 
              variant={activeTab === 'browse' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('browse')}
              className="text-lg px-6 flex items-center gap-2"
            >
              <Building className="w-4 h-4" />
              Products
            </Button>
            <Button 
              variant={activeTab === 'pricing' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('pricing')}
              className="text-lg px-6 flex items-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              AI Pricing
            </Button>
            <Button 
              variant={activeTab === 'recommendations' ? 'secondary' : 'outline'}
              onClick={() => setActiveTab('recommendations')}
              className="text-lg px-6"
            >
              Recommendations
            </Button>
          </div>
        </PageHero>

        {/* Subscription Banner */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          <SubscriptionBanner compact={true} />
        </div>
        
        <div className="max-w-6xl mx-auto px-6 py-12">
          {activeTab === 'integrated' && (
            <ComplianceGate requireCompliance={false}>
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-4">
                    Comprehensive Service Marketplace
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Browse services from our network of freelancers, verified partners, and educational resources. 
                    Our AI analyzes qualifications and offerings to match you with the perfect service provider.
                  </p>
                </div>
                <IntegratedMarketplace />
              </div>
            </ComplianceGate>
          )}

          {activeTab === 'browse' && (
            <ComplianceGate requireCompliance={false}>
              <div className="space-y-8">
                <AISearch 
                  onSearch={handleSearch}
                  onAIRecommendations={() => {}}
                />
                
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold mb-4">Products Coming Soon</h3>
                  <p className="text-muted-foreground">We're preparing an amazing selection of products and services for you.</p>
                </div>
              </div>
            </ComplianceGate>
          )}

          {activeTab === 'pricing' && (
            <AIPricingSuggestions
              onPriceSelect={handlePriceSelect}
            />
          )}

          {activeTab === 'recommendations' && (
            <AIRecommendations
              onSelectRecommendation={handleSelectRecommendation}
            />
          )}
        </div>

        <div className="fixed bottom-6 right-6 flex flex-col gap-4">
          <Button
            className="rounded-full w-14 h-14 shadow-lg"
            onClick={() => setIsAIAssistantOpen(true)}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          
          {cart.length > 0 && (
            <Button className="rounded-full w-14 h-14 shadow-lg relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {cart.length}
              </span>
            </Button>
          )}
        </div>

        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          context={{
            page: 'marketplace',
            userQuery: searchQuery,
            products: []
          }}
        />
      </div>
    </AppLayout>
  );
};

export default Marketplace;
