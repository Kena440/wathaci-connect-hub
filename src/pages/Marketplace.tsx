import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, ShoppingCart, Users, Building, BookOpen, Sparkles, Search } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHero from '@/components/PageHero';
import { EnhancedAISearch } from '@/components/marketplace/EnhancedAISearch';
import PersonalizedRecommendations from '@/components/marketplace/PersonalizedRecommendations';
import AIPricingSuggestions from '@/components/marketplace/AIPricingSuggestions';
import AIAssistant from '@/components/marketplace/AIAssistant';
import { IntegratedMarketplace } from '@/components/marketplace/IntegratedMarketplace';
import { ComplianceGate } from '@/components/marketplace/ComplianceGate';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { useAuth } from '@/contexts/AuthContext';
import heroMarketplace from '@/assets/hero-marketplace.jpg';

const Marketplace = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
    if (query) {
      setActiveTab('services');
    }
  };

  const handleAIRecommendations = (recommendations: any[]) => {
    setAiRecommendations(recommendations);
  };

  const handleSelectRecommendation = (recommendation: any) => {
    console.log('Selected recommendation:', recommendation);
    // Could navigate to detail page or open modal
  };

  const handlePriceSelect = (price: number) => {
    console.log('Selected price:', price);
  };

  const tabs = [
    { id: 'discover', label: 'Discover', icon: Sparkles },
    { id: 'services', label: 'All Services', icon: Users },
    { id: 'products', label: 'Products', icon: Building },
    { id: 'pricing', label: 'AI Pricing', icon: BookOpen },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        {/* Hero Section */}
        <PageHero
          title="AI-Powered Marketplace"
          description="Discover services tailored to your business needs with intelligent recommendations"
          backgroundImage={heroMarketplace}
        >
          <div className="flex flex-col items-center gap-6">
            {/* User welcome message */}
            {user && (
              <Badge variant="secondary" className="px-4 py-2 text-sm bg-background/80 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Personalized recommendations ready for you
              </Badge>
            )}
            
            {/* Tab Navigation */}
            <div className="flex justify-center gap-2 flex-wrap bg-background/60 backdrop-blur-sm rounded-xl p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button 
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 sm:px-6 flex items-center gap-2 ${
                      activeTab === tab.id 
                        ? 'bg-primary shadow-lg' 
                        : 'hover:bg-background/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </PageHero>

        {/* Subscription Banner */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <SubscriptionBanner compact={true} />
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
          {/* Discover Tab - AI Search + Personalized Recommendations */}
          {activeTab === 'discover' && (
            <div className="space-y-12">
              {/* AI Search Section */}
              <section>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 flex items-center justify-center gap-2">
                    <Search className="w-8 h-8 text-primary" />
                    Find What You Need
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Use our AI-powered search to describe what you're looking for in natural language
                  </p>
                </div>
                <EnhancedAISearch 
                  onSearch={handleSearch}
                  onAIRecommendations={handleAIRecommendations}
                />
              </section>

              {/* Personalized Recommendations */}
              <section>
                <PersonalizedRecommendations
                  onSelectRecommendation={handleSelectRecommendation}
                />
              </section>
            </div>
          )}

          {/* All Services Tab */}
          {activeTab === 'services' && (
            <ComplianceGate requireCompliance={false}>
              <div className="space-y-8">
                {/* Search Bar at top of services */}
                <EnhancedAISearch 
                  onSearch={handleSearch}
                  onAIRecommendations={handleAIRecommendations}
                />
                
                <IntegratedMarketplace />
              </div>
            </ComplianceGate>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <ComplianceGate requireCompliance={false}>
              <div className="space-y-8">
                <EnhancedAISearch 
                  onSearch={handleSearch}
                  onAIRecommendations={handleAIRecommendations}
                />
                
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                    <Building className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Products Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We're curating an amazing selection of products and equipment for your business needs.
                  </p>
                </div>
              </div>
            </ComplianceGate>
          )}

          {/* AI Pricing Tab */}
          {activeTab === 'pricing' && (
            <AIPricingSuggestions onPriceSelect={handlePriceSelect} />
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          <Button
            size="lg"
            className="rounded-full w-14 h-14 shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={() => setIsAIAssistantOpen(true)}
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          
          {cart.length > 0 && (
            <Button 
              size="lg"
              variant="secondary"
              className="rounded-full w-14 h-14 shadow-xl relative"
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {cart.length}
              </span>
            </Button>
          )}
        </div>

        {/* AI Assistant Modal */}
        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          context={{
            page: 'marketplace',
            userQuery: searchQuery,
            products: aiRecommendations
          }}
        />
      </div>
    </AppLayout>
  );
};

export default Marketplace;
