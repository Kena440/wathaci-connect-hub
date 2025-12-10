import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OpportunityCard } from './OpportunityCard';
import { supabaseClient } from '@/lib/supabaseClient';
import { Search, Filter, Sparkles } from 'lucide-react';
import { InvestmentTips } from '@/components/InvestmentTips';

interface FundingOpportunity {
  id: string;
  title: string;
  organization: string;
  amount: string;
  deadline: string;
  location: string;
  category: string;
  description: string;
  eligibility: string[];
  matchScore?: number;
}

export const FundingHub = () => {
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('funding-opportunities', {
        body: { action: 'fetch_opportunities' }
      });

      if (error) throw error;
      setOpportunities(data.opportunities || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      // Show empty state for launch - no mock data
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };
  const handleApply = async (opportunityId: string) => {
    // Implementation for application process
    console.log('Applying for opportunity:', opportunityId);
  };

  const handleGetHelp = async (opportunityId: string) => {
    // Implementation for getting professional help
    console.log('Getting help for opportunity:', opportunityId);
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opp.organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || opp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">AI-Powered Funding Opportunities</h1>
        <p className="text-gray-600 mb-6">
          Discover funding opportunities tailored to your business needs with AI matching and professional support.
        </p>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
              <SelectItem value="Business Growth">Business Growth</SelectItem>
              <SelectItem value="Innovation">Innovation</SelectItem>
              <SelectItem value="Export">Export</SelectItem>
              <SelectItem value="Women Entrepreneurs">Women Entrepreneurs</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      <InvestmentTips opportunities={opportunities} />

      {loading ? (
        <div className="text-center py-8">Loading opportunities...</div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
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
              opportunity={opportunity}
              onApply={handleApply}
              onGetHelp={handleGetHelp}
            />
          ))}
        </div>
      )}
    </div>
  );
};
