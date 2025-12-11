import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase-enhanced';
import { MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface NegotiationRecord {
  id: string;
  service_title: string;
  initial_price: number;
  proposed_price: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  created_at: string;
  provider_id: string;
  client_id: string;
}

interface NegotiationHistoryProps {
  serviceId?: string;
  userId?: string;
}

export const NegotiationHistory = ({ serviceId, userId }: NegotiationHistoryProps) => {
  const [negotiations, setNegotiations] = useState<NegotiationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNegotiations = useCallback(async () => {
    try {
      let query = supabase
        .from('negotiation_history')
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
  }, [serviceId, userId]);

  useEffect(() => {
    void fetchNegotiations();
  }, [fetchNegotiations]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'countered': return <MessageCircle className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'countered': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <p className="text-gray-500 text-center py-4">No negotiations found</p>
        ) : (
          <div className="space-y-4">
            {negotiations.map((negotiation) => (
              <div key={negotiation.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{negotiation.service_title}</h4>
                  <Badge className={getStatusColor(negotiation.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(negotiation.status)}
                      {negotiation.status}
                    </div>
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                  <div>
                    <span className="text-gray-600">Initial Price:</span>
                    <span className="ml-2 font-medium">K{negotiation.initial_price}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Proposed Price:</span>
                    <span className="ml-2 font-medium">K{negotiation.proposed_price}</span>
                  </div>
                </div>
                {negotiation.message && (
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                    {negotiation.message}
                  </p>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(negotiation.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};