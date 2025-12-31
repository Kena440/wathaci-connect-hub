import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, Smartphone, User, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { detectProvider, isValidZambianPhone } from '@/lib/phone-utils';
import { cn } from '@/lib/utils';

interface PhoneInputWithVerificationProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showVerification?: boolean;
  onProviderDetected?: (provider: string, providerName: string) => void;
  onAccountNameFound?: (accountName: string | null) => void;
  disabled?: boolean;
}

interface PhoneVerification {
  isVerifying: boolean;
  isVerified: boolean;
  accountName: string | null;
  providerName: string | null;
  error: string | null;
}

export const PhoneInputWithVerification = ({
  value,
  onChange,
  label = 'Phone Number',
  placeholder = '097XXXXXXX',
  className,
  showVerification = true,
  onProviderDetected,
  onAccountNameFound,
  disabled = false,
}: PhoneInputWithVerificationProps) => {
  const [phoneVerification, setPhoneVerification] = useState<PhoneVerification>({
    isVerifying: false,
    isVerified: false,
    accountName: null,
    providerName: null,
    error: null
  });

  // Auto-detect provider when phone number changes
  useEffect(() => {
    if (value.length >= 3) {
      const detected = detectProvider(value);
      if (detected) {
        setPhoneVerification(prev => ({
          ...prev,
          providerName: detected.providerName,
          error: null
        }));
        onProviderDetected?.(detected.provider, detected.providerName);
      }
    }
  }, [value, onProviderDetected]);

  // Verify phone and get account name
  const verifyPhone = useCallback(async (phone: string) => {
    if (!isValidZambianPhone(phone)) {
      setPhoneVerification(prev => ({
        ...prev,
        isVerifying: false,
        isVerified: false,
        accountName: null,
        error: null
      }));
      return;
    }

    setPhoneVerification(prev => ({
      ...prev,
      isVerifying: true,
      error: null
    }));

    try {
      const { data, error } = await supabase.functions.invoke('verify-phone', {
        body: { phone_number: phone }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        setPhoneVerification({
          isVerifying: false,
          isVerified: true,
          accountName: data.account_name,
          providerName: data.provider_name,
          error: null
        });
        
        onProviderDetected?.(data.provider, data.provider_name);
        onAccountNameFound?.(data.account_name);
      } else {
        setPhoneVerification(prev => ({
          ...prev,
          isVerifying: false,
          isVerified: false,
          error: data?.error || 'Verification failed'
        }));
      }
    } catch (err) {
      console.error('Phone verification error:', err);
      setPhoneVerification(prev => ({
        ...prev,
        isVerifying: false,
        isVerified: false,
        error: null // Don't show error, just continue without verification
      }));
    }
  }, [onProviderDetected, onAccountNameFound]);

  // Debounce phone verification
  useEffect(() => {
    if (!showVerification) return;
    
    const timer = setTimeout(() => {
      if (value.length >= 10) {
        verifyPhone(value);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value, verifyPhone, showVerification]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Input
          type="tel"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            phoneVerification.isVerified && 'pr-10 border-green-500',
            phoneVerification.error && 'border-destructive'
          )}
        />
        {phoneVerification.isVerifying && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {phoneVerification.isVerified && !phoneVerification.isVerifying && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>
      
      {/* Provider and Account Name Display */}
      {showVerification && (phoneVerification.providerName || phoneVerification.accountName) && (
        <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          {phoneVerification.providerName && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <Smartphone className="h-4 w-4" />
              <span className="font-medium">{phoneVerification.providerName}</span>
            </div>
          )}
          {phoneVerification.accountName && (
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200 mt-1">
              <User className="h-4 w-4" />
              <span className="font-semibold">{phoneVerification.accountName}</span>
            </div>
          )}
        </div>
      )}
      
      {phoneVerification.error && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {phoneVerification.error}
        </div>
      )}
      
      {showVerification && !phoneVerification.providerName && !phoneVerification.error && value.length < 3 && (
        <p className="text-xs text-muted-foreground">
          Enter your registered mobile money number
        </p>
      )}
    </div>
  );
};

export default PhoneInputWithVerification;
