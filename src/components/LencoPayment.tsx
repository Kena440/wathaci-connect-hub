import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, CreditCard, Banknote, Info, AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { lencoPaymentService } from '@/lib/services/lenco-payment-service';
import { validatePhoneNumber, formatAmount, TransactionType } from '@/lib/payment-config';
import { useAppContext } from '@/contexts/AppContext';
import { PaymentStatusTracker } from '@/components/PaymentStatusTracker';

interface LencoPaymentProps {
  amount: string | number;
  description: string;
  transactionType?: TransactionType;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  onError?: (error: any) => void;
}

export const LencoPayment = ({ amount, description, transactionType = 'marketplace', onSuccess, onCancel, onError }: LencoPaymentProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [showStatusTracker, setShowStatusTracker] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAppContext();

  // Calculate payment breakdown
  const totalAmount = typeof amount === 'string' ? parseFloat(amount.toString().replace(/[^\d.]/g, '')) : parseFloat(amount.toString());
  const paymentBreakdown = lencoPaymentService.calculatePaymentTotal(totalAmount, transactionType);
  const paymentConfig = lencoPaymentService.getConfig();

  // Validate configuration
  const isConfigured = lencoPaymentService.isConfigured();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!isConfigured) {
      newErrors.config = 'Payment system is not properly configured. Please contact support@wathaci.com.';
    }

    if (totalAmount < paymentConfig.minAmount) {
      newErrors.amount = `Minimum payment amount is ${formatAmount(paymentConfig.minAmount)}`;
    }

    if (totalAmount > paymentConfig.maxAmount) {
      newErrors.amount = `Maximum payment amount is ${formatAmount(paymentConfig.maxAmount)}`;
    }



    if (paymentMethod === 'mobile_money') {
      if (!provider) {
        newErrors.provider = 'Please select a mobile money provider';
      }

      if (!phoneNumber) {
        newErrors.phone = 'Phone number is required for mobile money payments';
      } else if (!validatePhoneNumber(phoneNumber, 'ZM')) {
        newErrors.phone = 'Please enter a valid Zambian phone number (e.g., 0961234567)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before proceeding",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      let paymentResponse;

      if (paymentMethod === 'mobile_money') {
        paymentResponse = await lencoPaymentService.processMobileMoneyPayment({
          amount: totalAmount,
          phone: phoneNumber,
          provider: provider as 'mtn' | 'airtel' | 'zamtel',
          email: user?.email || undefined,
          name: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile?.business_name || user?.email || 'Anonymous User',
          description,
          transactionType
        });
      } else {
        paymentResponse = await lencoPaymentService.processCardPayment({
          amount: totalAmount,
          email: user?.email || undefined,
          name: profile?.first_name && profile?.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile?.business_name || user?.email || 'Anonymous User',
          description,
          phone: phoneNumber || undefined,
          transactionType
        });
      }

      if (paymentResponse.success && paymentResponse.data) {
        setPaymentReference(paymentResponse.data.reference);
        setShowStatusTracker(true);

        toast({
          title: "Payment Initialized",
          description: "Your payment is being processed. Track progress below.",
        });

        // For mobile money, show instructions
        if (paymentMethod === 'mobile_money') {
          toast({
            title: "Payment Instructions",
            description: `Please check your ${provider.toUpperCase()} mobile money for a payment request of ${formatAmount(totalAmount)}`,
            duration: 10000,
          });
        } else {
          // For card payments, redirect to payment URL
          if (paymentResponse.data.payment_url) {
            window.open(paymentResponse.data.payment_url, '_blank');
            toast({
              title: "Redirecting to Payment",
              description: "Please complete payment in the new window",
            });
          }
        }

      } else {
        throw new Error(paymentResponse.error || 'Payment initialization failed');
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

  const handlePaymentComplete = (paymentData: any) => {
    setShowStatusTracker(false);
    setPaymentReference(null);
    onSuccess?.(paymentData);
  };

  const handlePaymentFailed = (paymentData: any) => {
    onError?.(paymentData);
  };

  if (!isConfigured) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Payment system is currently unavailable. Please contact support@wathaci.com.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Secure Payment Portal
          </CardTitle>
          <p className="text-sm text-gray-600">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Breakdown */}
          {showBreakdown && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Payment Breakdown</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-semibold">{formatAmount(paymentBreakdown.totalAmount)}</span>
                </div>
                {paymentBreakdown.feePercentage > 0 ? (
                  <div className="flex justify-between text-gray-600">
                    <span>Platform Fee ({paymentBreakdown.feePercentage}%):</span>
                    <span>{formatAmount(paymentBreakdown.platformFee)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-green-600">
                    <span>Platform Fee:</span>
                    <span>FREE ({transactionType === 'donation' ? 'Donation' : 'Subscription'} - No fees)</span>
                  </div>
                )}
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Provider Receives:</span>
                  <span>{formatAmount(paymentBreakdown.providerReceives)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {errors.config && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.config}</AlertDescription>
            </Alert>
          )}

          {errors.user && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.user}</AlertDescription>
            </Alert>
          )}

          {errors.amount && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.amount}</AlertDescription>
            </Alert>
          )}

          {/* Payment Method Selection */}
          <div>
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className={errors.method ? 'border-red-500' : ''}>
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

          {/* Mobile Money Fields */}
          {paymentMethod === 'mobile_money' && (
            <>
              <div>
                <Label>Mobile Money Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger className={errors.provider ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                    <SelectItem value="airtel">Airtel Money</SelectItem>
                    <SelectItem value="zamtel">Zamtel Kwacha</SelectItem>
                  </SelectContent>
                </Select>
                {errors.provider && <p className="text-red-500 text-sm mt-1">{errors.provider}</p>}
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  placeholder="097XXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (errors.phone) {
                      const newErrors = { ...errors };
                      delete newErrors.phone;
                      setErrors(newErrors);
                    }
                  }}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Format: 097XXXXXXX or 260097XXXXXXX
                </p>
              </div>
            </>
          )}

          {/* Security Notice */}
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Secure Payment</span>
            </div>
            <p className="text-xs text-green-700 mt-1">
              Your payment is secured with bank-level encryption and processed by Lenco.
            </p>
          </div>

          {/* Action Buttons */}
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
              disabled={loading || Object.keys(errors).length > 0}
              className="flex-1"
            >
              {loading ? 'Processing...' : `Pay ${formatAmount(paymentBreakdown.totalAmount)}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Payment Status Tracker */}
      <Dialog open={showStatusTracker} onOpenChange={setShowStatusTracker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Status</DialogTitle>
          </DialogHeader>
          {paymentReference && (
            <PaymentStatusTracker
              reference={paymentReference}
              onComplete={handlePaymentComplete}
              onFailed={handlePaymentFailed}
              showDetails={true}
              autoHide={false}
              maxTrackingTime={300000} // 5 minutes
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};