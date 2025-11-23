/**
 * OTP Verification Component
 * 
 * Provides a UI for sending and verifying OTP codes via SMS or WhatsApp.
 * 
 * Usage:
 * ```tsx
 * <OTPVerification
 *   onVerified={(phone) => console.log('Phone verified:', phone)}
 *   userId={user?.id} // Optional: Associate OTP with authenticated user
 * />
 * ```
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getApiEndpoint } from '@/config/api';
import { withSupportContact } from '@/lib/supportEmail';

interface OTPVerificationProps {
  onVerified?: (phone: string) => void;
  userId?: string;
  defaultChannel?: 'sms' | 'whatsapp';
}

type Channel = 'sms' | 'whatsapp';
type Step = 'phone' | 'code';

export default function OTPVerification({
  onVerified,
  userId,
  defaultChannel = 'sms',
}: OTPVerificationProps) {
  const [step, setStep] = useState<Step>('phone');
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const handleSendOTP = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(getApiEndpoint('/api/auth/otp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          channel,
          userId,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSuccess(`Verification code sent via ${channel.toUpperCase()}`);
        setExpiresAt(new Date(data.expiresAt));
        setStep('code');
      } else {
        setError(
          withSupportContact(data.error || 'Failed to send verification code')
        );
      }
    } catch (err) {
      setError(
        withSupportContact('Network error. Please check your connection and try again')
      );
      console.error('[OTPVerification] Send error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(getApiEndpoint('/api/auth/otp/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          channel,
          code,
        }),
      });

      const data = await response.json();

      if (data.ok && data.phoneVerified) {
        setSuccess('Phone number verified successfully!');
        onVerified?.(phone);
      } else {
        setError(withSupportContact(data.error || 'Verification failed'));
      }
    } catch (err) {
      setError(withSupportContact('Network error. Please try again'));
      console.error('[OTPVerification] Verify error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    setCode('');
    setError(null);
    setSuccess(null);
    handleSendOTP();
  };

  const handleReset = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setError(null);
    setSuccess(null);
    setExpiresAt(null);
  };

  const formatPhoneNumber = (value: string) => {
    // Auto-format phone number with + prefix
    const cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned && !cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const isPhoneValid = phone.length >= 10;
  const isCodeValid = /^\d{6}$/.test(code);

  return (
    <div className="w-full max-w-md space-y-6">
      {step === 'phone' && (
        <>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Verify Your Phone Number</h3>
            <p className="text-sm text-gray-600">
              We'll send you a verification code to confirm your phone number.
            </p>
          </div>

          <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>
            <TabsContent value="sms" className="space-y-4">
              <p className="text-sm text-gray-600">
                Receive a verification code via SMS text message.
              </p>
            </TabsContent>
            <TabsContent value="whatsapp" className="space-y-4">
              <p className="text-sm text-gray-600">
                Receive a verification code via WhatsApp message.
              </p>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+260971234567"
              value={phone}
              onChange={handlePhoneChange}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Include country code (e.g., +260 for Zambia)
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleSendOTP}
            disabled={!isPhoneValid || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send Code via ${channel.toUpperCase()}`
            )}
          </Button>
        </>
      )}

      {step === 'code' && (
        <>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Enter Verification Code</h3>
            <p className="text-sm text-gray-600">
              We sent a 6-digit code to <strong>{phone}</strong> via{' '}
              {channel.toUpperCase()}.
            </p>
            {expiresAt && (
              <p className="text-xs text-gray-500">
                Code expires at {expiresAt.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleVerifyOTP}
              disabled={!isCodeValid || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Code'
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleResendOTP}
                disabled={loading}
                className="flex-1"
              >
                Resend Code
              </Button>
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={loading}
                className="flex-1"
              >
                Change Number
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
