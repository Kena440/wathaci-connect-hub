import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageCircle, ShoppingCart, Users, Building, BookOpen, ArrowRight, Handshake } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import AISearch from '@/components/marketplace/AISearch';
import AIRecommendations from '@/components/marketplace/AIRecommendations';
import AIPricingSuggestions from '@/components/marketplace/AIPricingSuggestions';
import MarketplaceGrid from '@/components/marketplace/MarketplaceGrid';
import AIAssistant from '@/components/marketplace/AIAssistant';
import { IntegratedMarketplace } from '@/components/marketplace/IntegratedMarketplace';
import { ComplianceGate } from '@/components/marketplace/ComplianceGate';
import { SubscriptionBanner } from '@/components/SubscriptionBanner';
import { LencoPayment } from '@/components/LencoPayment';
import { PaymentStatusTracker } from '@/components/PaymentStatusTracker';
import { supabase } from '@/lib/supabase-enhanced';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { SUPPORT_EMAIL } from '@/lib/supportEmail';
import { PaymentWithNegotiation } from '@/components/PaymentWithNegotiation';
import {
  marketplaceProducts as fallbackProducts,
  getMarketplaceCatalog,
  type MarketplaceProduct,
  type MarketplaceService,
  runMarketplaceSearch
} from '@/data/marketplace';

type CartItemType = 'product' | 'service';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: CartItemType;
  metadata?: Record<string, any>;
}

const quickLinks = [
  {
    title: 'Freelancer Hub',
    description: 'Match with vetted professionals, negotiate terms, and collaborate instantly.',
    path: '/freelancer-hub',
    icon: Users,
    accent: 'from-blue-50 via-white to-blue-100'
  },
  {
    title: 'Partnership Hub',
    description: 'Scale through strategic alliances, partner onboarding, and referral programs.',
    path: '/partnership-hub',
    icon: Handshake,
    accent: 'from-emerald-50 via-white to-emerald-100'
  },
  {
    title: 'Knowledge Resources',
    description: 'Access playbooks, compliance checklists, and AI-curated learning paths.',
    path: '/resources',
    icon: BookOpen,
    accent: 'from-purple-50 via-white to-purple-100'
  }
];

