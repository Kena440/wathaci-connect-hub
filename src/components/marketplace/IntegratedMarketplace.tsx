import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ServiceProviderCard } from './ServiceProviderCard';
import { PriceNegotiation } from '@/components/PriceNegotiation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Grid, List, Loader2, Users, Building, BookOpen, Star, MapPin, Clock, MessageSquare } from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string | null;
  provider_id: string;
  provider_type: string | null;
  category: string;
  subcategory: string | null;
  skills: string[] | null;
  location: string | null;
  delivery_time: string | null;
  rating: number | null;
  reviews_count: number | null;
  currency: string;
  price: number;
  min_price: number | null;
  max_price: number | null;
  price_type: string | null;
  images: string[] | null;
  is_featured: boolean | null;
  is_active: boolean | null;
}

interface TransformedService {
  id: string;
  title: string;
  description: string;
  provider: string;
  providerType: 'freelancer' | 'partnership' | 'resource';
  category: string;
  skills: string[];
  location: string;
  deliveryTime: string;
  rating: number;
  reviews: number;
  currency: string;
  price: number;
  minPrice: number | null;
  maxPrice: number | null;
  image: string;
  providerId: string;
  providerAvatar: string | null;
  subcategory: string | null;
  deliveryTimeRaw: string | null;
}

