import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OpportunityCard } from './OpportunityCard';
import { Search, Filter, Loader2, CalendarClock, BadgeDollarSign } from 'lucide-react';
import { InvestmentTips } from '@/components/InvestmentTips';
import { API_BASE } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export interface FundingOpportunity {
  id: string;
  title: string;
  funding_type: string;
  funder_name?: string | null;
  eligible_countries?: string[];
  target_sectors?: string[];
  eligible_applicants?: string[];
  funding_amount_min?: number | null;
  funding_amount_max?: number | null;
  currency?: string | null;
  deadline?: string | null;
  status: string;
  description?: string | null;
  source_url: string;
  tags?: string[];
  relevance_score?: number;
}

const defaultFilters = {
  query: '',
  funding_type: '',
  sector: '',
  applicant: '',
  deadline_days: '',
  sort: 'deadline',
};

const formatAmountRange = (opportunity: FundingOpportunity) => {
  const currency = opportunity.currency || 'USD';
  if (opportunity.funding_amount_min || opportunity.funding_amount_max) {
    const min = opportunity.funding_amount_min ? `${currency} ${opportunity.funding_amount_min}` : '—';
    const max = opportunity.funding_amount_max ? `${currency} ${opportunity.funding_amount_max}` : '—';
    return `${min} - ${max}`;
  }
  return 'Amount not specified';
};

export const FundingHub = ({ isAuthenticated = true, onAuthRequired }: { isAuthenticated?: boolean; onAuthRequired?: () => void }) => {
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedOpportunity = useMemo(
    () => opportunities.find(o => o.id === selectedId) || null,
    [selectedId, opportunities]
  );

  const fetchOpportunities = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pagination.pageSize));
      params.set('status', 'open,upcoming');
      if (filters.query) params.set('query', filters.query);
      if (filters.funding_type) params.set('funding_type', filters.funding_type);
      if (filters.sector) params.set('sector', filters.sector);
      if (filters.applicant) params.set('applicant', filters.applicant);
      if (filters.deadline_days) params.set('deadline_days', filters.deadline_days);
      if (filters.sort) params.set('sort', filters.sort);

      const res = await fetch(`${API_BASE}/api/funding/opportunities?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load opportunities');
      }
      const json = await res.json();
      setOpportunities(json.items || []);
      setPagination(json.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 });
    } catch (err: any) {
      console.error('Error fetching opportunities:', err);
      setError('We could not load funding opportunities right now.');
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.funding_type, filters.sector, filters.applicant, filters.deadline_days, filters.sort]);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'The application link was copied to your clipboard.' });
  };

  const tipFriendlyOpportunities = opportunities.map(opportunity => ({
    title: opportunity.title,
    category: opportunity.funding_type,
    amount: formatAmountRange(opportunity),
  }));

  const handleApply = (url: string) => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      toast({ title: 'Sign in to track your application', description: 'Public opportunities are viewable without login.' });
    }
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-bold">Funding Hub</h1>
        <p className="text-gray-600 max-w-3xl">
          Discover Zambia-eligible grants, equity, debt, and accelerator programmes. Filter by sector, applicant type, deadline window, or search by title and funder.
        </p>
        {!isAuthenticated && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            Browse openly, then sign in to bookmark or request support.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search title, funder, or tags"
                value={filters.query}
                onChange={e => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.funding_type} onValueChange={value => setFilters(prev => ({ ...prev, funding_type: value }))}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Funding type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All types</SelectItem>
                <SelectItem value="grant">Grant</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="debt">Debt</SelectItem>
                <SelectItem value="blended">Blended</SelectItem>
                <SelectItem value="accelerator">Accelerator</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.sort} onValueChange={value => setFilters(prev => ({ ...prev, sort: value }))}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline soonest</SelectItem>
                <SelectItem value="relevance">Relevance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select value={filters.sector} onValueChange={value => setFilters(prev => ({ ...prev, sector: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sectors</SelectItem>
                <SelectItem value="Agriculture">Agriculture</SelectItem>
                <SelectItem value="Climate">Climate</SelectItem>
                <SelectItem value="Health">Health</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.applicant} onValueChange={value => setFilters(prev => ({ ...prev, applicant: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Applicant type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All applicants</SelectItem>
                <SelectItem value="SME">SME</SelectItem>
                <SelectItem value="Startup">Startup</SelectItem>
                <SelectItem value="NGO">NGO / Non-profit</SelectItem>
                <SelectItem value="Investor">Investor / Fund</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.deadline_days} onValueChange={value => setFilters(prev => ({ ...prev, deadline_days: value }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Deadline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any date</SelectItem>
                <SelectItem value="7">Next 7 days</SelectItem>
                <SelectItem value="30">Next 30 days</SelectItem>
                <SelectItem value="90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={resetFilters} className="gap-2">
              <Filter className="h-4 w-4" />
              Reset filters
            </Button>
          </div>

          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-4 text-sm text-red-700">
                {error}
                <div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchOpportunities(pagination.page)}>
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <InvestmentTips opportunities={tipFriendlyOpportunities} />

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-gray-600">
                No active funding opportunities currently available for Zambia. Check back soon or contact support.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {opportunities.map(opportunity => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onApply={() => handleApply(opportunity.source_url)}
                  onDetails={setSelectedId}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
            <span>
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchOpportunities(Math.max(pagination.page - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchOpportunities(Math.min(pagination.page + 1, pagination.totalPages || 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-500" /> Opportunity details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              {selectedOpportunity ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedOpportunity.title}</p>
                      {selectedOpportunity.funder_name && (
                        <p className="text-xs text-slate-600">{selectedOpportunity.funder_name}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                      {selectedOpportunity.funding_type}
                    </Badge>
                  </div>
                  <p className="text-slate-600">{selectedOpportunity.description || 'No description provided.'}</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedOpportunity.target_sectors || []).map(sector => (
                      <Badge key={sector} variant="outline">
                        {sector}
                      </Badge>
                    ))}
                    {(selectedOpportunity.tags || []).map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-blue-600" />
                      <span>Deadline: {selectedOpportunity.deadline ? new Date(selectedOpportunity.deadline).toLocaleDateString() : 'Rolling'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeDollarSign className="h-4 w-4 text-emerald-600" />
                      <span>{formatAmountRange(selectedOpportunity)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild>
                      <a href={selectedOpportunity.source_url} target="_blank" rel="noreferrer">
                        Apply now
                      </a>
                    </Button>
                    <Button variant="outline" onClick={() => handleCopyLink(selectedOpportunity.source_url)}>
                      Copy link
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600">Select a funding card to view details and apply.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
