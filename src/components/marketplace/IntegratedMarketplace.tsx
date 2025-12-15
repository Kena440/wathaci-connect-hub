import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ServiceProviderCard } from './ServiceProviderCard';
import { supabase } from '@/lib/supabase-enhanced';
import { Search, Filter, Grid, List, Loader2, Users, Building, BookOpen, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  marketplaceServices as fallbackServices,
  filterServicesByControls,
  generateServicesFromProfessionals,
  mergeMarketplaceServices,
  setDynamicMarketplaceServices,
  type MarketplaceService
} from '@/data/marketplace';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface IntegratedMarketplaceProps {
  onAddToCart?: (service: MarketplaceService) => void;
  onOrderNow?: (service: MarketplaceService) => void;
}

const providerLinks: Record<MarketplaceService['providerType'], { label: string; path: string; accent: string }> = {
  freelancer: {
    label: 'Visit Freelancer Hub',
    path: '/freelancers',
    accent: 'text-blue-600 hover:text-blue-700'
  },
  partnership: {
    label: 'Explore Partnership Hub',
    path: '/partnership-hub',
    accent: 'text-emerald-600 hover:text-emerald-700'
  },
  resource: {
    label: 'Browse Resources Library',
    path: '/resources',
    accent: 'text-purple-600 hover:text-purple-700'
  }
};

