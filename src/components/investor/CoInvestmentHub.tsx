import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAppContext } from '@/contexts/AppContext';
import { Users, TrendingUp, Calendar, Plus, DollarSign } from 'lucide-react';

interface CoInvestment {
  id: string;
  title: string;
  description: string | null;
  total_amount: number;
  funding_goal: number;
  status: string;
  deadline: string;
  participants_count: number;
  sme_id: string;
}

const CoInvestmentHub = () => {
  const [coInvestments, setCoInvestments] = useState<CoInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [participationAmount, setParticipationAmount] = useState('');
  const { user } = useAppContext();

  useEffect(() => {
    fetchCoInvestments();
  }, []);

  const fetchCoInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('co_investments')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoInvestments(data || []);
    } catch (error) {
      console.error('Error fetching co-investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleParticipate = async (coInvestmentId: string) => {
    if (!user || !participationAmount) return;

    try {
      const { error } = await supabase
        .from('co_investment_participants')
        .insert({
          co_investment_id: coInvestmentId,
          investor_id: user.id,
          amount_committed: parseFloat(participationAmount)
        });

      if (error) throw error;
      
      // Refresh the list
      fetchCoInvestments();
      setParticipationAmount('');
    } catch (error) {
      console.error('Error participating in co-investment:', error);
    }
  };

  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading co-investments...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Co-Investment Opportunities</h2>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Opportunity
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {coInvestments.map((investment) => (
          <Card key={investment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{investment.title}</CardTitle>
                <Badge variant="secondary">{investment.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700">{investment.description || 'No description'}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>K{investment.total_amount.toLocaleString()} / K{investment.funding_goal.toLocaleString()}</span>
                </div>
                <Progress value={getProgressPercentage(investment.total_amount, investment.funding_goal)} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1 text-blue-500" />
                  {investment.participants_count} investors
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1 text-orange-500" />
                  {new Date(investment.deadline).toLocaleDateString()}
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Participate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Participate in Co-Investment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Investment Amount (ZMW)</label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={participationAmount}
                        onChange={(e) => setParticipationAmount(e.target.value)}
                      />
                    </div>
                    <Button 
                      onClick={() => handleParticipate(investment.id)}
                      className="w-full"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Commit Investment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      {coInvestments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No co-investment opportunities available at the moment.
        </div>
      )}
    </div>
  );
};

export default CoInvestmentHub;