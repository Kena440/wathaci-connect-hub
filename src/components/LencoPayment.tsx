import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, CreditCard, Banknote, Info, CheckCircle, Loader2, AlertCircle, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LencoPaymentProps {
  amount: string | number;
  description: string;
  donorName?: string;
  donorEmail?: string;
  message?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}

type PaymentStatus = 'idle' | 'processing' | 'pending' | 'otp-required' | 'success' | 'error';

export const LencoPayment = ({ 
  amount, 
  description, 
  donorName,
  donorEmail,
  message,
  onSuccess, 
  onCancel, 
  onError 
}: LencoPaymentProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const { toast } = useToast();

  // Calculate fee breakdown
  const totalAmount = typeof amount === 'string' 
    ? parseFloat(amount.toString().replace(/[^\d.]/g, '')) 
    : parseFloat(amount.toString());
  const platformFee = totalAmount * 0.02;
  const netAmount = totalAmount - platformFee;

  const handlePayment = async () => {
    if (paymentMethod === 'mobile_money' && (!phoneNumber || !provider)) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');
    
    try {
      const { data, error } = await supabase.functions.invoke('donation-payment', {
        body: {
          amount: totalAmount,
          currency: 'ZMW',
          donor_name: donorName,
          donor_email: donorEmail,
          message: message,
          payment_method: paymentMethod,
          payment_provider: provider,
          phone_number: phoneNumber,
          success_url: `${window.location.origin}/donate?status=success`,
          cancel_url: `${window.location.origin}/donate?status=cancelled`
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Network error occurred');
      }
      
      if (data?.success) {
        setPaymentReference(data.reference || '');
        
        // Handle card redirect
        if (data.status === 'redirect' && data.checkout_url) {
          toast({
            title: "Redirecting to Payment",
            description: "You will be redirected to complete your card payment...",
          });
          window.location.href = data.checkout_url;
          return;
        }

        // Handle OTP required
        if (data.status === 'otp-required') {
          setPaymentStatus('otp-required');
          setPaymentMessage(data.message || 'Please enter the OTP sent to your phone.');
          toast({
            title: "OTP Required",
            description: "Check your phone for the verification code",
          });
          return;
        }

        // Handle pay-offline (authorize on phone)
        if (data.status === 'pending' || data.status === 'pay-offline') {
          setPaymentStatus('pending');
          setPaymentMessage(data.message || 'Please authorize the payment on your phone.');
          toast({
            title: "Authorize Payment",
            description: "Check your phone to approve the payment",
          });
          return;
        }

        // Handle successful payment
        if (data.status === 'successful') {
          setPaymentStatus('success');
          toast({
            title: "Thank You!",
            description: data.message || `Your donation of K${totalAmount} was successful!`,
          });
          
          setTimeout(() => {
            onSuccess?.();
          }, 2000);
          return;
        }

        // Default success handling
        setPaymentStatus('success');
        toast({
          title: "Payment Initiated",
          description: data.message || "Your payment is being processed.",
        });
      } else {
        throw new Error(data?.error || 'Payment was declined');
      }
    } catch (error: unknown) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setPaymentMessage(errorMessage);
      onError?.(error);
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setTimeout(() => setPaymentStatus('idle'), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (paymentStatus === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto border-green-200 bg-green-50">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
            <CheckCircle className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-semibold text-green-800 mb-2">Payment Successful!</h3>
          <p className="text-green-600">
            Thank you for your generous donation of K{totalAmount.toFixed(2)}
          </p>
          <p className="text-sm text-green-500 mt-2">
            Your contribution will help Zambian entrepreneurs thrive.
          </p>
          {paymentReference && (
            <p className="text-xs text-green-400 mt-4">
              Reference: {paymentReference}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Pending/Authorize state
  if (paymentStatus === 'pending') {
    return (
      <Card className="w-full max-w-md mx-auto border-amber-200 bg-amber-50">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-4">
            <Phone className="h-10 w-10 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-amber-800 mb-2">Authorize Payment</h3>
          <p className="text-amber-700 mb-4">{paymentMessage}</p>
          <div className="bg-white/50 p-4 rounded-lg mb-4">
            <p className="text-sm text-amber-600">
              Check your <strong>{provider.toUpperCase()}</strong> mobile money for the payment prompt.
            </p>
            <p className="text-lg font-bold text-amber-800 mt-2">K{totalAmount.toFixed(2)}</p>
          </div>
          <p className="text-xs text-amber-500 mb-4">
            Reference: {paymentReference}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => setPaymentStatus('idle')}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // OTP required state
  if (paymentStatus === 'otp-required') {
    return (
      <Card className="w-full max-w-md mx-auto border-blue-200 bg-blue-50">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
            <Smartphone className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-semibold text-blue-800 mb-2">OTP Verification</h3>
          <p className="text-blue-700 mb-4">{paymentMessage}</p>
          <p className="text-sm text-blue-500 mb-4">
            An OTP has been sent to your phone. Please check your messages.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => setPaymentStatus('idle')}>
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (paymentStatus === 'error') {
    return (
      <Card className="w-full max-w-md mx-auto border-destructive/20 bg-destructive/5">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-semibold text-destructive mb-2">Payment Failed</h3>
          <p className="text-destructive/80 mb-4">{paymentMessage}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={() => setPaymentStatus('idle')}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Secure Payment Portal
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Payment Breakdown</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-semibold text-foreground">K{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Platform Fee (2%):</span>
              <span>K{platformFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Goes to SMEs:</span>
              <span>K{netAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile Money
                </div>
              </SelectItem>
              <SelectItem value="card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Debit/Credit Card
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {paymentMethod === 'mobile_money' && (
          <>
            <div>
              <Label>Mobile Money Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                  <SelectItem value="airtel">Airtel Money</SelectItem>
                  <SelectItem value="zamtel">Zamtel Kwacha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="097XXXXXXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your registered mobile money number
              </p>
            </div>
          </>
        )}

        {paymentMethod === 'card' && (
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              You will be redirected to a secure payment page
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={loading || (paymentMethod === 'mobile_money' && (!phoneNumber || !provider))}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay K${totalAmount.toFixed(2)}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