const Marketplace = () => {
  const [activeTab, setActiveTab] = useState<'integrated' | 'browse' | 'pricing' | 'recommendations'>('integrated');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<Record<string, any>>({});
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [trackingReference, setTrackingReference] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAppContext();

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'list-products' }
      });

      if (error) throw error;
      const payload = (data?.data || []) as MarketplaceProduct[];
      setProducts(payload.length ? payload : fallbackProducts);
      setProductsError(payload.length ? null : 'Showing curated catalog while live inventory syncs.');
    } catch (error) {
      console.error('Error loading marketplace products:', error);
      setProducts(fallbackProducts);
      setProductsError('Live products are unavailable. Showing our curated launch catalog.');
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const handleCheckoutSuccess = async (paymentData: any) => {
    try {
      if (paymentData?.reference) {
        await supabase.from('marketplace_orders').insert({
          user_id: user?.id,
          items: cart,
          total_amount: total,
          payment_reference: paymentData.reference
        });
        setTrackingReference(paymentData.reference);
      }
      setCart([]);
      setIsCheckoutOpen(false);
      toast({
        title: 'Payment successful',
        description: 'Your order has been placed.'
      });
    } catch (error: any) {
      console.error('Error saving order:', error);
      toast({
        title: 'Order save failed',
        description: `Please contact ${SUPPORT_EMAIL} if payment was deducted.`,
        variant: 'destructive'
      });
    }
  };

  const handleSearch = (query: string, filters: any) => {
    setSearchQuery(query);
    setSearchFilters(filters ?? {});

    if (query.trim()) {
      const { recommendations } = runMarketplaceSearch(query, filters?.categories ?? []);
      if (recommendations.length) {
        toast({
          title: 'AI search ready',
          description: 'We found recommendations in the AI tab tailored to your search.'
        });
      }
    }
  };

  const upsertCartItem = (item: CartItem) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(cartItem => cartItem.id === item.id && cartItem.type === item.type);
      if (existingIndex === -1) {
        return [...prev, item];
      }

      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + item.quantity
      };
      return updated;
    });
  };

  const handleAddProductToCart = (product: MarketplaceProduct) => {
    upsertCartItem({
      id: `product-${product.id}`,
      name: product.name,
      price: product.price,
      quantity: 1,
      type: 'product',
      metadata: { product }
    });
    toast({ title: 'Added to cart', description: `${product.name} is now in your cart.` });
  };

  const handleAddServiceToCart = (service: MarketplaceService) => {
    upsertCartItem({
      id: `service-${service.id}`,
      name: service.title,
      price: service.price,
      quantity: 1,
      type: 'service',
      metadata: { service }
    });
    toast({ title: 'Service ready', description: `${service.title} was added to your checkout.` });
  };

  const handleOrderServiceNow = (service: MarketplaceService) => {
    handleAddServiceToCart(service);
    setIsCheckoutOpen(true);
  };

  const handleViewDetails = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setIsProductDialogOpen(true);
  };

  const handleSelectRecommendation = (recommendation: any) => {
    if (recommendation?.type === 'product') {
      const match = products.find(product => product.id === recommendation.id) ||
        fallbackProducts.find(product => product.id === recommendation.id);
      if (match) {
        handleViewDetails(match);
      }
    } else if (recommendation?.type === 'service') {
      const catalog = getMarketplaceCatalog();
      const match = catalog.find(service => service.id === recommendation.id);
      if (match) {
        setActiveTab('integrated');
        handleOrderServiceNow(match);
      }
    } else {
      toast({
        title: 'Recommendation saved',
        description: 'Open the Messages page to follow up with specialists.'
      });
    }
  };

  const handlePriceSelect = (price: number) => {
    toast({ title: 'Suggested price applied', description: `AI recommends K${price.toLocaleString()}.` });
  };

  const removeCartItem = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const connectedHubs = quickLinks;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gray-50 relative">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-center bg-cover"
          style={{
            backgroundImage:
              "url('/images/ChatGPT%20Image%20Sep%2023%2C%202025%2C%2001_52_19%20PM.png')"
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-600/70 to-emerald-600/70"
        />
        <div className="relative z-10 py-16 text-white">
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

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-6 bg-gray-50">
          <SubscriptionBanner compact={true} />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 bg-gray-50 space-y-12">
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
                <IntegratedMarketplace
                  onAddToCart={handleAddServiceToCart}
                  onOrderNow={handleOrderServiceNow}
                />
              </div>
            </ComplianceGate>
          )}

          {activeTab === 'browse' && (
            <ComplianceGate requireCompliance={false}>
              <div className="space-y-8">
                <AISearch
                  onSearch={handleSearch}
                  onAIRecommendations={() => setActiveTab('recommendations')}
                />

                {productsError && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="py-4 text-amber-700 text-sm">
                      {productsError}
                    </CardContent>
                  </Card>
                )}

                {productsLoading ? (
                  <div className="text-center text-gray-500 text-sm py-10">
                    Fetching marketplace catalog…
                  </div>
                ) : (
                  <MarketplaceGrid
                    products={products}
                    searchQuery={searchQuery}
                    filters={searchFilters}
                    onAddToCart={handleAddProductToCart}
                    onViewDetails={handleViewDetails}
                  />
                )}
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

          <div className="grid md:grid-cols-3 gap-4">
            {connectedHubs.map(({ title, description, path, icon: Icon, accent }) => (
              <Card key={title} className={`bg-gradient-to-br ${accent} border-none shadow-sm`}> 
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-gray-800">
                    <Icon className="w-5 h-5" />
                    <CardTitle className="text-lg">{title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-gray-600 text-sm space-y-4">
                  <p>{description}</p>
                  <Button asChild variant="secondary" className="w-full justify-between">
                    <Link to={path}>
                      Continue to {title}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
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
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
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
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{item.type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>K{(item.price * item.quantity).toLocaleString()}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeCartItem(item.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>K{total.toLocaleString()}</span>
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

        {selectedProduct && (
          <Dialog
            open={isProductDialogOpen}
            onOpenChange={(open) => {
              setIsProductDialogOpen(open);
              if (!open) {
                setSelectedProduct(null);
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
              </DialogHeader>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-56 object-cover rounded-lg"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <p>{selectedProduct.description}</p>
                    <p className="font-medium text-gray-800">Seller: {selectedProduct.seller}</p>
                    <p>Location: {selectedProduct.location}</p>
                    <p>Rating: {selectedProduct.rating} ⭐ ({selectedProduct.reviews} reviews)</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-3xl font-bold text-blue-600">K{selectedProduct.price.toLocaleString()}</div>
                  <div className="flex gap-3">
                    <Button className="flex-1" onClick={() => handleAddProductToCart(selectedProduct)}>
                      Add to cart
                    </Button>
                    <Button variant="outline" onClick={() => setIsCheckoutOpen(true)}>
                      Checkout
                    </Button>
                  </div>
                  <PaymentWithNegotiation
                    initialPrice={selectedProduct.price}
                    serviceTitle={selectedProduct.name}
                    providerId={selectedProduct.id.toString()}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

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
            products
          }}
        />
      </div>
    </AppLayout>
  );
};

export default Marketplace;

