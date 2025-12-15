import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/contexts/AppContext';
import { supabaseClient } from '@/lib/wathaciSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Sparkles, ClipboardList, ShieldCheck, Check, Search } from 'lucide-react';

interface ProfessionalService {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price_type?: string;
  price_amount?: number | null;
  currency?: string | null;
  delivery_mode?: string[];
  is_active?: boolean;
}

interface ProfessionalProfile {
  id: string;
  display_name: string;
  headline?: string;
  bio?: string;
  location_city?: string;
  location_country?: string;
  years_experience?: number;
  service_categories?: string[];
  skills?: string[];
  industries?: string[];
  rate_type?: string;
  rate_min?: number | null;
  rate_max?: number | null;
  currency?: string | null;
  availability_status?: string;
  verification_status?: string;
  profile_photo_url?: string;
  services?: ProfessionalService[];
}

interface AiMatchResult {
  professional_id: string;
  score: number;
  reason?: string;
}

interface RequestPayload {
  title: string;
  description: string;
  category?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  preferred_delivery_mode?: string[];
  location_city?: string;
  deadline?: string;
}

const availabilityCopy: Record<string, string> = {
  available: 'Available now',
  limited: 'Limited slots',
  unavailable: 'Unavailable',
};

const categories = [
  'Advisory',
  'Tax',
  'Legal',
  'Finance',
  'Technology',
  'Compliance',
  'Marketing',
  'Operations',
];

const availabilityOptions = ['available', 'limited', 'unavailable'];

const AvailabilityBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const style =
    status === 'available'
      ? 'bg-green-100 text-green-800'
      : status === 'limited'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-700';
  return (
    <Badge className={style} variant="secondary">
      {availabilityCopy[status] || status}
    </Badge>
  );
};

