import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OpportunityCard } from './OpportunityCard';
import { Search, Filter, Sparkles, Loader2 } from 'lucide-react';
import { InvestmentTips } from '@/components/InvestmentTips';
import { API_BASE } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

export interface FundingOpportunity {
  id: string;
  title: string;
  description: string;
  provider_name: string;
  provider_type?: string | null;
  country_focus?: string[];
  sectors?: string[];
  ticket_size_min?: number | null;
  ticket_size_max?: number | null;
  currency?: string | null;
  instrument_type?: string[];
  stage_focus?: string[];
  application_deadline?: string | null;
  link_to_apply?: string | null;
  contact_email?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  tags?: string[];
  updated_at?: string;
}

interface MatchResult {
  funding_id: string;
  score?: number;
  reason?: string;
  summary?: string;
}

const defaultFilters = {
  q: '',
  sector: '',
  stage: '',
  instrument: '',
  country: '',
  ticketMin: '',
  ticketMax: '',
};

export const FundingHub = ({
  isAuthenticated = true,
  onAuthRequired,
}: {
  isAuthenticated?: boolean;
  onAuthRequired?: () => void;
}) => {
  const { profile } = useAppContext();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<FundingOpportunity[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiMatches, setAiMatches] = useState<MatchResult[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Record<string, any> | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

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
      params.set('pageSize', String(pagination.pageSize));
      if (filters.q) params.set('q', filters.q);
      if (filters.sector) params.set('sector', filters.sector);
      if (filters.stage) params.set('stage', filters.stage);
      if (filters.instrument) params.set('instrument', filters.instrument);
      if (filters.country) params.set('country', filters.country);
      if (filters.ticketMin) params.set('ticketMin', filters.ticketMin);
      if (filters.ticketMax) params.set('ticketMax', filters.ticketMax);

      const res = await fetch(`${API_BASE}/api/funding/opportunities?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load opportunities');
      }
      const json = await res.json();
      setOpportunities(json.items || []);
      setPagination(json.pagination || { page: 1, pageSize: 12, total: 0, totalPages: 0 });
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
  }, [filters.q, filters.sector, filters.stage, filters.instrument, filters.country, filters.ticketMin, filters.ticketMax]);

  const handleApply = async (opportunityId: string) => {
    if (!isAuthenticated) {
      onAuthRequired?.();
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/funding/applications`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funding_id: opportunityId, notes: 'express interest' }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Unable to log application');
      }
      toast({ title: 'Interest recorded', description: 'We have captured your interest in this opportunity.' });
    } catch (err: any) {
      console.error('apply error', err);
      toast({ title: 'Unable to submit', description: 'Please try again or contact support.', variant: 'destructive' });
    }
  };

  const handleGetMatches = async () => {
    if (!isAuthenticated || !profile?.id) {
      setAiError('Please sign in to get personalised matches.');
      onAuthRequired?.();
      return;
    }
    try {
      setAiLoading(true);
      setAiError(null);
      const res = await fetch(`${API_BASE}/api/funding/match`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smeId: profile.id, topN: 6 }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Unable to generate matches');
      }
      const json = await res.json();
      setAiMatches(json.matches || []);
    } catch (err: any) {
      console.error('ai match error', err);
      setAiError('We could not generate AI recommendations right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleEligibility = async (fundingId: string) => {
    if (!isAuthenticated || !profile?.id) {
      onAuthRequired?.();
      return;
    }
    try {
      setEligibilityLoading(true);
      const res = await fetch(`${API_BASE}/api/funding/eligibility-explain`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smeId: profile.id, fundingId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Unable to fetch guidance');
      }
      const json = await res.json();
      setEligibility(json);
    } catch (err: any) {
      console.error('eligibility error', err);
      setEligibility(null);
      toast({ title: 'AI guidance unavailable', description: 'Please try again later.' });
    } finally {
      setEligibilityLoading(false);
    }
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-bold">Funding Hub</h1>
        <p className="text-gray-600 max-w-3xl">
          Discover grants, investors, loans, and technical assistance curated for Zambian SMEs. Use filters or let our AI match you to the best-fit opportunities.
        </p>
        {!isAuthenticated && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
            Browse openly, then sign in to apply or request AI recommendations.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search title, provider, or tags"
                value={filters.q}
                onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.sector} onValueChange={(value) => setFilters(prev => ({ ...prev, sector: value }))}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All sectors</SelectItem>
                <SelectItem value="Agriculture">Agriculture</SelectItem>
                <SelectItem value="GreenTech">GreenTech</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Services">Services</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.stage} onValueChange={(value) => setFilters(prev => ({ ...prev, stage: value }))}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any stage</SelectItem>
                <SelectItem value="Startup">Startup</SelectItem>
                <SelectItem value="Growth">Growth</SelectItem>
                <SelectItem value="Scale">Scale</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.instrument} onValueChange={(value) => setFilters(prev => ({ ...prev, instrument: value }))}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Instrument" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any instrument</SelectItem>
                <SelectItem value="Grant">Grant</SelectItem>
                <SelectItem value="Equity">Equity</SelectItem>
                <SelectItem value="Debt">Debt</SelectItem>
                <SelectItem value="TA">Technical Assistance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              type="number"
              placeholder="Min ticket (USD)"
              value={filters.ticketMin}
              onChange={(e) => setFilters(prev => ({ ...prev, ticketMin: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Max ticket (USD)"
              value={filters.ticketMax}
              onChange={(e) => setFilters(prev => ({ ...prev, ticketMax: e.target.value }))}
            />
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

          <InvestmentTips opportunities={opportunities} />

          {loading ? (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600">
                No funding opportunities match your filters right now. Try adjusting your criteria or check back later.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onApply={handleApply}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" /> AI-Recommended Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-gray-600">
                Logged-in SMEs can request personalised funding matches using their profile data.
              </p>
              <Button onClick={handleGetMatches} disabled={aiLoading} className="w-full">
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get AI-Recommended Matches'}
              </Button>
              {aiError && <p className="text-red-600 text-sm">{aiError}</p>}
              {aiMatches.length > 0 && (
                <div className="space-y-3">
                  {aiMatches.map((match) => {
                    const opp = opportunities.find(o => o.id === match.funding_id);
                    return (
                      <div key={match.funding_id} className="rounded-md border border-slate-200 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-slate-900">{opp?.title || 'Funding Opportunity'}</div>
                          {typeof match.score === 'number' && (
                            <Badge className="bg-emerald-100 text-emerald-800">{Math.round(match.score)}%</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{match.reason || 'Recommended match'}</p>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setSelectedId(match.funding_id)}>
                            View opportunity
                          </Button>
                          <Button size="sm" onClick={() => handleApply(match.funding_id)}>Express interest</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedOpportunity && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>{selectedOpportunity.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-700">
                <p className="text-slate-600">{selectedOpportunity.description}</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedOpportunity.stage_focus || []).map(stage => (
                    <Badge key={stage} variant="outline">{stage}</Badge>
                  ))}
                  {(selectedOpportunity.tags || []).map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  {selectedOpportunity.link_to_apply && (
                    <Button asChild variant="secondary">
                      <a href={selectedOpportunity.link_to_apply} target="_blank" rel="noreferrer">Apply externally</a>
                    </Button>
                  )}
                  <Button onClick={() => handleApply(selectedOpportunity.id)}>Express interest</Button>
                  <Button variant="outline" onClick={() => handleEligibility(selectedOpportunity.id)} disabled={eligibilityLoading}>
                    {eligibilityLoading ? 'Checking eligibility…' : 'Check eligibility'}
                  </Button>
                </div>
                {eligibility && (
                  <div className="rounded-md bg-slate-50 p-3 space-y-1">
                    {eligibility.summary && <p className="font-medium text-slate-900">{eligibility.summary}</p>}
                    {eligibility.why_qualified && <p>Why you qualify: {eligibility.why_qualified}</p>}
                    {eligibility.blockers && <p>Blockers: {eligibility.blockers}</p>}
                    {eligibility.next_steps && <p>Next steps: {eligibility.next_steps}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
