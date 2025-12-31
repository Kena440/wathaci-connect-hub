import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { PriceNegotiation } from './PriceNegotiation';
import { MessageCircle, Clock, CheckCircle, XCircle, ArrowRight, DollarSign } from 'lucide-react';

interface Negotiation {
  id: string;
  service_title: string;
  initial_price: number;
  current_price: number;
  final_price: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  provider_id: string;
  client_id: string;
  service_id: string | null;
  platform_fee: number | null;
}

interface NegotiationHistoryProps {
  serviceId?: string;
  userId?: string;
}

export const NegotiationHistory = ({ serviceId, userId }: NegotiationHistoryProps) => {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null);

  useEffect(() => {
    fetchNegotiations();
    
    // Real-time subscription
    const channel = supabase
      .channel('negotiations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'negotiations'
        },
        () => {
          fetchNegotiations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceId, userId]);

  const fetchNegotiations = async () => {
    try {
      let query = supabase
        .from('negotiations')
        .select('*')
        .order('created_at', { ascending: false });

      if (serviceId) {
        query = query.eq('service_id', serviceId);
      }
      if (userId) {
        query = query.or(`client_id.eq.${userId},provider_id.eq.${userId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setNegotiations(data || []);
    } catch (error) {
      console.error('Error fetching negotiations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'countered': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'countered': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading negotiations...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Negotiation History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {negotiations.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No negotiations found</p>
        ) : (
          <div className="space-y-4">
            {negotiations.map((negotiation) => (
              <div key={negotiation.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium text-lg">{negotiation.service_title}</h4>
                  <Badge className={getStatusColor(negotiation.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(negotiation.status)}
                      {negotiation.status.charAt(0).toUpperCase() + negotiation.status.slice(1)}
                    </div>
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Initial Price</span>
                    <span className="font-medium flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      K{negotiation.initial_price.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">
                      {negotiation.final_price ? 'Final Price' : 'Current Offer'}
                    </span>
                    <span className="font-medium flex items-center gap-1 text-primary">
                      <DollarSign className="w-3 h-3" />
                      K{(negotiation.final_price || negotiation.current_price).toLocaleString()}
                    </span>
                  </div>
                </div>

                {negotiation.platform_fee && (
                  <div className="text-xs text-muted-foreground mb-3">
                    Platform fee: K{negotiation.platform_fee.toLocaleString()}
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">
                    Started: {new Date(negotiation.created_at).toLocaleDateString()}
                    {negotiation.updated_at !== negotiation.created_at && (
                      <span> • Updated: {new Date(negotiation.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  
                  {(negotiation.status === 'pending' || negotiation.status === 'countered') && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          Continue Negotiation
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <PriceNegotiation
                          initialPrice={negotiation.current_price}
                          serviceTitle={negotiation.service_title}
                          providerId={negotiation.provider_id}
                          serviceId={negotiation.service_id || undefined}
                          onNegotiationComplete={() => fetchNegotiations()}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
