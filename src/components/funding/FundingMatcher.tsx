import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-enhanced';
import { Search, TrendingUp, DollarSign, Clock, Loader2 } from 'lucide-react';

interface FundingMatcherProps {
  viewOnly?: boolean;
  onRequestAccess?: () => void;
}

export const FundingMatcher = ({ viewOnly = false, onRequestAccess }: FundingMatcherProps) => {
  const [businessProfile, setBusinessProfile] = useState({
    businessType: '',
    sector: '',
    stage: '',
    location: '',
    employees: ''
  });
  const [fundingNeeds, setFundingNeeds] = useState({
    amount: '',
    purpose: '',
    timeline: ''
  });
  interface FundingMatch {
    title?: string;
    provider?: string;
    match_score?: number;
    description?: string;
    max_amount?: number;
    funding_type?: string;
    application_deadline?: string;
    reasoning?: string;
  }

  const [matches, setMatches] = useState<FundingMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const ensureInteractive = () => {
    if (viewOnly) {
      onRequestAccess?.();
      return false;
    }
    return true;
  };

  const handleMatch = async () => {
    if (!ensureInteractive()) return;
    if (!businessProfile.businessType || !fundingNeeds.amount) {
      alert('Please fill in business type and funding amount');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding-matcher', {
        body: { businessProfile, fundingNeeds }
      });

      if (error) throw error;
      setMatches(data.matches || []);
    } catch (error) {
      console.error('Error matching funding:', error);
      alert('Error finding matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Your Perfect Funding Match
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Business Profile</h3>
              
              <Select value={businessProfile.businessType} onValueChange={(value) => 
                setBusinessProfile({...businessProfile, businessType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Business Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="sme">Small/Medium Enterprise</SelectItem>
                  <SelectItem value="cooperative">Cooperative</SelectItem>
                  <SelectItem value="social_enterprise">Social Enterprise</SelectItem>
                </SelectContent>
              </Select>

              <Select value={businessProfile.sector} onValueChange={(value) => 
                setBusinessProfile({...businessProfile, sector: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sector" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Location"
                value={businessProfile.location}
                onChange={(e) => setBusinessProfile({...businessProfile, location: e.target.value})}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Funding Requirements</h3>
              
              <Input
                placeholder="Funding Amount (ZMW)"
                type="number"
                value={fundingNeeds.amount}
                onChange={(e) => setFundingNeeds({...fundingNeeds, amount: e.target.value})}
              />

              <Textarea
                placeholder="What will you use the funding for?"
                value={fundingNeeds.purpose}
                onChange={(e) => setFundingNeeds({...fundingNeeds, purpose: e.target.value})}
              />

              <Select value={fundingNeeds.timeline} onValueChange={(value) => 
                setFundingNeeds({...fundingNeeds, timeline: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="When do you need funding?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediately</SelectItem>
                  <SelectItem value="1-3months">1-3 months</SelectItem>
                  <SelectItem value="3-6months">3-6 months</SelectItem>
                  <SelectItem value="6months+">6+ months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleMatch} disabled={loading || viewOnly} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Matches...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                {viewOnly ? 'Subscribe to run matches' : 'Find Funding Matches'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Funding Matches</h2>
          {matches.map((match: FundingMatch, idx: number) => (
            <Card key={idx}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">{match.title}</h3>
                    <p className="text-gray-600">{match.provider}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {match.match_score}% Match
                  </Badge>
                </div>
                
                <p className="text-gray-700 mb-4">{match.description}</p>
                
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Up to ZMW {match.max_amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">{match.funding_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">{match.application_deadline}</span>
                  </div>
                </div>

                {match.reasoning && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">{match.reasoning}</p>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={viewOnly}
                  onClick={() => {
                    if (viewOnly) {
                      onRequestAccess?.();
                      return;
                    }
                  }}
                >
                  {viewOnly ? 'Subscribe to apply' : 'Apply Now'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};