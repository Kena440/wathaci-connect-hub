import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, Users, DollarSign, Handshake } from 'lucide-react';
import { supabase } from '@/lib/supabase-enhanced';

interface IndustryMatch {
  freelancers: string[];
  funding: string[];
  partnerships: string[];
}

interface MatchResult {
  matches: IndustryMatch;
  recommendations: {
    priority: string;
    nextSteps: string;
    timeline: string;
  };
}

const IndustryMatcher = () => {
  const [industry, setIndustry] = useState('');
  const [userType, setUserType] = useState('');
  const [location, setLocation] = useState('');
  const [matches, setMatches] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const industries = [
    'Agriculture', 'Technology', 'Manufacturing', 'Healthcare', 
    'Education', 'Tourism', 'Mining', 'Construction', 'Finance'
  ];

  const userTypes = [
    'Entrepreneur', 'Investor', 'Freelancer', 'Partnership Seeker'
  ];

  const handleMatch = async () => {
    if (!industry || !userType) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('industry-matcher', {
        body: { industry, userType, location, requirements: '' }
      });

      if (error) throw error;
      setMatches(data);
    } catch (error) {
      console.error('Error getting industry matches:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Industry-Specific Matcher
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select Industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userType} onValueChange={setUserType}>
              <SelectTrigger>
                <SelectValue placeholder="User Type" />
              </SelectTrigger>
              <SelectContent>
                {userTypes.map((type) => (
                  <SelectItem key={type} value={type.toLowerCase()}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleMatch} disabled={loading || !industry || !userType}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find Matches'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {matches && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Freelancers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {matches.matches.freelancers.map((freelancer, index) => (
                  <Badge key={index} variant="secondary" className="block w-fit">
                    {freelancer}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Funding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {matches.matches.funding.map((fund, index) => (
                  <Badge key={index} variant="outline" className="block w-fit">
                    {fund}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="w-5 h-5" />
                Partnerships
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {matches.matches.partnerships.map((partner, index) => (
                  <Badge key={index} variant="default" className="block w-fit">
                    {partner}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export { IndustryMatcher };
export default IndustryMatcher;