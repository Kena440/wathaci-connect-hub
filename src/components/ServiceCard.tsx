import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentWithNegotiation } from './PaymentWithNegotiation';
import { useState } from 'react';

interface ServiceCardProps {
  title: string;
  description: string;
  image: string;
  color: string;
  details: string;
  price?: number;
  providerId?: string;
}

export const ServiceCard = ({ 
  title, 
  description, 
  image, 
  color, 
  details, 
  price = 500,
  providerId = 'default-provider'
}: ServiceCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className={`${color} hover:shadow-lg transition-all transform hover:-translate-y-1`}>
      <CardHeader>
        <div className="w-full h-48 mb-4 rounded-lg overflow-hidden">
          <img
            src={image}
            alt={`${title} - SME growth platform service in Zambia`}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">{description}</p>
        <div className="mb-4">
          <span className="text-2xl font-bold text-green-600">ZMW {price}</span>
          <span className="text-gray-500 ml-1">starting from</span>
        </div>
        {showDetails && (
          <div className="mb-4 p-4 bg-white/50 rounded-lg">
            <p className="text-sm text-gray-800">{details}</p>
          </div>
        )}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Show Less' : 'Learn More'}
          </Button>
          <PaymentWithNegotiation
            initialPrice={price}
            serviceTitle={title}
            providerId={providerId}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;