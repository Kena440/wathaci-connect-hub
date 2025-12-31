import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, CreditCard, Banknote, Info, CheckCircle, Loader2 } from 'lucide-react';
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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
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
          phone_number: phoneNumber
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Network error occurred');
      }
      
      if (data?.success) {
        setPaymentStatus('success');
        toast({
          title: "Thank You!",
          description: data.message || `Your donation of K${totalAmount} was successful!`,
        });
        
        // Wait a moment to show success state
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        throw new Error(data?.error || 'Payment was declined');
      }
    } catch (error: unknown) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      onError?.(error);
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Reset status after showing error
      setTimeout(() => setPaymentStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

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
            </div>
          </>
        )}

        {paymentMethod === 'card' && (
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Card payment will be processed securely
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