import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, ShoppingCart, Users, Building, BookOpen } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import AISearch from '@/components/marketplace/AISearch';
import AIRecommendations from '@/components/marketplace/AIRecommendations';
import AIPricingSuggestions from '@/components/marketplace/AIPricingSuggestions';
import MarketplaceGrid from '@/components/marketplace/MarketplaceGrid';
import AIAssistant from '@/components/marketplace/AIAssistant';
import { IntegratedMarketplace } from '@/components/marketplace/IntegratedMarketplace';
import { ComplianceGate } from '@/components/marketplace/ComplianceGate';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LencoPayment } from '@/components/LencoPayment';
import { supabase } from '@/lib/supabase-enhanced';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { PaymentStatusTracker } from '@/components/PaymentStatusTracker';
import BackToHomeButton from '@/components/BackToHomeButton';

// Products will be fetched from database in production

const Marketplace = () => {
  const [activeTab, setActiveTab] = useState('integrated');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({});
  const [cart, setCart] = useState<any[]>([]);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [trackingReference, setTrackingReference] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAppContext();

  const total = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  const handleCheckoutSuccess = async (paymentData: any) => {
    try {
      if (paymentData?.reference) {
        await supabase.from('marketplace_orders').insert({
          user_id: user?.id,
          items: cart,
          total_amount: total,
          payment_reference: paymentData.reference,
        });
        setTrackingReference(paymentData.reference);
      }
      setCart([]);
      setIsCheckoutOpen(false);
      toast({
        title: 'Payment successful',
        description: 'Your order has been placed.',
      });
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast({
        title: 'Order save failed',
        description: 'Please contact support if payment was deducted.',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters);
  };

  const handleAddToCart = (product: any) => {
    setCart(prev => [...prev, product]);
  };

  const handleViewDetails = (product: any) => {
    console.log('View product details:', product);
  };

  const handleSelectRecommendation = (recommendation: any) => {
    console.log('Selected recommendation:', recommendation);
  };

  const handlePriceSelect = (price: number) => {
    console.log('Selected price:', price);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 relative">
        <div
          className="fixed inset-0 bg-center bg-cover"
          style={{
            backgroundImage:
              "url('/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2001_52_19%20PM.png')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/70 to-emerald-600/70" />
        <div className="relative z-10 py-16 text-white">
          <div className="max-w-6xl mx-auto px-6 mb-6 flex justify-start">
            <BackToHomeButton variant="secondary" />
          </div>
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-bold mb-4">AI-Powered Marketplace</h1>
            <p className="text-xl mb-8">Discover services from freelancers, partners, and resources with intelligent AI analysis</p>
            
            <div className="flex justify-center gap-4 mb-8 flex-wrap">
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
          </div>
        </div>

        {/* Subscription Banner for Marketplace */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-6 bg-gray-50">
          <SubscriptionBanner compact={true} />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 bg-gray-50">
          {activeTab === 'integrated' && (
            <ComplianceGate requireCompliance={false}>
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Comprehensive Service Marketplace
                  </h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto">
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
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Products Coming Soon</h3>
                  <p className="text-gray-600">We're preparing an amazing selection of products and services for you.</p>
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
            <Button
              className="rounded-full w-14 h-14 shadow-lg relative"
              onClick={() => setIsCheckoutOpen(true)}
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                {cart.length}
              </span>
            </Button>
          )}
        </div>

        <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span>K{item.price}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>K{total}</span>
              </div>
              <LencoPayment
                amount={total}
                description="Marketplace purchase"
                transactionType="marketplace"
                onSuccess={handleCheckoutSuccess}
                onCancel={() => setIsCheckoutOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>

        {trackingReference && (
          <Dialog open onOpenChange={() => setTrackingReference(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Payment Status</DialogTitle>
              </DialogHeader>
              <PaymentStatusTracker
                reference={trackingReference}
                onComplete={() => setTrackingReference(null)}
                autoHide
              />
            </DialogContent>
          </Dialog>
        )}

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
