import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LencoPayment } from './LencoPayment';
import { NegotiationHistory } from './NegotiationHistory';
import ZRATaxCalculator from './ZRATaxCalculator';
import { supabase } from '@/lib/supabase-enhanced';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, DollarSign, CheckCircle, History } from 'lucide-react';

interface PriceNegotiationProps {
  initialPrice: number;
  serviceTitle: string;
  providerId: string;
  serviceId?: string;
  onNegotiationComplete?: (finalPrice: number) => void;
}

const PriceNegotiation = ({ 
  initialPrice, 
  serviceTitle, 
  providerId, 
  serviceId = 'default',
  onNegotiationComplete 
}: PriceNegotiationProps) => {
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [proposedPrice, setProposedPrice] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'negotiating' | 'agreed' | 'payment'>('negotiating');
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [taxCalculation, setTaxCalculation] = useState<any>(null);
  const { toast } = useToast();

  const managementFee = currentPrice * 0.03;
  const totalAmount = currentPrice + managementFee;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const saveNegotiation = async (proposedPrice: number, message: string, status: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('negotiation_history')
        .insert({
          service_id: serviceId,
          provider_id: providerId,
          client_id: user.id,
          service_title: serviceTitle,
          initial_price: initialPrice,
          proposed_price: proposedPrice,
          message,
          status
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving negotiation:', error);
    }
  };

  const handleCounterOffer = async () => {
    if (!proposedPrice || !message) return;
    
    const price = parseFloat(proposedPrice);
    await saveNegotiation(price, message, 'pending');
    
    setCurrentPrice(price);
    setProposedPrice('');
    setMessage('');
    
    toast({
      title: "Counter Offer Sent",
      description: "Your price proposal has been sent to the service provider.",
    });
  };

  const handleAcceptPrice = async () => {
    await saveNegotiation(currentPrice, 'Price accepted', 'accepted');
    setStatus('agreed');
    onNegotiationComplete?.(currentPrice);
  };

  const handleProceedToPayment = () => {
    setStatus('payment');
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setStatus('agreed');
    setShowPayment(false);
    toast({
      title: "Payment Successful",
      description: "Your payment has been processed successfully!",
    });
  };

  return (
    <>
      <DialogTitle>Price Negotiation</DialogTitle>
      <DialogDescription>
        Negotiate the price for {serviceTitle} with the service provider
      </DialogDescription>
      
      {showPayment ? (
        <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment for {serviceTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <ZRATaxCalculator
                amount={totalAmount}
                transactionType="service"
                onTaxCalculated={setTaxCalculation}
              />
              <div className="flex justify-between">
                <span>Service Price:</span>
                <span>K{currentPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Management Fee (3%):</span>
                <span>K{managementFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Final Payment Amount:</span>
                <span>K{taxCalculation?.netAmount?.toFixed(2) || totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <LencoPayment
              amount={taxCalculation?.netAmount?.toString() || totalAmount.toString()}
              description={`Payment for ${serviceTitle} - ZRA tax compliant`}
              transactionType="marketplace"
              onSuccess={handlePaymentSuccess}
              onError={(error) => console.error('Payment failed:', error)}
            />
          </CardContent>
        </Card>
      ) : showHistory ? (
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => setShowHistory(false)}
              className="mb-4"
            >
              ← Back to Negotiation
            </Button>
          </div>
          <NegotiationHistory serviceId={serviceId} userId={user?.id} />
        </div>
      ) : (
        <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
          <CardContent className="space-y-6 pt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Current Price:</span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  K{currentPrice.toFixed(2)}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                Management Fee (3%): K{managementFee.toFixed(2)} | Total: K{totalAmount.toFixed(2)}
              </div>
            </div>

            <ZRATaxCalculator
              amount={totalAmount}
              transactionType="service"
              onTaxCalculated={setTaxCalculation}
            />

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                View History
              </Button>
            </div>

            {status === 'negotiating' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="proposedPrice">Your Proposed Price (ZMW)</Label>
                  <Input
                    id="proposedPrice"
                    type="number"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    placeholder="Enter your price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message to Service Provider</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain your price proposal..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCounterOffer} disabled={!proposedPrice || !message}>
                    Send Counter Offer
                  </Button>
                  <Button variant="outline" onClick={handleAcceptPrice}>
                    Accept Current Price
                  </Button>
                </div>
              </div>
            )}

            {status === 'agreed' && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-bold">Price Agreed!</h3>
                <p className="text-gray-600">Final amount: K{taxCalculation?.netAmount?.toFixed(2) || totalAmount.toFixed(2)}</p>
                <Button onClick={handleProceedToPayment} className="bg-orange-600 hover:bg-orange-700">
                  Proceed to Payment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PriceNegotiation;
export { PriceNegotiation };