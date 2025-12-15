import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import SeoMeta from '@/components/SeoMeta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createPartnershipInterest,
  fetchPartnershipOpportunities,
  fetchPartnershipOpportunity,
  generateIntroEmail,
  PartnershipOpportunity,
  requestPartnershipMatches,
} from '@/lib/api/partnerships';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { ExternalLink, HandCoins, Handshake, Loader2, MapPin, Sparkles, Target, Users } from 'lucide-react';
import { format } from 'date-fns';

const sectors = ['Agriculture', 'FinTech', 'Manufacturing', 'Health', 'Creative Industries', 'Climate', 'Tourism'];
const partnershipTypes = ['Distribution', 'Pilot project', 'Supplier linkage', 'Co-branding', 'Technical partnership', 'TA'];
const beneficiaries = ['SMEs', 'Women-led businesses', 'Youth-led businesses', 'Startups'];
const countries = ['Zambia', 'Regional', 'Southern Africa', 'Remote'];

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, 'dd MMM yyyy');
};

export const PartnershipHub = () => {
  const { profile, user } = useAppContext();
  const { toast } = useToast();
  const isAuthenticated = Boolean(user);

  const [filters, setFilters] = useState({
    q: '',
    sector: '',
    partnershipType: '',
    country: '',
    beneficiary: '',
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<PartnershipOpportunity[]>([]);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedOpportunity, setSelectedOpportunity] = useState<PartnershipOpportunity | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [interestNote, setInterestNote] = useState('');
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [introDraft, setIntroDraft] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);

  const [matchLoading, setMatchLoading] = useState(false);
  const [matches, setMatches] = useState<{ opportunity_id: string; score: number; reason?: string }[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);

  const sectorOptions = useMemo(() => sectors, []);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchPartnershipOpportunities({
        page,
        pageSize: 12,
        q: filters.q || undefined,
        sector: filters.sector || undefined,
        country: filters.country || undefined,
        partnershipType: filters.partnershipType || undefined,
        beneficiary: filters.beneficiary || undefined,
      });
      setOpportunities(response.items);
      setTotalPages(response.pagination.totalPages);
    } catch (err) {
      console.error('[PartnershipHub] failed to load opportunities', err);
      setError('We could not load partnership opportunities right now. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      loadOpportunities();
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleViewDetails = async (id: string) => {
    try {
      setDetailLoading(true);
      const data = await fetchPartnershipOpportunity(id);
      setSelectedOpportunity(data);
      setIntroDraft('');
      setInterestNote('');
    } catch (err) {
      console.error('[PartnershipHub] failed to load detail', err);
      toast({
        title: 'Could not open details',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInterest = async () => {
    if (!selectedOpportunity) return;
    if (!isAuthenticated || !profile?.id) {
      toast({
        title: 'Sign in to express interest',
        description: 'Create an account or sign in to contact partners.',
      });
      return;
    }
    try {
      setSubmittingInterest(true);
      await createPartnershipInterest(selectedOpportunity.id, interestNote || undefined, 'sme');
      toast({
        title: 'Interest submitted',
        description: 'Your interest has been recorded. We will notify the partner.',
      });
      setInterestNote('');
    } catch (err) {
      console.error('[PartnershipHub] interest error', err);
      toast({
        title: 'Could not record your interest',
        description: 'Please try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingInterest(false);
    }
  };

  const handleGenerateIntro = async () => {
    if (!selectedOpportunity) return;
    setDraftLoading(true);
    setIntroDraft('');
    try {
      const brief = `Profile sector: ${profile?.industry_sector || 'unknown'}; focus: ${profile?.partnership_preferences || ''}`;
      const summary = `${selectedOpportunity.title} by ${selectedOpportunity.partner_org_name}. ${selectedOpportunity.description}`;
      const response = await generateIntroEmail(brief, summary);
      setIntroDraft(response.draft);
    } catch (err) {
      console.error('[PartnershipHub] intro email error', err);
      toast({
        title: 'AI draft unavailable',
        description: 'We could not generate a draft message right now.',
        variant: 'destructive',
      });
    } finally {
      setDraftLoading(false);
    }
  };

  const requestMatches = async () => {
    if (!isAuthenticated || !profile?.id) {
      setMatchError('Log in to request AI-powered matches.');
      toast({ title: 'Sign in required', description: 'Please sign in to receive AI recommendations.' });
      return;
    }
    try {
      setMatchLoading(true);
      setMatchError(null);
      const response = await requestPartnershipMatches(profile.id, 6);
      setMatches(response.matches || []);
      if ((response.matches || []).length === 0) {
        setMatchError('No AI matches found yet. Try adjusting your profile details.');
      }
    } catch (err) {
      console.error('[PartnershipHub] match error', err);
      setMatchError('We could not generate AI recommendations right now. Browse the opportunities below.');
    } finally {
      setMatchLoading(false);
    }
  };

  const filteredMatches = useMemo(() => {
    if (!matches.length) return [];
    const byId = new Map(matches.map(match => [match.opportunity_id, match]));
    return opportunities
      .map(opp => ({ opp, match: byId.get(opp.id) }))
      .filter(item => Boolean(item.match))
      .sort((a, b) => (b.match?.score || 0) - (a.match?.score || 0));
  }, [matches, opportunities]);

  return (
    <AppLayout>
      <SeoMeta
        title="Partnership Hub | Wathaci Connect"
        description="Discover partnership opportunities, co-funding partners, and AI-matched collaborators across Zambia and the region."
        canonicalPath="/partnership-hub"
      />
      <div className="bg-gradient-to-br from-orange-50 via-white to-green-50 min-h-screen">
        <section className="relative overflow-hidden border-b border-orange-100 bg-white/70">
          <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    Partnership marketplace
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">
                    AI matching live
                  </Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Partnership Hub</h1>
                <p className="text-lg text-gray-700 max-w-3xl">
                  Connect SMEs, corporates, donors, and ecosystem partners through structured collaboration. Publish and explore
                  co-implementation opportunities, supplier linkages, pilots, and technical partnerships.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Handshake className="w-4 h-4 text-orange-600" />
                  Marketplace for collaborations
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  AI matching and fit explanations
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Users className="w-4 h-4 text-gray-600" />
                  SMEs · Partners · Donors
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="md:col-span-2 border-orange-200 bg-white/80">
                <CardHeader className="pb-3">
                  <CardTitle>Find the right partners</CardTitle>
                  <CardDescription>Filter by sector, partnership model, geography, and beneficiary focus.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="q">Search</Label>
                      <Input
                        id="q"
                        placeholder="Search by title, organization, or tags"
                        value={filters.q}
                        onChange={e => setFilters(prev => ({ ...prev, q: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sector">Sector</Label>
                      <select
                        id="sector"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={filters.sector}
                        onChange={e => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                      >
                        <option value="">All sectors</option>
                        {sectorOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partnershipType">Partnership type</Label>
                      <select
                        id="partnershipType"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={filters.partnershipType}
                        onChange={e => setFilters(prev => ({ ...prev, partnershipType: e.target.value }))}
                      >
                        <option value="">Any type</option>
                        {partnershipTypes.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country/Region</Label>
                      <select
                        id="country"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={filters.country}
                        onChange={e => setFilters(prev => ({ ...prev, country: e.target.value }))}
                      >
                        <option value="">All</option>
                        {countries.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="beneficiary">Beneficiary focus</Label>
                      <select
                        id="beneficiary"
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        value={filters.beneficiary}
                        onChange={e => setFilters(prev => ({ ...prev, beneficiary: e.target.value }))}
                      >
                        <option value="">Any</option>
                        {beneficiaries.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Button variant="default" onClick={() => loadOpportunities()} disabled={loading}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Apply filters
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ q: '', sector: '', partnershipType: '', country: '', beneficiary: '' });
                        setPage(1);
                      }}
                      disabled={loading}
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-800">
                    <Target className="w-4 h-4" /> AI matches
                  </CardTitle>
                  <CardDescription>Let AI shortlist opportunities based on your profile.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isAuthenticated ? (
                    <Button className="w-full" onClick={requestMatches} disabled={matchLoading}>
                      {matchLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Get AI-Recommended Matches
                    </Button>
                  ) : (
                    <div className="space-y-3 text-sm text-gray-700">
                      <p>Log in or create a profile to receive AI-powered partnership suggestions.</p>
                      <Button className="w-full" variant="outline">
                        Sign in to activate AI matching
                      </Button>
                    </div>
                  )}
                  {matchError && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-2">{matchError}</p>}
                  {filteredMatches.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-800">Top matches</h4>
                      <div className="space-y-2">
                        {filteredMatches.map(({ opp, match }) => (
                          <div key={opp.id} className="rounded-md border border-emerald-100 bg-white/70 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{opp.title}</p>
                                <p className="text-xs text-gray-600">{opp.partner_org_name}</p>
                              </div>
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                                {Math.round(match?.score || 0)}%
                              </Badge>
                            </div>
                            {match?.reason && <p className="text-xs text-gray-700 mt-2">{match.reason}</p>}
                            <Button variant="link" className="px-0 text-sm" onClick={() => handleViewDetails(opp.id)}>
                              View details
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-12">
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="flex flex-wrap gap-2 bg-white">
              <TabsTrigger value="list">Opportunities</TabsTrigger>
              <TabsTrigger value="flows">How it works</TabsTrigger>
              <TabsTrigger value="faq">FAQs</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              )}
              {!error && loading && (
                <div className="grid md:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <Card key={idx} className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </Card>
                  ))}
                </div>
              )}
              {!loading && !error && opportunities.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-gray-700">
                    No partnership opportunities match your filters. Try adjusting your criteria or check back later.
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                {opportunities.map(opportunity => (
                  <Card key={opportunity.id} className="flex flex-col justify-between border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-gray-900">{opportunity.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 text-sm text-gray-700">
                        <Users className="w-4 h-4" /> {opportunity.partner_org_name}
                      </CardDescription>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {(opportunity.partnership_type || []).slice(0, 3).map(type => (
                          <Badge key={type} variant="secondary" className="bg-orange-100 text-orange-800">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin className="w-3 h-3" />
                        {(opportunity.country_focus || []).join(', ') || 'Regional'}
                      </div>
                      <p className="line-clamp-3">{opportunity.description}</p>
                      {opportunity.expected_value_for_sme && (
                        <p className="text-xs text-gray-600">
                          Value for SMEs: <span className="font-medium text-gray-800">{opportunity.expected_value_for_sme}</span>
                        </p>
                      )}
                    </CardContent>
                    <div className="flex items-center justify-between p-4 pt-0">
                      <Button variant="outline" onClick={() => handleViewDetails(opportunity.id)}>
                        View details
                      </Button>
                      <Button onClick={() => handleViewDetails(opportunity.id)} variant="default">
                        Express interest
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4">
                  <Button variant="outline" disabled={page === 1} onClick={() => setPage(prev => Math.max(prev - 1, 1))}>
                    Previous
                  </Button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="flows" className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">1. Browse or request AI matches</CardTitle>
                    <CardDescription>Use filters or AI to shortlist the best-fit opportunities.</CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">2. Express interest</CardTitle>
                    <CardDescription>
                      Share context with partners. We log structured interests for follow-up and keep owners notified.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">3. Follow-up</CardTitle>
                    <CardDescription>
                      Collaborate on pilots, supplier linkages, or co-funding with clear expectations and eligibility notes.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="faq">
              <Card>
                <CardHeader>
                  <CardTitle>Common questions</CardTitle>
                  <CardDescription>How the Partnership Hub works for SMEs, partners, and donors.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-gray-700">
                  <div>
                    <p className="font-semibold text-gray-900">Who can post opportunities?</p>
                    <p>Verified partners, corporates, and ecosystem organizations can publish opportunities through their profile.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">What data is shared with AI?</p>
                    <p>Only anonymised business attributes (sector, location, stage) are used. No personal emails or phone numbers are sent.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Can donors use this?</p>
                    <p>Yes. Donors and investors can use the hub to identify implementing partners or co-applicants for funding calls.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <Dialog open={Boolean(selectedOpportunity)} onOpenChange={value => !value && setSelectedOpportunity(null)}>
        <DialogContent className="max-w-3xl">
          {detailLoading && (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            </div>
          )}
          {!detailLoading && selectedOpportunity && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedOpportunity.title}</DialogTitle>
                <DialogDescription>{selectedOpportunity.partner_org_name}</DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2">
                {(selectedOpportunity.partnership_type || []).map(type => (
                  <Badge key={type} variant="secondary" className="bg-orange-100 text-orange-800">
                    {type}
                  </Badge>
                ))}
                {(selectedOpportunity.sectors || []).map(sector => (
                  <Badge key={sector} variant="outline">
                    {sector}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-line">{selectedOpportunity.description}</p>
              {selectedOpportunity.requirements_summary && (
                <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-800">
                  <strong>Requirements: </strong>
                  {selectedOpportunity.requirements_summary}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
                {selectedOpportunity.expected_value_for_sme && (
                  <div className="rounded-md border border-green-100 bg-green-50 p-3">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <HandCoins className="w-4 h-4" /> Value for SMEs
                    </p>
                    <p>{selectedOpportunity.expected_value_for_sme}</p>
                  </div>
                )}
                {selectedOpportunity.expected_value_for_partner && (
                  <div className="rounded-md border border-orange-100 bg-orange-50 p-3">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <Handshake className="w-4 h-4" /> Value for partners
                    </p>
                    <p>{selectedOpportunity.expected_value_for_partner}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                {selectedOpportunity.country_focus?.length ? (
                  <span>Country focus: {(selectedOpportunity.country_focus || []).join(', ')}</span>
                ) : null}
                {selectedOpportunity.target_beneficiaries?.length ? (
                  <span>Beneficiaries: {(selectedOpportunity.target_beneficiaries || []).join(', ')}</span>
                ) : null}
                {selectedOpportunity.start_date && <span>Starts: {formatDate(selectedOpportunity.start_date)}</span>}
                {selectedOpportunity.end_date && <span>Ends: {formatDate(selectedOpportunity.end_date)}</span>}
                {selectedOpportunity.is_ongoing ? <span className="text-emerald-700">Ongoing</span> : null}
              </div>

              {selectedOpportunity.link_to_more_info && (
                <Button asChild variant="outline" className="gap-2 w-fit">
                  <a href={selectedOpportunity.link_to_more_info} target="_blank" rel="noreferrer">
                    View more info <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Express interest</h4>
                  {!isAuthenticated && <Badge variant="secondary">Sign in required to submit</Badge>}
                </div>
                <Textarea
                  placeholder="Tell the partner why you are interested"
                  value={interestNote}
                  onChange={e => setInterestNote(e.target.value)}
                  disabled={!isAuthenticated}
                />
                <Button onClick={handleInterest} disabled={submittingInterest || !isAuthenticated}>
                  {submittingInterest && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Submit interest
                </Button>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-semibold text-gray-900">AI intro email</h4>
                </div>
                <p className="text-sm text-gray-700">
                  Generate a draft introduction you can edit before contacting the partner. We never send messages automatically.
                </p>
                <div className="flex items-center gap-2">
                  <Button onClick={handleGenerateIntro} disabled={draftLoading}>
                    {draftLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Generate draft
                  </Button>
                  {introDraft && <Badge variant="secondary">Editable draft ready</Badge>}
                </div>
                {introDraft && <Textarea value={introDraft} onChange={e => setIntroDraft(e.target.value)} rows={5} />}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};
