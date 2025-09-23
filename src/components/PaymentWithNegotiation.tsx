import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquare, CreditCard, DollarSign } from 'lucide-react';
import { LencoPayment } from './LencoPayment';
import ZRATaxCalculator from './ZRATaxCalculator';
import { useToast } from '@/hooks/use-toast';

interface PaymentWithNegotiationProps {
  initialPrice: number;
  serviceTitle: string;
  providerId: string;
}

export const PaymentWithNegotiation = ({ 
  initialPrice, 
  serviceTitle, 
  providerId 
}: PaymentWithNegotiationProps) => {
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [proposedPrice, setProposedPrice] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [taxCalculation, setTaxCalculation] = useState<any>(null);
  const { toast } = useToast();

  const handleCounterOffer = () => {
    if (!proposedPrice) return;
    const price = parseFloat(proposedPrice);
    setCurrentPrice(price);
    setProposedPrice('');
    toast({
      title: "Counter Offer Sent",
      description: "Your price proposal has been sent.",
    });
  };

  const handleAcceptPrice = () => {
    setAgreed(true);
    toast({
      title: "Price Agreed!",
      description: `Final price: K${currentPrice.toFixed(2)}`,
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <MessageSquare className="w-4 h-4 mr-2" />
          Negotiate & Pay
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Price Negotiation</DialogTitle>
        </DialogHeader>
        
        {showPayment ? (
          <div className="space-y-4">
            <ZRATaxCalculator
              amount={currentPrice}
              transactionType="service"
              onTaxCalculated={setTaxCalculation}
            />
            <LencoPayment
              amount={taxCalculation?.netAmount?.toString() || currentPrice.toString()}
              description={`Payment for ${serviceTitle} (incl. ZRA tax)`}
              transactionType="marketplace"
              onSuccess={() => {
                setShowPayment(false);
                toast({ title: "Payment Successful!" });
              }}
              onCancel={() => setShowPayment(false)}
            />
          </div>
        ) : (
          <Card className="border-0 shadow-none">
            <CardContent className="space-y-4 pt-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between">
                  <span>Current Price:</span>
                  <span className="font-bold">K{currentPrice.toFixed(2)}</span>
                </div>
              </div>

              <ZRATaxCalculator
                amount={currentPrice}
                transactionType="service"
                onTaxCalculated={setTaxCalculation}
              />

              {!agreed ? (
                <div className="space-y-3">
                  <Input
                    type="number"
                    placeholder="Your proposed price"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCounterOffer} disabled={!proposedPrice}>
                      Counter Offer
                    </Button>
                    <Button variant="outline" onClick={handleAcceptPrice}>
                      Accept Price
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-green-600 font-medium">Price Agreed!</p>
                  <Button onClick={() => setShowPayment(true)} className="w-full">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Proceed to Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};