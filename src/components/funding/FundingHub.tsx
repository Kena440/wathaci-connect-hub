import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { OpportunityCard } from './OpportunityCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Sparkles, Loader2 } from 'lucide-react';

interface FundingOpportunity {
  id: string;
  title: string;
  organization: string;
  amount_display: string | null;
  amount_min: number | null;
  amount_max: number | null;
  deadline: string | null;
  location: string | null;
  category: string;
  description: string | null;
  eligibility_criteria: string[] | null;
  sectors: string[] | null;
  funding_type: string | null;
  application_url: string | null;
  is_featured: boolean | null;
}

export const FundingHub = () => {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [applyingTo, setApplyingTo] = useState<FundingOpportunity | null>(null);
  const [applicationData, setApplicationData] = useState({
    businessName: '',
    businessDescription: '',
    fundingPurpose: '',
    fundingAmount: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('funding_opportunities')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('deadline', { ascending: true });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (opportunityId: string) => {
    const opportunity = opportunities.find(o => o.id === opportunityId);
    if (opportunity) {
      setApplyingTo(opportunity);
    }
  };

  const submitApplication = async () => {
    if (!applyingTo) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to apply for funding opportunities.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('funding_applications')
        .insert({
          opportunity_id: applyingTo.id,
          user_id: user.id,
          business_name: applicationData.businessName,
          business_description: applicationData.businessDescription,
          funding_purpose: applicationData.fundingPurpose,
          funding_amount_requested: parseFloat(applicationData.fundingAmount) || null,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Application Submitted",
        description: "Your funding application has been submitted successfully!",
      });
      
      setApplyingTo(null);
      setApplicationData({
        businessName: '',
        businessDescription: '',
        fundingPurpose: '',
        fundingAmount: ''
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGetHelp = async (opportunityId: string) => {
    toast({
      title: "Finding Professionals",
      description: "We're matching you with funding experts who can help with your application.",
    });
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (opp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = categoryFilter === 'all' || opp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(opportunities.map(o => o.category))];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">AI-Powered Funding Opportunities</h1>
        <p className="text-muted-foreground mb-6">
          Discover funding opportunities tailored to your business needs with AI matching and professional support.
        </p>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchOpportunities}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mr-2" />
          <span>Loading opportunities...</span>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Sparkles className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Funding Opportunities Available</h3>
            <p>Check back soon for new funding opportunities or try adjusting your search filters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={{
                id: opportunity.id,
                title: opportunity.title,
                organization: opportunity.organization,
                amount: opportunity.amount_display || `${opportunity.amount_min?.toLocaleString()} - ${opportunity.amount_max?.toLocaleString()}`,
                deadline: opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : 'Open',
                location: opportunity.location || 'Zambia',
                category: opportunity.category,
                description: opportunity.description || '',
                eligibility: opportunity.eligibility_criteria || [],
                matchScore: opportunity.is_featured ? 95 : undefined
              }}
              onApply={handleApply}
              onGetHelp={handleGetHelp}
            />
          ))}
        </div>
      )}

      {/* Application Dialog */}
      <Dialog open={!!applyingTo} onOpenChange={() => setApplyingTo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for: {applyingTo?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={applicationData.businessName}
                onChange={(e) => setApplicationData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="Your business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessDescription">Business Description *</Label>
              <Textarea
                id="businessDescription"
                value={applicationData.businessDescription}
                onChange={(e) => setApplicationData(prev => ({ ...prev, businessDescription: e.target.value }))}
                placeholder="Describe your business..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundingPurpose">Funding Purpose *</Label>
              <Textarea
                id="fundingPurpose"
                value={applicationData.fundingPurpose}
                onChange={(e) => setApplicationData(prev => ({ ...prev, fundingPurpose: e.target.value }))}
                placeholder="What will you use the funding for?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fundingAmount">Requested Amount (ZMW)</Label>
              <Input
                id="fundingAmount"
                type="number"
                value={applicationData.fundingAmount}
                onChange={(e) => setApplicationData(prev => ({ ...prev, fundingAmount: e.target.value }))}
                placeholder="Amount requested"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={submitApplication}
                disabled={submitting || !applicationData.businessName || !applicationData.businessDescription || !applicationData.fundingPurpose}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
              <Button variant="outline" onClick={() => setApplyingTo(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