export const IntegratedMarketplace = ({ onAddToCart, onOrderNow }: IntegratedMarketplaceProps) => {
  const [services, setServices] = useState<MarketplaceService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProviderType, setSelectedProviderType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [priceRange, setPriceRange] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedService, setSelectedService] = useState<MarketplaceService | null>(null);
  const { toast } = useToast();
  const deferredSearch = useDeferredValue(searchInput);

  const categories = [
    'all', 'technology', 'marketing', 'design', 'business',
    'finance', 'legal', 'consulting', 'education'
  ];

  const providerTypes: { value: string; label: string; icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
    { value: 'all', label: 'All Providers' },
    { value: 'freelancer', label: 'Freelancers', icon: Users },
    { value: 'partnership', label: 'Partners', icon: Building },
    { value: 'resource', label: 'Resources', icon: BookOpen }
  ];

  const applyFilters = useCallback(
    (data: MarketplaceService[]) =>
      filterServicesByControls(data, {
        category: selectedCategory,
        providerType: selectedProviderType,
        location: selectedLocation,
        priceRange
      }),
    [priceRange, selectedCategory, selectedLocation, selectedProviderType]
  );

  const loadServices = useCallback(async () => {
    setLoading(true);
    let generatedServices: MarketplaceService[] = [];

    try {
      const filters = {
        category: selectedCategory,
        providerType: selectedProviderType,
        location: selectedLocation,
        priceRange: priceRange
      };

      const marketplacePromise = supabase.functions.invoke('marketplace-manager', {
        body: { action: 'search', filters }
      });

      const profilesPromise = supabase
        .from('profiles')
        .select(
          `id, first_name, last_name, business_name, account_type, country, address, industry_sector, experience_years, specialization, profile_image_url, linkedin_url, description, profile_completed, updated_at`
        )
        .in('account_type', ['professional', 'sole_proprietor'])
        .eq('profile_completed', true)
        .order('updated_at', { ascending: false })
        .limit(120);

      const [{ data: marketplaceData, error: marketplaceError }, { data: profileRows, error: profileError }] = await Promise.all([
        marketplacePromise,
        profilesPromise
      ]);

      let remoteServices: MarketplaceService[] = [];
      if (marketplaceError) {
        console.error('Marketplace manager error:', marketplaceError);
      }

      if (!marketplaceError && Array.isArray(marketplaceData?.data)) {
        remoteServices = (marketplaceData.data as MarketplaceService[]) ?? [];
      }

      if (profileError) {
        console.error('Error loading professional profiles:', profileError);
      }

      if (!profileError && Array.isArray(profileRows) && profileRows.length > 0) {
        const professionalIds = profileRows
          .map((profile: any) => profile?.id)
          .filter((id: string | undefined): id is string => typeof id === 'string');

        let assessments: any[] = [];
        if (professionalIds.length > 0) {
          const { data: assessmentRows, error: assessmentError } = await supabase
            .from('professional_needs_assessments')
            .select(
              `id, user_id, primary_profession, years_of_experience, current_employment_status, specialization_areas, services_offered, service_delivery_modes, hourly_rate_min, hourly_rate_max, target_client_types, client_size_preference, industry_focus, availability_hours_per_week, project_duration_preference, remote_work_capability, key_skills, certification_status`
            )
            .in('user_id', professionalIds);

          if (assessmentError) {
            console.error('Error loading professional assessments:', assessmentError);
          }

          if (!assessmentError && Array.isArray(assessmentRows)) {
            assessments = assessmentRows;
          }
        }

        const assessmentByUser = new Map<string, any>();
        assessments.forEach(assessment => {
          if (assessment?.user_id && !assessmentByUser.has(assessment.user_id)) {
            assessmentByUser.set(assessment.user_id, assessment);
          }
        });

        const professionalSources = profileRows.map((profile: any) => ({
          profile,
          assessment: assessmentByUser.get(profile.id)
        }));

        generatedServices = generateServicesFromProfessionals(professionalSources);
      }

      setDynamicMarketplaceServices(generatedServices);

      const combinedCatalog = mergeMarketplaceServices(
        generatedServices,
        remoteServices,
        fallbackServices
      );

      setServices(applyFilters(combinedCatalog));
    } catch (error) {
      console.error('Error loading services:', error);
      setDynamicMarketplaceServices(generatedServices);
      const fallbackCatalog = mergeMarketplaceServices(generatedServices, fallbackServices);
      setServices(applyFilters(fallbackCatalog));
    } finally {
      setLoading(false);
    }
  }, [applyFilters, priceRange, selectedCategory, selectedLocation, selectedProviderType]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const searchableServices = useMemo(
    () =>
      services.map((service) => ({
        service,
        titleLower: service.title.toLowerCase(),
        descriptionLower: service.description.toLowerCase(),
        providerLower: service.provider.toLowerCase(),
        skillsLower: service.skills.map((skill) => skill.toLowerCase()),
      })),
    [services]
  );

  const filteredServices = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return services;

    return searchableServices
      .filter((entry) =>
        entry.titleLower.includes(term) ||
        entry.descriptionLower.includes(term) ||
        entry.providerLower.includes(term) ||
        entry.skillsLower.some((skill) => skill.includes(term))
      )
      .map((entry) => entry.service);
  }, [deferredSearch, searchableServices, services]);

  const getProviderTypeStats = () => {
    const stats = services.reduce<Record<string, number>>((acc, service) => {
      acc[service.providerType] = (acc[service.providerType] || 0) + 1;
      return acc;
    }, {});
    return stats;
  };

  const stats = getProviderTypeStats();

  if (selectedService) {
    const providerLink = providerLinks[selectedService.providerType];

    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button
          variant="outline"
          onClick={() => setSelectedService(null)}
          className="mb-6"
        >
          ← Back to Marketplace
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{selectedService.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                {selectedService.providerType}
              </Badge>
              <Badge variant="secondary">{selectedService.category}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <img
                  src={selectedService.image}
                  alt={selectedService.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Skills & Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedService.skills.map((skill: string, idx: number) => (
                        <Badge key={idx} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-600 mb-6">{selectedService.description}</p>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium">{selectedService.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span>{selectedService.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Time:</span>
                    <span>{selectedService.deliveryTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span>{selectedService.rating} ⭐ ({selectedService.reviews} reviews)</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="text-3xl font-bold text-blue-600 mb-4">
                      {selectedService.currency}{selectedService.price.toLocaleString()}
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => {
                          onOrderNow?.(selectedService);
                          onAddToCart?.(selectedService);
                          toast({
                            title: 'Added to checkout',
                            description: `${selectedService.title} is ready in your cart.`
                          });
                        }}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Order Now with Lenco Pay
                      </Button>
                      <Link
                        to={providerLink.path}
                        className={cn('text-sm font-medium text-center transition-colors', providerLink.accent)}
                      >
                        {providerLink.label}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{services.length}</div>
            <div className="text-sm text-gray-600">Total Services</div>
          </CardContent>
        </Card>
        {providerTypes.slice(1).map((type) => {
          const IconComponent = type.icon!;
          return (
            <Card key={type.value}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <IconComponent className="w-5 h-5 text-gray-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats[type.value] || 0}
                </div>
                <div className="text-sm text-gray-600">{type.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProviderType} onValueChange={setSelectedProviderType}>
              <SelectTrigger>
                <SelectValue placeholder="Provider Type" />
              </SelectTrigger>
              <SelectContent>
                {providerTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="lusaka">Lusaka</SelectItem>
                <SelectItem value="ndola">Ndola</SelectItem>
                <SelectItem value="kitwe">Kitwe</SelectItem>
                <SelectItem value="livingstone">Livingstone</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="ml-2">Loading services...</span>
        </div>
      ) : (
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredServices.map((service) => (
            <ServiceProviderCard
              key={service.id}
              service={service}
              onSelect={setSelectedService}
            />
          ))}
        </div>
      )}

      {filteredServices.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No services found matching your criteria.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedProviderType('all');
              setSelectedLocation('all');
              setPriceRange('');
            }}
            className="mt-4"
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
};