export const IntegratedMarketplace = () => {
  const [services, setServices] = useState<TransformedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProviderType, setSelectedProviderType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedService, setSelectedService] = useState<TransformedService | null>(null);
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [providerOptions, setProviderOptions] = useState<TransformedService[] | null>(null);
  const [providerOptionsContext, setProviderOptionsContext] = useState<TransformedService | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const { toast } = useToast();

  const categories = [
    'all', 'technology', 'marketing', 'design', 'business', 
    'finance', 'legal', 'consulting', 'education', 'agriculture'
  ];

  const providerTypes: { value: string; label: string; icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
    { value: 'all', label: 'All Providers' },
    { value: 'freelancer', label: 'Freelancers', icon: Users },
    { value: 'partnership', label: 'Partners', icon: Building },
    { value: 'resource', label: 'Resources', icon: BookOpen }
  ];

  useEffect(() => {
    loadServices();
  }, [selectedCategory, selectedProviderType, selectedLocation]);

  const fetchProviderProfiles = async (ids: string[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean)));
    if (unique.length === 0) return {} as Record<string, { name: string; avatar: string | null }>;
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, business_name, avatar_url, profile_image_url')
      .in('id', unique);
    const map: Record<string, { name: string; avatar: string | null }> = {};
    (data || []).forEach((p) => {
      map[p.id] = {
        name: p.display_name || p.full_name || p.business_name || 'Service Provider',
        avatar: p.profile_image_url || p.avatar_url || null,
      };
    });
    return map;
  };

  const transformServices = async (rows: Service[]): Promise<TransformedService[]> => {
    const profileMap = await fetchProviderProfiles(rows.map((r) => r.provider_id));
    return rows.map((service) => ({
      id: service.id,
      title: service.title,
      description: service.description || '',
      provider: profileMap[service.provider_id]?.name || 'Service Provider',
      providerAvatar: profileMap[service.provider_id]?.avatar || null,
      providerType: (service.provider_type as 'freelancer' | 'partnership' | 'resource') || 'freelancer',
      category: service.category,
      subcategory: service.subcategory,
      skills: service.skills || [],
      location: service.location || 'Remote',
      deliveryTime: service.delivery_time || 'Varies',
      deliveryTimeRaw: service.delivery_time,
      rating: service.rating || 0,
      reviews: service.reviews_count || 0,
      currency: service.currency,
      price: service.price,
      minPrice: service.min_price,
      maxPrice: service.max_price,
      image: service.images?.[0] || '/placeholder.svg',
      providerId: service.provider_id,
    }));
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('services')
        .select('*')
        .eq('is_active', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }
      if (selectedProviderType !== 'all') {
        query = query.eq('provider_type', selectedProviderType);
      }
      if (selectedLocation !== 'all') {
        query = query.ilike('location', `%${selectedLocation}%`);
      }

      const { data, error } = await query.order('is_featured', { ascending: false });

      if (error) throw error;

      setServices(await transformServices((data || []) as Service[]));
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Step between clicking a service and negotiating: show every freelancer
  // offering this type of service.
  const handleServiceClick = async (service: TransformedService) => {
    setOptionsLoading(true);
    setProviderOptionsContext(service);
    try {
      let query = supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .eq('category', service.category);

      let { data, error } = await query.order('is_featured', { ascending: false });
      if (error) throw error;

      let rows = (data || []) as Service[];

      // Narrow by subcategory only when it meaningfully narrows the list
      if (service.subcategory) {
        const narrowed = rows.filter((r) => r.subcategory === service.subcategory);
        if (narrowed.length > 1) rows = narrowed;
      }

      const options = await transformServices(rows);

      if (options.length <= 1) {
        setProviderOptions(null);
        setProviderOptionsContext(null);
        setSelectedService(options[0] || service);
        return;
      }

      setProviderOptions(options);
    } catch (error) {
      console.error('Error loading providers:', error);
      setProviderOptions(null);
      setProviderOptionsContext(null);
      setSelectedService(service);
    } finally {
      setOptionsLoading(false);
    }
  };

  const handleContactProvider = () => {
    if (!selectedService) return;
    setShowNegotiation(true);
    toast({
      title: `Conversation with ${selectedService.provider}`,
      description: 'Send a message or an offer to start the conversation.',
    });
  };

  const formatPrice = (service: TransformedService) => {
    const minimum = service.minPrice ?? service.price;
    const maximum = service.maxPrice ?? service.price;
    if (minimum !== maximum) {
      return `${service.currency} ${minimum.toLocaleString()}–${maximum.toLocaleString()}`;
    }
    return `${service.currency} ${service.price.toLocaleString()}`;
  };

  const filteredServices = services.filter((service) =>
    service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.skills.some((skill) => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getProviderTypeStats = () => {
    const stats = services.reduce<Record<string, number>>((acc, service) => {
      acc[service.providerType] = (acc[service.providerType] || 0) + 1;
      return acc;
    }, {});
    return stats;
  };

  const stats = getProviderTypeStats();

  if (providerOptions && !selectedService) {
    const prices = providerOptions.map((o) => o.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Button
          variant="outline"
          onClick={() => {
            setProviderOptions(null);
            setProviderOptionsContext(null);
          }}
        >
          ← Back to Marketplace
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Choose a freelancer</h2>
          <p className="text-muted-foreground">
            {providerOptions.length} providers offering{' '}
            {providerOptionsContext?.subcategory || providerOptionsContext?.category} services
            {min !== max && ` · ${providerOptions[0].currency}${min.toLocaleString()} – ${providerOptions[0].currency}${max.toLocaleString()}`}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {providerOptions.map((option) => (
            <Card
              key={option.id}
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedService(option)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={option.providerAvatar || undefined} alt={option.provider} />
                    <AvatarFallback>{option.provider.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{option.provider}</p>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span>{option.rating}</span>
                        <span className="text-muted-foreground">({option.reviews})</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{option.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{option.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{option.deliveryTime}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{option.location}</span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {formatPrice(option)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedService) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button 
          variant="outline" 
          onClick={() => {
            setSelectedService(null);
            if (!providerOptions) setProviderOptionsContext(null);
          }}
          className="mb-6"
        >
          {providerOptions ? '← Back to freelancers' : '← Back to Marketplace'}
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
                <p className="text-muted-foreground mb-6">{selectedService.description}</p>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Provider:</span>
                    <span className="flex items-center gap-2 font-medium">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={selectedService.providerAvatar || undefined} alt={selectedService.provider} />
                        <AvatarFallback>{selectedService.provider.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {selectedService.provider}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> Location:
                    </span>
                    <span>{selectedService.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Delivery Time:
                    </span>
                    <span>{selectedService.deliveryTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Star className="w-4 h-4" /> Rating:
                    </span>
                    <span>{selectedService.rating} ⭐ ({selectedService.reviews} reviews)</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="text-3xl font-bold text-primary mb-4">
                      {formatPrice(selectedService)}
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={showNegotiation} onOpenChange={setShowNegotiation}>
                        <DialogTrigger asChild>
                          <Button className="flex-1" size="lg">
                            Order Now
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <PriceNegotiation
                            initialPrice={selectedService.price}
                            serviceTitle={selectedService.title}
                            providerId={selectedService.providerId}
                            serviceId={selectedService.id}
                            onNegotiationComplete={() => setShowNegotiation(false)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        className="flex-1"
                        size="lg"
                        onClick={handleContactProvider}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact Provider
                      </Button>
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
      {optionsLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Finding freelancers…</span>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{services.length}</div>
            <div className="text-sm text-muted-foreground">Total Services</div>
          </CardContent>
        </Card>
        {providerTypes.slice(1).map((type) => {
          const IconComponent = type.icon!;
          return (
            <Card key={type.value}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <IconComponent className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {stats[type.value] || 0}
                </div>
                <div className="text-sm text-muted-foreground">{type.label}</div>
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
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                <SelectItem value="online">Online/Remote</SelectItem>
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
              onSelect={handleServiceClick}
            />
          ))}
        </div>
      )}

      {filteredServices.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No services found matching your criteria.</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedProviderType('all');
              setSelectedLocation('all');
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
