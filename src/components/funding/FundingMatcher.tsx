import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, TrendingUp, DollarSign, Clock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export const FundingMatcher = () => {
  const { user } = useAuth();
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
  const [saving, setSaving] = useState(false);

  const saveAssessment = async () => {
    if (!user) {
      toast.error('Please sign in to save your assessment');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('needs_assessments' as any).insert({
        user_id: user.id,
        assessment_type: 'funding',
        business_type: businessProfile.businessType,
        sector: businessProfile.sector,
        location: businessProfile.location,
        funding_amount: fundingNeeds.amount ? parseFloat(fundingNeeds.amount) : null,
        funding_purpose: fundingNeeds.purpose,
        funding_timeline: fundingNeeds.timeline,
        recommendations: matches,
        status: 'completed'
      } as any);

      if (error) throw error;
      toast.success('Assessment saved successfully!');
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      toast.error('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleMatch = async () => {
    if (!businessProfile.businessType || !fundingNeeds.amount) {
      toast.error('Please fill in business type and funding amount');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('funding-matcher', {
        body: { businessProfile, fundingNeeds }
      });

      if (error) throw error;
      setMatches(data.matches || []);
      
      // Auto-save if user is logged in
      if (user && data.matches?.length > 0) {
        await supabase.from('needs_assessments' as any).insert({
          user_id: user.id,
          assessment_type: 'funding',
          business_type: businessProfile.businessType,
          sector: businessProfile.sector,
          location: businessProfile.location,
          funding_amount: fundingNeeds.amount ? parseFloat(fundingNeeds.amount) : null,
          funding_purpose: fundingNeeds.purpose,
          funding_timeline: fundingNeeds.timeline,
          ai_analysis: data,
          recommendations: data.matches,
          status: 'completed'
        } as any);
      }
    } catch (error) {
      console.error('Error matching funding:', error);
      toast.error('Error finding matches. Please try again.');
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
                  <SelectItem value="mining">Mining</SelectItem>
                  <SelectItem value="tourism">Tourism</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Location (e.g., Lusaka, Copperbelt)"
                value={businessProfile.location}
                onChange={(e) => setBusinessProfile({...businessProfile, location: e.target.value})}
              />

              <Input
                placeholder="Number of Employees"
                type="number"
                value={businessProfile.employees}
                onChange={(e) => setBusinessProfile({...businessProfile, employees: e.target.value})}
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
                placeholder="What will you use the funding for? (e.g., equipment purchase, working capital, expansion)"
                value={fundingNeeds.purpose}
                onChange={(e) => setFundingNeeds({...fundingNeeds, purpose: e.target.value})}
                rows={3}
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

          <div className="flex gap-3">
            <Button onClick={handleMatch} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finding Matches...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Find Funding Matches
                </>
              )}
            </Button>
            {user && matches.length > 0 && (
              <Button variant="outline" onClick={saveAssessment} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
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
                    <p className="text-muted-foreground">{match.provider}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    {match.match_score}% Match
                  </Badge>
                </div>
                
                <p className="text-muted-foreground mb-4">{match.description}</p>
                
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
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">{match.reasoning}</p>
                  </div>
                )}

                <Button className="w-full">Apply Now</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
