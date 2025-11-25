/**
 * Document Payment Modal
 * Modal for processing payment for document generation
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Smartphone,
  CreditCard,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  FileText,
  Presentation,
} from 'lucide-react';
import { formatAmount, validatePhoneNumber } from '@/lib/payment-config';
import { documentGeneratorService, DOCUMENT_LABELS } from '@/lib/services/document-generator-service';
import type { DocumentType } from '@/@types/database';
import { useToast } from '@/hooks/use-toast';

interface DocumentPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentRequestId: string;
  documentType: DocumentType;
  amount: number;
  onSuccess: () => void;
}

export const DocumentPaymentModal = ({
  open,
  onOpenChange,
  documentRequestId,
  documentType,
  amount,
  onSuccess,
}: DocumentPaymentModalProps) => {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel' | 'zamtel' | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setError(null);

    // Validate mobile money fields
    if (paymentMethod === 'mobile_money') {
      if (!provider) {
        setError('Please select a mobile money provider');
        return;
      }
      if (!phoneNumber) {
        setError('Please enter your phone number');
        return;
      }
      if (!validatePhoneNumber(phoneNumber, 'ZM')) {
        setError('Please enter a valid Zambian phone number (e.g., 0961234567)');
        return;
      }
    }

    setLoading(true);

    try {
      const result = await documentGeneratorService.initializePayment({
        documentRequestId,
        paymentMethod,
        phoneNumber: paymentMethod === 'mobile_money' ? phoneNumber : undefined,
        provider: paymentMethod === 'mobile_money' ? (provider as 'mtn' | 'airtel' | 'zamtel') : undefined,
      });

      if (result.success) {
        toast({
          title: 'Payment Initiated',
          description:
            paymentMethod === 'mobile_money'
              ? `Please check your ${provider?.toUpperCase()} phone for the payment prompt.`
              : 'Redirecting to payment page...',
        });

        // For card payments, redirect to payment URL
        if (paymentMethod === 'card' && result.paymentUrl) {
          window.open(result.paymentUrl, '_blank');
        }

        onSuccess();
      } else {
        setError(result.error || 'Payment initialization failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const DocumentIcon = documentType === 'business_plan' ? FileText : Presentation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentIcon className="h-5 w-5 text-blue-600" />
            Payment Required
          </DialogTitle>
          <DialogDescription>
            Complete payment to generate your {DOCUMENT_LABELS[documentType]}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing Info */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{DOCUMENT_LABELS[documentType]}</span>
              <span className="text-xl font-bold text-blue-600">{formatAmount(amount)}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                This feature is NOT included in your subscription. Payment is required to generate the
                document.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as 'mobile_money' | 'card')}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="mobile_money"
                  id="mobile_money"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="mobile_money"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer"
                >
                  <Smartphone className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">Mobile Money</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="card" id="card" className="peer sr-only" />
                <Label
                  htmlFor="card"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 [&:has([data-state=checked])]:border-blue-600 cursor-pointer"
                >
                  <CreditCard className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">Card</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Mobile Money Fields */}
          {paymentMethod === 'mobile_money' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mobile Money Provider</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
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

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="097XXXXXXX"
                />
                <p className="text-xs text-muted-foreground">
                  Format: 097XXXXXXX or +260097XXXXXXX
                </p>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Your payment is secured with bank-level encryption.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Pay {formatAmount(amount)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
