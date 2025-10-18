import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Check, AlertCircle } from 'lucide-react';

interface AddressInputProps {
  onAddressChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  value?: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export const AddressInput = ({ onAddressChange, value }: AddressInputProps) => {
  const [address, setAddress] = useState(value || '');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const geocoderRef = useRef<any>(null);

  useEffect(() => {
    // Load Google Maps API
    if (!window.google) {
      const script = document.createElement('script');
      const apiKey = typeof process !== 'undefined' && process.env.VITE_GOOGLE_MAPS_API_KEY 
        ? process.env.VITE_GOOGLE_MAPS_API_KEY 
        : (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY || 'demo-key';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        geocoderRef.current = new window.google.maps.Geocoder();
      };
      document.head.appendChild(script);
    } else {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, []);

  const validateAddress = async () => {
    if (!address.trim() || !geocoderRef.current) return;
    
    setIsValidating(true);
    setIsValid(null);

    try {
      geocoderRef.current.geocode(
        { address: address },
        (results: any[], status: string) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            const coords = {
              lat: location.lat(),
              lng: location.lng()
            };
            setCoordinates(coords);
            setIsValid(true);
            onAddressChange(address, coords);
          } else {
            setIsValid(false);
            setCoordinates(null);
          }
          setIsValidating(false);
        }
      );
    } catch (error) {
      console.error('Geocoding error:', error);
      setIsValid(false);
      setIsValidating(false);
    }
  };

  const handleAddressChange = (newAddress: string) => {
    setAddress(newAddress);
    setIsValid(null);
    setCoordinates(null);
    onAddressChange(newAddress);
  };

  return (
    <div className="space-y-2">
      <Label>Physical Address</Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="Enter your complete address"
            className={`pr-10 ${
              isValid === true ? 'border-green-500' : 
              isValid === false ? 'border-red-500' : ''
            }`}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isValidating && (
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            )}
            {isValid === true && <Check className="h-4 w-4 text-green-500" />}
            {isValid === false && <AlertCircle className="h-4 w-4 text-red-500" />}
          </div>
        </div>
        <Button
          type="button"
          onClick={validateAddress}
          disabled={!address.trim() || isValidating}
          variant="outline"
          size="sm"
        >
          <MapPin className="h-4 w-4 mr-1" />
          Verify
        </Button>
      </div>
      
      {isValid === false && (
        <p className="text-sm text-red-600">
          Address could not be verified. Please check and try again.
        </p>
      )}
      
      {isValid === true && coordinates && (
        <p className="text-sm text-green-600">
          ✓ Address verified and location mapped
        </p>
      )}
      
      <p className="text-xs text-gray-500">
        We use Google Maps to verify your address for better discoverability
      </p>
    </div>
  );
};