import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LencoPayment } from './LencoPayment';
import ZRATaxCalculator from './ZRATaxCalculator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, DollarSign, CheckCircle, History, Send, Loader2 } from 'lucide-react';

interface PriceNegotiationProps {
  initialPrice: number;
  serviceTitle: string;
  providerId: string;
  serviceId?: string;
  onNegotiationComplete?: (finalPrice: number) => void;
}

interface NegotiationMessage {
  id: string;
  sender_id: string;
  message: string;
  proposed_price: number | null;
  message_type: string | null;
  created_at: string;
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
  const [user, setUser] = useState<any>(null);
  const [taxCalculation, setTaxCalculation] = useState<any>(null);
  const [negotiationId, setNegotiationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const managementFee = currentPrice * 0.03;
  const totalAmount = currentPrice + managementFee;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        checkExistingNegotiation(user.id);
      }
    };
    getUser();
  }, []);

  // Real-time subscription for negotiation messages
  useEffect(() => {
    if (!negotiationId) return;

    const channel = supabase
      .channel(`negotiation-${negotiationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiation_messages',
          filter: `negotiation_id=eq.${negotiationId}`
        },
        (payload) => {
          const newMessage = payload.new as NegotiationMessage;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'negotiations',
          filter: `id=eq.${negotiationId}`
        },
        (payload) => {
          const updated = payload.new as any;
          setCurrentPrice(updated.current_price);
          if (updated.status === 'accepted') {
            setStatus('agreed');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [negotiationId]);

  const checkExistingNegotiation = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('negotiations')
        .select('*')
        .eq('service_id', serviceId)
        .eq('client_id', userId)
        .in('status', ['pending', 'countered'])
        .single();

      if (data && !error) {
        setNegotiationId(data.id);
        setCurrentPrice(data.current_price);
        fetchMessages(data.id);
      }
    } catch (error) {
      // No existing negotiation, which is fine
    }
  };

  const fetchMessages = async (negId: string) => {
    const { data, error } = await supabase
      .from('negotiation_messages')
      .select('*')
      .eq('negotiation_id', negId)
      .order('created_at', { ascending: true });

    if (data && !error) {
      setMessages(data);
    }
  };

  const createNegotiation = async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('negotiation-manager', {
        body: {
          action: 'create',
          serviceId,
          providerId,
          serviceTitle,
          initialPrice,
          clientId: user.id
        }
      });

      if (error) throw error;
      setNegotiationId(data.negotiation.id);
      return data.negotiation.id;
    } catch (error) {
      console.error('Error creating negotiation:', error);
      toast({
        title: "Error",
        description: "Failed to start negotiation. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCounterOffer = async () => {
    if (!proposedPrice || !message || !user) return;
    
    setLoading(true);
    try {
      let negId = negotiationId;
      if (!negId) {
        negId = await createNegotiation();
        if (!negId) return;
      }

      const price = parseFloat(proposedPrice);
      
      const { data, error } = await supabase.functions.invoke('negotiation-manager', {
        body: {
          action: 'counter',
          negotiationId: negId,
          proposedPrice: price,
          message,
          senderId: user.id
        }
      });

      if (error) throw error;
      
      setCurrentPrice(price);
      setProposedPrice('');
      setMessage('');
      
      toast({
        title: "Counter Offer Sent",
        description: "Your price proposal has been sent to the service provider.",
      });
    } catch (error) {
      console.error('Error sending counter offer:', error);
      toast({
        title: "Error",
        description: "Failed to send counter offer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPrice = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let negId = negotiationId;
      if (!negId) {
        negId = await createNegotiation();
        if (!negId) return;
      }

      const { data, error } = await supabase.functions.invoke('negotiation-manager', {
        body: {
          action: 'accept',
          negotiationId: negId,
          accepterId: user.id
        }
      });

      if (error) throw error;
      
      setStatus('agreed');
      onNegotiationComplete?.(currentPrice);
      
      toast({
        title: "Price Accepted",
        description: "The negotiation has been completed successfully!",
      });
    } catch (error) {
      console.error('Error accepting price:', error);
      toast({
        title: "Error",
        description: "Failed to accept price. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
              <div className="flex justify-between text-sm text-muted-foreground">
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
              onSuccess={handlePaymentSuccess}
              onError={(error) => console.error('Payment failed:', error)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-2xl mx-auto border-0 shadow-none">
          <CardContent className="space-y-6 pt-6">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Current Price:</span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  K{currentPrice.toFixed(2)}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Management Fee (3%): K{managementFee.toFixed(2)} | Total: K{totalAmount.toFixed(2)}
              </div>
            </div>

            <ZRATaxCalculator
              amount={totalAmount}
              transactionType="service"
              onTaxCalculated={setTaxCalculation}
            />

            {/* Messages Thread */}
            {messages.length > 0 && (
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/50">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Negotiation Messages
                  </h4>
                </div>
                <ScrollArea className="h-48 p-3">
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`p-3 rounded-lg ${
                          msg.sender_id === user?.id 
                            ? 'bg-primary/10 ml-8' 
                            : 'bg-muted mr-8'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        {msg.proposed_price && (
                          <Badge variant="secondary" className="mt-2">
                            Proposed: K{msg.proposed_price.toFixed(2)}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

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
                  <Button 
                    onClick={handleCounterOffer} 
                    disabled={!proposedPrice || !message || loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Counter Offer
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleAcceptPrice}
                    disabled={loading}
                  >
                    Accept Current Price
                  </Button>
                </div>
              </div>
            )}

            {status === 'agreed' && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-bold">Price Agreed!</h3>
                <p className="text-muted-foreground">Final amount: K{taxCalculation?.netAmount?.toFixed(2) || totalAmount.toFixed(2)}</p>
                <Button onClick={handleProceedToPayment} className="bg-primary hover:bg-primary/90">
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
