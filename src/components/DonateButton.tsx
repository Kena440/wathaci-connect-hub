/**
 * DonateButton Component
 * 
 * This component enables users to make donations to support struggling SMEs
 * on the Wathaci Connect platform. Each donation helps SMEs cover short-term
 * gaps such as working capital, inventory, rent, and operational costs, helping
 * them stabilize and become investment-ready for long-term sustainability.
 * 
 * Features:
 * - Preset donation amounts (K20, K50, K100, K250) and custom input
 * - Platform fee calculation and transparent display
 * - Optional donor name and message
 * - Anonymous donation option
 * - Integration with Lenco payment gateway
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { donationService } from '@/lib/services/donation-service';

export const DonateButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Configuration from environment
  const minAmount = parseFloat(import.meta.env.VITE_MIN_PAYMENT_AMOUNT || '10');
  const maxAmount = parseFloat(import.meta.env.VITE_MAX_PAYMENT_AMOUNT || '50000');
  const platformFeePercentage = parseFloat(import.meta.env.VITE_PLATFORM_FEE_PERCENTAGE || '5');

  // Preset donation amounts
  const presetAmounts = [20, 50, 100, 250];

  // Get the current donation amount
  const currentAmount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

  // Calculate breakdown
  const breakdown = currentAmount > 0
    ? donationService.calculateDonationBreakdown(currentAmount, platformFeePercentage)
    : null;

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setErrors({});
  };

  const handleCustomAmountChange = (value: string) => {
    // Allow only numbers and decimal point
    const sanitized = value.replace(/[^\d.]/g, '');
    setCustomAmount(sanitized);
    setSelectedAmount(null);
    setErrors({});
  };

  const validateDonation = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentAmount || currentAmount <= 0) {
      newErrors.amount = 'Please enter a donation amount';
    } else if (currentAmount < minAmount) {
      newErrors.amount = `Minimum donation is K${minAmount}`;
    } else if (currentAmount > maxAmount) {
      newErrors.amount = `Maximum donation per transaction is K${maxAmount}`;
    }

    if (!isAnonymous && donorName && donorName.length > 100) {
      newErrors.name = 'Name is too long (max 100 characters)';
    }

    if (message && message.length > 500) {
      newErrors.message = 'Message is too long (max 500 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDonate = async () => {
    if (!validateDonation()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before proceeding",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await donationService.createDonation({
        amount: currentAmount,
        currency: 'ZMW',
        donorName: isAnonymous ? undefined : donorName || undefined,
        isAnonymous,
        message: message || undefined,
        source: 'web',
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create donation');
      }

      // Redirect to Lenco checkout
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast({
        title: "Donation Failed",
        description: error instanceof Error ? error.message : "Failed to process donation. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setDonorName('');
    setMessage('');
    setIsAnonymous(false);
    setErrors({});
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) handleReset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
          <Heart className="h-4 w-4 mr-2" />
          Donate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Support SME Development</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Impact Description */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-gray-700 ml-2">
              Your donation helps struggling SMEs cover short-term gaps like working capital, 
              inventory, rent, and operational costs—so they can stabilize, strengthen their 
              operations, and become investment-ready for long-term sustainability.
            </AlertDescription>
          </Alert>

          {/* Amount Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Donation Amount (ZMW)</Label>
            
            {/* Preset Amounts */}
            <div className="grid grid-cols-4 gap-2">
              {presetAmounts.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant={selectedAmount === amount ? "default" : "outline"}
                  onClick={() => handlePresetClick(amount)}
                  className="text-sm font-medium"
                  disabled={loading}
                >
                  K{amount}
                </Button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Label htmlFor="customAmount" className="text-xs text-gray-600">
                Or enter custom amount
              </Label>
              <Input
                id="customAmount"
                type="text"
                placeholder="e.g., 75"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                disabled={loading}
                className={errors.amount ? 'border-red-500' : ''}
              />
              {errors.amount && (
                <p className="text-xs text-red-600">{errors.amount}</p>
              )}
            </div>
          </div>

          {/* Payment Breakdown */}
          {breakdown && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Donation:</span>
                <span className="font-medium">K{breakdown.grossAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Platform support fee ({breakdown.platformFeePercentage}%):
                </span>
                <span className="font-medium">K{breakdown.platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">To SME support:</span>
                <span className="font-medium text-green-600">K{breakdown.netAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total charged:</span>
                  <span>K{breakdown.totalCharged.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Donor Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                disabled={loading}
              />
              <Label
                htmlFor="anonymous"
                className="text-sm font-medium cursor-pointer"
              >
                Donate anonymously
              </Label>
            </div>

            {!isAnonymous && (
              <div className="space-y-2">
                <Label htmlFor="donorName" className="text-sm font-medium">
                  Your Name (Optional)
                </Label>
                <Input
                  id="donorName"
                  type="text"
                  placeholder="e.g., John Doe"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  disabled={loading}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-medium">
                Message to SMEs (Optional)
              </Label>
              <Textarea
                id="message"
                placeholder="Share words of encouragement..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                rows={3}
                className={errors.message ? 'border-red-500' : ''}
              />
              {errors.message && (
                <p className="text-xs text-red-600">{errors.message}</p>
              )}
              <p className="text-xs text-gray-500">
                {message.length}/500 characters
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDonate}
              disabled={loading || !currentAmount || currentAmount <= 0}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  Donate K{currentAmount > 0 ? currentAmount.toFixed(2) : '0.00'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};