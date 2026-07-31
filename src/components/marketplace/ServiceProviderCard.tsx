import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Clock, User, Building, BookOpen } from 'lucide-react';

interface ServiceProviderCardProps {
  service: {
    id: string;
    title: string;
    description: string;
    provider: string;
    providerType: 'freelancer' | 'partnership' | 'resource';
    category: string;
    price: number;
    minPrice?: number | null;
    maxPrice?: number | null;
    currency: string;
    rating: number;
    reviews: number;
    skills: string[];
    deliveryTime: string;
    location: string;
    image: string;
    providerAvatar?: string | null;
  };
  onSelect: (service: any) => void;
}

export const ServiceProviderCard = ({ service, onSelect }: ServiceProviderCardProps) => {
  const minimumPrice = service.minPrice ?? service.price;
  const maximumPrice = service.maxPrice ?? service.price;
  const priceLabel = minimumPrice !== maximumPrice
    ? `${service.currency} ${minimumPrice.toLocaleString()}–${maximumPrice.toLocaleString()}`
    : `${service.currency} ${service.price.toLocaleString()}`;
  const getProviderIcon = () => {
    switch (service.providerType) {
      case 'freelancer':
        return <User className="w-4 h-4" />;
      case 'partnership':
        return <Building className="w-4 h-4" />;
      case 'resource':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getProviderTypeLabel = () => {
    switch (service.providerType) {
      case 'freelancer':
        return 'Freelancer';
      case 'partnership':
        return 'Partner';
      case 'resource':
        return 'Resource';
      default:
        return 'Provider';
    }
  };

  const getProviderTypeColor = () => {
    switch (service.providerType) {
      case 'freelancer':
        return 'bg-blue-100 text-blue-800';
      case 'partnership':
        return 'bg-emerald-100 text-emerald-800';
      case 'resource':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group cursor-pointer" onClick={() => onSelect(service)}>
      <CardHeader className="p-0">
        <div className="relative">
          <img
            src={service.image}
            alt={service.title}
            loading="lazy"
            decoding="async"
            className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute top-3 left-3">
            <Badge className={`${getProviderTypeColor()} flex items-center gap-1`}>
              {getProviderIcon()}
              {getProviderTypeLabel()}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-white/90 text-gray-800">
              {service.category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-lg mb-1 group-hover:text-blue-600 transition-colors">
            {service.title}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2">
            {service.description}
          </p>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="font-medium text-sm">{service.rating}</span>
            <span className="text-gray-500 text-sm">({service.reviews})</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin className="w-3 h-3" />
            <span>{service.location}</span>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="w-6 h-6">
              <AvatarImage src={service.providerAvatar || undefined} alt={service.provider} />
              <AvatarFallback className="text-[10px]">{service.provider.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="text-sm text-gray-600">By {service.provider}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{service.deliveryTime}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {service.skills.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {service.skills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{service.skills.length - 3}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-blue-600">
              {priceLabel}
            </span>
          </div>
          <Button size="sm" className="group-hover:bg-blue-600 transition-colors">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};