import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, CreditCard, Banknote, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export interface LencoPaymentResult {
  transactionId: string;
  paymentMethod: 'mobile_money' | 'card';
  provider?: string;
  amount: number;
  platformFee: number;
  rawResponse?: Record<string, any> | null;
}

interface LencoPaymentProps {
  amount: string | number;
  description: string;
  onSuccess?: (result: LencoPaymentResult) => void;
  onCancel?: () => void;
  onError?: (error: any) => void;
}

export const LencoPayment = ({ amount, description, onSuccess, onCancel, onError }: LencoPaymentProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Calculate fee breakdown
  const totalAmount = useMemo(() => {
    const numericAmount = typeof amount === 'string'
      ? parseFloat(amount.toString().replace(/[^\d.]/g, ''))
      : Number(amount);

    return Number.isFinite(numericAmount) ? numericAmount : 0;
  }, [amount]);

  const managementFee = useMemo(() => totalAmount * 0.02, [totalAmount]);
  const providerAmount = useMemo(() => totalAmount - managementFee, [totalAmount, managementFee]);

  const resetInputs = () => {
    setPhoneNumber('');
    setProvider('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/[^0-9]/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 4);
    if (cleaned.length <= 2) {
      return cleaned;
    }
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  };

  const generateTransactionId = (data: any) => {
    if (data?.transaction_id) return data.transaction_id;
    if (data?.reference) return data.reference;

    const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
    if (cryptoObj?.randomUUID) {
      return cryptoObj.randomUUID();
    }

    return `txn-${Date.now()}`;
  };

  const handlePayment = async () => {
    if (!totalAmount) {
      toast({
        title: "Invalid amount",
        description: "Unable to process payment with the selected amount.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'mobile_money' && (!phoneNumber || !provider)) {
      toast({
        title: "Missing Information",
        description: "Please select a provider and enter your phone number",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvc)) {
      toast({
        title: "Missing Card Details",
        description: "Please provide complete card information to proceed",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('lenco-payment', {
        body: {
          amount: totalAmount,
          paymentMethod,
          phoneNumber,
          provider,
          description,
          cardDetails: paymentMethod === 'card' ? {
            number: cardNumber.replace(/[^0-9]/g, ''),
            expiry: cardExpiry,
            cvc: cardCvc,
          } : undefined,
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Network error occurred');
      }
      
      if (data?.success) {
        const transactionId = generateTransactionId(data);
        toast({
          title: "Payment Successful",
          description: `Payment completed. Transaction ID: ${transactionId}`,
        });
        onSuccess?.({
          transactionId,
          paymentMethod: paymentMethod as 'mobile_money' | 'card',
          provider: paymentMethod === 'mobile_money' ? provider : undefined,
          amount: totalAmount,
          platformFee: managementFee,
          rawResponse: data,
        });
        resetInputs();
      } else {
        throw new Error(data?.error || 'Payment was declined');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.message || 'Payment failed. Please check your connection and try again.';
      onError?.(error);
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5" />
          Secure Payment Portal
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Payment Breakdown</span>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-semibold">K{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Platform Fee (2%):</span>
              <span>K{managementFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Provider Receives:</span>
              <span>K{providerAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div>
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
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
          <>
            <div>
              <Label>Card Number</Label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Expiry Date</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                />
              </div>
              <div>
                <Label>CVC</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="123"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePayment} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Processing...' : `Pay K${totalAmount.toFixed(2)}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};