const RequestModal = ({
  open,
  onClose,
  target,
  authToken,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  target?: ProfessionalProfile | null;
  authToken: string | null;
  onCompleted: (requestId: string) => void;
}) => {
  const { toast } = useToast();
  const [form, setForm] = useState<RequestPayload>({
    title: '',
    description: '',
    category: target?.service_categories?.[0] ?? '',
    budget_min: undefined,
    budget_max: undefined,
    preferred_delivery_mode: [],
    location_city: target?.location_city ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      category: target?.service_categories?.[0] ?? prev.category,
      location_city: target?.location_city ?? prev.location_city,
    }));
  }, [target]);

  const updateField = (key: keyof RequestPayload, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!authToken) {
      toast({ title: 'Sign in required', description: 'Please sign in to submit a request.' });
      return;
    }
    if (!form.title || !form.description) {
      toast({ title: 'Missing fields', description: 'Add a title and description for your request.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Unable to submit request');

      if (target) {
        await fetch(`/api/requests/${json.request.id}/invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ professional_id: target.id }),
        });
      }

      toast({ title: 'Request sent', description: 'Your support request was created and invitations were sent.' });
      onCompleted(json.request.id);
      onClose();
      setForm({
        title: '',
        description: '',
        category: target?.service_categories?.[0] ?? '',
        budget_min: undefined,
        budget_max: undefined,
        preferred_delivery_mode: [],
        location_city: target?.location_city ?? '',
        deadline: undefined,
      });
    } catch (error: any) {
      toast({ title: 'Unable to send request', description: error.message ?? 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!form.description) {
      toast({ title: 'Add a description', description: 'Describe your needs so AI can refine it.' });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/ai/improve-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: form.description }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'AI unavailable');
      setAiSuggestion(json.improved);
    } catch (error: any) {
      toast({ title: 'AI unavailable', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={openState => !openState && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Request support{target ? ` from ${target.display_name}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={e => updateField('title', e.target.value)}
              placeholder="E.g. Compliance review for PACRA filing"
            />
          </div>
          <div>
            <Label htmlFor="description">What do you need?</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Describe your business need, goals, and any deadlines."
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category || ''} onValueChange={val => updateField('category', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Location</Label>
              <Input
                value={form.location_city || ''}
                onChange={e => updateField('location_city', e.target.value)}
                placeholder="City"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Budget min (optional)</Label>
              <Input
                type="number"
                value={form.budget_min ?? ''}
                onChange={e => updateField('budget_min', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <Label>Budget max (optional)</Label>
              <Input
                type="number"
                value={form.budget_max ?? ''}
                onChange={e => updateField('budget_max', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleImprove} disabled={loading} className="gap-2">
              <Sparkles className="w-4 h-4" /> Improve brief with AI
            </Button>
            {aiSuggestion?.scope && <Badge variant="secondary">AI suggestion ready</Badge>}
          </div>
          {aiSuggestion && (
            <div className="rounded-lg border bg-slate-50 p-3 space-y-2 text-sm">
              <div className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Suggested scope
              </div>
              <p>{aiSuggestion.scope}</p>
              {Array.isArray(aiSuggestion.clarifying_questions) && aiSuggestion.clarifying_questions.length > 0 && (
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  {aiSuggestion.clarifying_questions.map((q: string) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              <ClipboardList className="w-4 h-4" /> Submit request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FreelancerDirectory = () => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfessionalProfile[]>([]);
  const [selected, setSelected] = useState<ProfessionalProfile | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    delivery: '',
    availability: '',
    search: '',
  });
  const [requestTarget, setRequestTarget] = useState<ProfessionalProfile | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [aiMatches, setAiMatches] = useState<AiMatchResult[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    void supabaseClient.auth.getSession().then(({ data }) => setToken(data.session?.access_token || null));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(prev => ({
      ...prev,
      category: params.get('category') || prev.category,
      city: params.get('city') || prev.city,
    }));
  }, []);

  useEffect(() => {
    void fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.city, filters.availability, filters.search]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.city) params.set('city', filters.city);
      if (filters.availability) params.set('availability', filters.availability);
      if (filters.search) params.set('q', filters.search);

      const response = await fetch(`/api/freelancers?${params.toString()}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Unable to load freelancers');
      setProfiles(json.items || []);
    } catch (error: any) {
      toast({ title: 'Unable to load freelancers', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (profile: ProfessionalProfile) => {
    setSelected(profile);
    if (profile.services?.length) return;
    try {
      const response = await fetch(`/api/freelancers/${profile.id}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Unable to load profile');
      setSelected(json);
    } catch (error: any) {
      toast({ title: 'Unable to load profile', description: error.message });
    }
  };

  const handleSave = async (professional: ProfessionalProfile) => {
    if (!token) {
      toast({ title: 'Sign in to save', description: 'Create an account to save professionals.' });
      return;
    }
    try {
      const response = await fetch('/api/saved-professionals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ professional_id: professional.id, save: true }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'Unable to save');
      toast({ title: 'Saved', description: `${professional.display_name} was saved to your list.` });
    } catch (error: any) {
      toast({ title: 'Unable to save professional', description: error.message });
    }
  };

  const handleRequest = (professional: ProfessionalProfile) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Sign in to send a request or invitation.' });
      return;
    }
    setRequestTarget(professional);
    setRequestOpen(true);
  };

  const handleInviteOnly = async (professional: ProfessionalProfile) => {
    if (!token) {
      toast({ title: 'Sign in required', description: 'Sign in to invite a professional.' });
      return;
    }
    setRequestTarget(professional);
    setRequestOpen(true);
  };

  const visibleProfiles = useMemo(() => profiles, [profiles]);

  const runAiMatches = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/match-freelancers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: {
            category: filters.category,
            description: filters.search || 'Find best-fit professionals',
            location_city: filters.city,
          },
          filters: { category: filters.category, city: filters.city },
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || 'AI unavailable');
      setAiMatches(json.matches || []);
    } catch (error: any) {
      toast({ title: 'AI recommendations unavailable', description: error.message });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-orange-600 uppercase">Search</p>
            <h2 className="text-2xl font-bold text-slate-900">Find vetted professionals</h2>
            <p className="text-slate-600">Filter by service category, location, and availability.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={runAiMatches} disabled={aiLoading} className="gap-2">
              <Sparkles className="w-4 h-4" /> {aiLoading ? 'Getting recommendations...' : 'AI recommendations'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 flex items-center gap-2 rounded-lg border px-3">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name, skill, or keyword"
              className="border-0 shadow-none"
            />
          </div>
          <Select value={filters.category} onValueChange={val => setFilters(prev => ({ ...prev, category: val }))}>
            <SelectTrigger>
              <SelectValue placeholder="Service category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="City (e.g. Lusaka)"
            value={filters.city}
            onChange={e => setFilters(prev => ({ ...prev, city: e.target.value }))}
          />
          <Select
            value={filters.availability}
            onValueChange={val => setFilters(prev => ({ ...prev, availability: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any availability</SelectItem>
              {availabilityOptions.map(option => (
                <SelectItem key={option} value={option}>
                  {availabilityCopy[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {aiMatches.length > 0 && (
        <div className="rounded-xl border bg-indigo-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-indigo-800 font-semibold">
            <Sparkles className="w-4 h-4" /> AI recommended professionals
          </div>
          <div className="flex flex-wrap gap-3">
            {aiMatches.map(match => {
              const professional = profiles.find(p => p.id === match.professional_id);
              if (!professional) return null;
              return (
                <Badge key={match.professional_id} variant="secondary" className="bg-white text-indigo-800 border-indigo-200">
                  {professional.display_name} — {match.score}% match
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Card key={idx} className="p-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-2" />
              <Skeleton className="h-20 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : visibleProfiles.length === 0 ? (
        <Card className="p-6 text-center">
          <CardTitle>No freelancers match your filters</CardTitle>
          <p className="text-slate-600">Try adjusting your keywords or category.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProfiles.map(profile => (
            <Card key={profile.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{profile.display_name}</CardTitle>
                    <p className="text-slate-600">{profile.headline}</p>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="w-4 h-4" />
                      <span>{profile.location_city || 'Zambia'}</span>
                      <AvailabilityBadge status={profile.availability_status} />
                    </div>
                  </div>
                  {profile.verification_status === 'verified' && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-700 line-clamp-3">{profile.bio}</p>
                <div className="flex flex-wrap gap-1">
                  {profile.skills?.slice(0, 4).map(skill => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                  {profile.service_categories?.slice(0, 2).map(category => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleSelect(profile)} className="flex-1">
                    View profile
                  </Button>
                  <Button variant="ghost" onClick={() => handleSave(profile)} aria-label="Save professional">
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleRequest(profile)} className="w-full">
                    Request support
                  </Button>
                  <Button variant="secondary" onClick={() => handleInviteOnly(profile)}>
                    Invite
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.display_name}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                {selected.headline && <Badge variant="outline">{selected.headline}</Badge>}
                <AvailabilityBadge status={selected.availability_status} />
                {selected.location_city && (
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <MapPin className="w-4 h-4" /> {selected.location_city}
                  </span>
                )}
              </div>
              <p className="text-slate-700 leading-relaxed">{selected.bio}</p>
              {selected.skills?.length ? (
                <div>
                  <h4 className="font-semibold mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.skills.map(skill => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {selected.services?.length ? (
                <div className="space-y-2">
                  <h4 className="font-semibold">Services</h4>
                  {selected.services.map(service => (
                    <div key={service.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{service.title}</span>
                        {service.price_amount ? (
                          <span className="text-sm text-slate-600">
                            {service.currency || 'ZMW'} {service.price_amount}
                          </span>
                        ) : null}
                      </div>
                      {service.description && <p className="text-sm text-slate-700">{service.description}</p>}
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        {service.category && <Badge variant="secondary">{service.category}</Badge>}
                        {service.delivery_mode?.map(mode => (
                          <Badge key={mode} variant="outline">
                            {mode}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <Separator />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button onClick={() => handleRequest(selected)}>Invite to request</Button>
              </div>
            </div>
          ) : (
            <p className="text-slate-600">Loading profile...</p>
          )}
        </DialogContent>
      </Dialog>

      <RequestModal
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        target={requestTarget}
        authToken={token}
        onCompleted={() => fetchProfiles()}
      />
    </div>
  );
};
