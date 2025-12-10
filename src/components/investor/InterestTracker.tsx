import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';
import { Eye, MessageCircle, TrendingUp, Heart, Calendar } from 'lucide-react';

interface Interest {
  id: string;
  sme_id: string;
  interest_type: string;
  amount_interested: number;
  message: string;
  status: string;
  created_at: string;
  sme: {
    business_name: string;
    industry: string;
    location: string;
  };
}

const InterestTracker = () => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAppContext();

  const fetchInterests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('investor_interests')
        .select(`
          *,
          sme:profiles!investor_interests_sme_id_fkey(
            business_name,
            industry,
            location
          )
        `)
        .eq('investor_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterests(data || []);
    } catch (error) {
      console.error('Error fetching interests:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetchInterests();
  }, [user, fetchInterests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'investment' ? <TrendingUp className="w-4 h-4" /> : <Heart className="w-4 h-4" />;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading interests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Interests</h2>
        <Badge variant="outline">{interests.length} Total</Badge>
      </div>

      <div className="grid gap-4">
        {interests.map((interest) => (
          <Card key={interest.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(interest.interest_type)}
                  <CardTitle className="text-lg">
                    {interest.sme?.business_name}
                  </CardTitle>
                </div>
                <Badge className={getStatusColor(interest.status)}>
                  {interest.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {interest.sme?.industry} • {interest.sme?.location}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {interest.amount_interested && (
                <div className="text-lg font-semibold text-green-600">
                  Amount: K{interest.amount_interested.toLocaleString()}
                </div>
              )}
              
              {interest.message && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{interest.message}</p>
                </div>
              )}

              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(interest.created_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Contact SME
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {interests.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          You haven't shown interest in any SMEs yet.
        </div>
      )}
    </div>
  );
};

export default InterestTracker;