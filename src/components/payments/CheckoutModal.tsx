import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CreditCard, Wallet, AlertCircle } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  currency?: 'ZMW' | 'USD';
  description: string;
  recipientId?: string;
  transactionType?: 'service_purchase' | 'subscription';
  onSuccess?: (transactionId: string) => void;
}

export const CheckoutModal = ({
  isOpen,
  onClose,
  amount,
  currency = 'ZMW',
  description,
  recipientId,
  transactionType = 'service_purchase',
  onSuccess
}: CheckoutModalProps) => {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'ZMW' | 'USD'>(currency);
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [feeLoading, setFeeLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    reference: string;
    transactionId: string;
  } | null>(null);

  // Calculate fee when amount or currency changes
  const calculateFee = async () => {
    if (!session?.access_token || amount <= 0) return;
    
    setFeeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-payments', {
        body: {
          action: 'get_fee',
          amount,
          currency: selectedCurrency
        }
      });

      if (error) throw error;
      setPlatformFee(data.platform_fee || 0);
    } catch (error) {
      console.error('Error calculating fee:', error);
      setPlatformFee(amount * 0.05); // Default 5%
    } finally {
      setFeeLoading(false);
    }
  };

  // Calculate fee on mount and currency change
  useState(() => {
    if (isOpen && amount > 0) {
      calculateFee();
    }
  });

  const handleInitiatePayment = async () => {
    if (!session?.access_token) {
      toast.error('Please sign in to make a payment');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-payments', {
        body: {
          action: 'initiate',
          amount,
          currency: selectedCurrency,
          description,
          recipient_id: recipientId,
          transaction_type: transactionType
        }
      });

      if (error) throw error;

      if (data.success) {
        setPaymentInitiated(true);
        setPaymentDetails({
          reference: data.reference,
          transactionId: data.transaction_id
        });
        toast.success('Payment initiated successfully');
      } else {
        throw new Error(data.error || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentDetails) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lenco-payments', {
        body: {
          action: 'verify',
          reference: paymentDetails.reference
        }
      });

      if (error) throw error;

      if (data.transaction?.status === 'successful') {
        toast.success('Payment confirmed!');
        onSuccess?.(paymentDetails.transactionId);
        onClose();
      } else if (data.transaction?.status === 'failed') {
        toast.error('Payment failed. Please try again.');
        setPaymentInitiated(false);
        setPaymentDetails(null);
      } else {
        toast.info('Payment is still pending. Please complete the payment and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPaymentInitiated(false);
    setPaymentDetails(null);
    onClose();
  };

  const netAmount = amount - platformFee;
  const currencySymbol = selectedCurrency === 'USD' ? '$' : 'K';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CreditCard className="w-5 h-5 text-accent" />
            {paymentInitiated ? 'Complete Payment' : 'Checkout'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {paymentInitiated
              ? 'Complete your payment using the details below'
              : description}
          </DialogDescription>
        </DialogHeader>

        {!paymentInitiated ? (
          <div className="space-y-4 py-4">
            {/* Currency Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(value: 'ZMW' | 'USD') => {
                  setSelectedCurrency(value);
                  calculateFee();
                }}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  <SelectItem value="ZMW">ZMW (Zambian Kwacha)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Summary */}
            <div className="rounded-lg bg-secondary p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">
                  {currencySymbol}{amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Platform Fee
                  {feeLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                </span>
                <span className="font-medium text-foreground">
                  {currencySymbol}{platformFee.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-accent">
                  {currencySymbol}{amount.toFixed(2)}
                </span>
              </div>
              {recipientId && (
                <div className="text-xs text-muted-foreground">
                  Seller receives: {currencySymbol}{netAmount.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Payment Instructions */}
            <div className="rounded-lg bg-accent/10 border border-accent/20 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Wallet className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Payment Reference</p>
                  <p className="text-sm font-mono text-accent">{paymentDetails?.reference}</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Please make a payment of <strong className="text-foreground">{currencySymbol}{amount.toFixed(2)}</strong> using your preferred payment method.</p>
                <p className="mt-2">Include the reference number above in your payment description.</p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mt-0.5 text-accent" />
              <p>After making the payment, click "Verify Payment" to confirm your transaction.</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="border-border">
            Cancel
          </Button>
          {!paymentInitiated ? (
            <Button
              onClick={handleInitiatePayment}
              disabled={isLoading || amount <= 0}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ${currencySymbol}${amount.toFixed(2)}`
              )}
            </Button>
          ) : (
            <Button
              onClick={handleVerifyPayment}
              disabled={isLoading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify Payment'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;