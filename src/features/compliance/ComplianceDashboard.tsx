import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { apiGet, apiPost } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardList, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';

interface ComplianceArea {
  id: string;
  slug: string;
  title: string;
  description: string;
  priority?: number | null;
}

interface ComplianceRequirement {
  id: string;
  area_id: string;
  title: string;
  description?: string | null;
  authority?: string | null;
  required_for?: string[] | null;
  is_mandatory?: boolean | null;
  links?: string[] | null;
}

interface ComplianceStatusRecord {
  requirement_id: string;
  area_id: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'not_applicable';
  notes?: string | null;
}

interface ComplianceRiskScore {
  overall_score: number | null;
  risk_band: string | null;
  ai_summary?: string | null;
  updated_at?: string | null;
  details?: { top_gaps?: string[]; recommended_next_steps?: string[] };
}

interface ProfessionalRecommendation {
  user_id: string;
  full_name?: string | null;
  organisation_name?: string | null;
  bio?: string | null;
  primary_expertise?: string[] | null;
  services_offered?: string[] | null;
  top_sectors?: string[] | null;
  tags?: string[] | null;
  profile_photo_url?: string | null;
  location_city?: string | null;
  location_country?: string | null;
  website_url?: string | null;
  linkedin_url?: string | null;
  relevance_tags?: string[];
}

const STATUS_OPTIONS: ComplianceStatusRecord['status'][] = [
  'not_started',
  'in_progress',
  'completed',
  'not_applicable',
];

const StatusBadge = ({ status }: { status: ComplianceStatusRecord['status'] }) => {
  const labelMap: Record<ComplianceStatusRecord['status'], string> = {
    not_started: 'Not started',
    in_progress: 'In progress',
    completed: 'Completed',
    not_applicable: 'Not applicable',
  };

  const tone: Record<ComplianceStatusRecord['status'], string> = {
    not_started: 'bg-slate-100 text-slate-700',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    not_applicable: 'bg-slate-100 text-slate-700',
  };

  return <Badge className={tone[status]}>{labelMap[status]}</Badge>;
};

export const ComplianceDashboard = () => {
  const { user, profile } = useAppContext();
  const isAuthenticated = Boolean(user);
  const smeId = user?.id;

  const [areas, setAreas] = useState<ComplianceArea[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, ComplianceStatusRecord>>({});
  const [riskScore, setRiskScore] = useState<ComplianceRiskScore | null>(null);
  const [recommendedPros, setRecommendedPros] = useState<ProfessionalRecommendation[]>([]);
  const [roadmap, setRoadmap] = useState<{ steps?: { title?: string; description?: string; priority?: string; timeframe_days?: number }[] }>({});
  const [question, setQuestion] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('');

  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [loadingAssistant, setLoadingAssistant] = useState(false);
  const [loadingPros, setLoadingPros] = useState(false);

  const [pendingQueue, setPendingQueue] = useState<Record<string, ComplianceStatusRecord>>({});

  const fetchAreas = async () => {
    try {
      setLoadingAreas(true);
      const data = await apiGet<ComplianceArea[]>('/api/compliance/areas');
      setAreas(data);
    } catch (error) {
      console.error(error);
      toast.error('We could not load compliance areas. Please try again later.');
    } finally {
      setLoadingAreas(false);
    }
  };

  const fetchRequirements = async () => {
    try {
      setLoadingRequirements(true);
      const params = new URLSearchParams();
      const smeType = (profile as any)?.registration_type || (profile as any)?.account_type || undefined;
      if (smeType) params.set('smeType', String(smeType));
      const data = await apiGet<ComplianceRequirement[]>(`/api/compliance/requirements?${params.toString()}`);
      setRequirements(data);
    } catch (error) {
      console.error(error);
      toast.error('We could not load compliance requirements.');
    } finally {
      setLoadingRequirements(false);
    }
  };

  const fetchStatus = async () => {
    if (!smeId) return;
    try {
      setLoadingStatus(true);
      const data = await apiGet<ComplianceStatusRecord[]>(`/api/compliance/status/${smeId}`);
      const map: Record<string, ComplianceStatusRecord> = {};
      data.forEach(item => {
        map[item.requirement_id] = item;
      });
      setStatusMap(map);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchRisk = async () => {
    if (!smeId) return;
    try {
      setLoadingRisk(true);
      const data = await apiGet<ComplianceRiskScore | null>(`/api/compliance/risk/${smeId}`);
      setRiskScore(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingRisk(false);
    }
  };

  const fetchProfessionals = async () => {
    if (!smeId) return;
    try {
      setLoadingPros(true);
      const data = await apiGet<ProfessionalRecommendation[]>(`/api/compliance/recommend-professionals?smeId=${smeId}`);
      setRecommendedPros(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPros(false);
    }
  };

  useEffect(() => {
    fetchAreas();
    fetchRequirements();
    // Lightweight analytics hook
    void apiPost('/api/compliance/events', { eventType: 'compliance_hub_view', smeId }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      fetchRisk();
      fetchProfessionals();
    } else {
      setStatusMap({});
      setRiskScore(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, smeId]);

  const groupedRequirements = useMemo(() => {
    const grouped: Record<string, ComplianceRequirement[]> = {};
    requirements.forEach(req => {
      if (!grouped[req.area_id]) grouped[req.area_id] = [];
      grouped[req.area_id].push(req);
    });
    return grouped;
  }, [requirements]);

  useEffect(() => {
    if (!Object.keys(pendingQueue).length || !smeId) return;
    const timer = setTimeout(async () => {
      try {
        setSavingStatus(true);
        const items = Object.values(pendingQueue);
        await apiPost('/api/compliance/status/bulk-upsert', {
          smeId,
          items: items.map(item => ({
            requirement_id: item.requirement_id,
            area_id: item.area_id,
            status: item.status,
            notes: item.notes,
          })),
        });
        setPendingQueue({});
      } catch (error) {
        console.error(error);
        toast.error('Could not save your changes. Please try again.');
      } finally {
        setSavingStatus(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [pendingQueue, smeId]);

  const updateStatus = (requirement: ComplianceRequirement, status: ComplianceStatusRecord['status']) => {
    if (!smeId) {
      toast.info('Sign in to track your compliance progress.');
      return;
    }
    setStatusMap(prev => ({
      ...prev,
      [requirement.id]: {
        ...prev[requirement.id],
        requirement_id: requirement.id,
        area_id: requirement.area_id,
        status,
      },
    }));
    setPendingQueue(prev => ({
      ...prev,
      [requirement.id]: {
        ...prev[requirement.id],
        requirement_id: requirement.id,
        area_id: requirement.area_id,
        status,
      },
    }));
  };

  const updateNotes = (requirement: ComplianceRequirement, notes: string) => {
    if (!smeId) {
      toast.info('Sign in to add notes.');
      return;
    }
    setStatusMap(prev => ({
      ...prev,
      [requirement.id]: {
        ...prev[requirement.id],
        requirement_id: requirement.id,
        area_id: requirement.area_id,
        status: prev[requirement.id]?.status || 'in_progress',
        notes,
      },
    }));
    setPendingQueue(prev => ({
      ...prev,
      [requirement.id]: {
        ...prev[requirement.id],
        requirement_id: requirement.id,
        area_id: requirement.area_id,
        status: prev[requirement.id]?.status || 'in_progress',
        notes,
      },
    }));
  };

  const triggerAssessment = async () => {
    if (!smeId) {
      toast.info('Sign in to run an AI compliance assessment.');
      return;
    }
    try {
      setLoadingRisk(true);
      const data = await apiPost<ComplianceRiskScore>('/api/compliance/ai-assess', { smeId });
      setRiskScore(data);
      toast.success('AI compliance assessment refreshed');
    } catch (error) {
      console.error(error);
      toast.error('We could not generate an assessment right now.');
    } finally {
      setLoadingRisk(false);
    }
  };

  const requestRoadmap = async () => {
    if (!smeId) {
      toast.info('Sign in to build your compliance roadmap.');
      return;
    }
    try {
      setLoadingRoadmap(true);
      const gaps = Object.values(statusMap)
        .filter(item => item.status !== 'completed')
        .map(item => item.requirement_id);
      const data = await apiPost('/api/compliance/ai-roadmap', { smeId, gaps });
      setRoadmap(data || {});
    } catch (error) {
      console.error(error);
      toast.error('Roadmap is unavailable right now.');
    } finally {
      setLoadingRoadmap(false);
    }
  };

  const askAssistant = async () => {
    if (!question.trim()) return;
    if (!isAuthenticated) {
      toast.info('Sign in to chat with the compliance assistant.');
      return;
    }
    try {
      setLoadingAssistant(true);
      const data = await apiPost<{ answer: string }>('/api/compliance/assistant', { question });
      setAssistantAnswer(data.answer);
    } catch (error) {
      console.error(error);
      toast.error('We could not answer that right now.');
    } finally {
      setLoadingAssistant(false);
    }
  };

  const renderRequirementRow = (requirement: ComplianceRequirement) => {
    const status = statusMap[requirement.id]?.status || 'not_started';
    const notes = statusMap[requirement.id]?.notes || '';

    return (
      <div key={requirement.id} className="border border-slate-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900">{requirement.title}</h4>
              {requirement.is_mandatory ? <Badge className="bg-emerald-100 text-emerald-800">Mandatory</Badge> : null}
            </div>
            <p className="text-sm text-slate-600 mt-1">{requirement.authority || 'Authority not specified'}</p>
            {requirement.description && <p className="text-sm text-slate-500 mt-1">{requirement.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Select value={status} onValueChange={value => updateStatus(requirement, value as ComplianceStatusRecord['status'])}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>
                    {option.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-500">Notes / evidence</label>
          <Textarea
            value={notes}
            onChange={e => updateNotes(requirement, e.target.value)}
            placeholder="Add reference numbers, dates, or document links..."
            className="mt-1"
          />
        </div>
      </div>
    );
  };

  const renderAreaSection = (area: ComplianceArea) => {
    const items = groupedRequirements[area.id] || [];
    if (!items.length) return null;

    return (
      <div key={area.id} className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-amber-600" />
          <h3 className="text-xl font-semibold text-slate-900">{area.title}</h3>
        </div>
        {items.map(renderRequirementRow)}
      </div>
    );
  };

  const areaCards = (
    <div className="grid gap-4 md:grid-cols-2">
      {areas.map(area => (
        <Card key={area.id} className="h-full">
          <CardHeader>
            <CardTitle>{area.title}</CardTitle>
            <CardDescription>{area.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="w-4 h-4" /> Priority {area.priority ?? '—'}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderRiskPanel = () => {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Compliance readiness</CardTitle>
            <CardDescription>AI-powered snapshot of your compliance health.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={triggerAssessment} disabled={!isAuthenticated || loadingRisk}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            {riskScore ? 'Refresh assessment' : 'Run assessment'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingRisk ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : riskScore ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-emerald-700">{Math.round(Number(riskScore.overall_score || 0))}</div>
                <div>
                  <p className="text-sm text-slate-600">Compliance score</p>
                  <Badge className="bg-emerald-100 text-emerald-800 capitalize">{riskScore.risk_band || 'pending'}</Badge>
                </div>
              </div>
              {riskScore.ai_summary && <p className="text-sm text-slate-700">{riskScore.ai_summary}</p>}
              {riskScore.details?.top_gaps?.length ? (
                <div>
                  <p className="text-xs uppercase text-slate-500 mb-1">Top gaps</p>
                  <div className="flex flex-wrap gap-2">
                    {riskScore.details.top_gaps.map(gap => (
                      <Badge key={gap} variant="outline" className="text-amber-700 border-amber-200">
                        {gap}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">No assessment yet.</p>
              <p className="text-sm text-slate-500">Run an AI assessment to see your compliance readiness score.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRoadmap = () => {
    const steps = roadmap.steps || [];
    if (!steps.length) return null;

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Compliance roadmap</CardTitle>
            <CardDescription>30–90 day, prioritised steps to improve compliance health.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={requestRoadmap} disabled={loadingRoadmap}>
            <Sparkles className="w-4 h-4 mr-2" /> Refresh roadmap
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">{step.title || 'Step'}</div>
                <Badge variant="outline" className="capitalize">
                  {step.priority || 'medium'} • {step.timeframe_days ? `${step.timeframe_days} days` : 'Next'}
                </Badge>
              </div>
              {step.description && <p className="text-sm text-slate-600 mt-1">{step.description}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderAssistant = () => (
    <Card>
      <CardHeader>
        <CardTitle>AI Compliance Assistant</CardTitle>
        <CardDescription>Ask quick compliance questions. Guidance only – please consult a professional for decisions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a compliance question (e.g. Do I need to register for VAT?)"
        />
        <Button onClick={askAssistant} disabled={loadingAssistant || !question.trim()}>
          {loadingAssistant ? 'Thinking…' : 'Get guidance'}
        </Button>
        {assistantAnswer ? (
          <Alert>
            <AlertTitle>Answer</AlertTitle>
            <AlertDescription className="whitespace-pre-line text-sm">{assistantAnswer}</AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-slate-500">No answer yet. Ask a question to get started.</p>
        )}
      </CardContent>
    </Card>
  );

  const renderProfessionals = () => (
    <Card>
      <CardHeader>
        <CardTitle>Recommended professionals</CardTitle>
        <CardDescription>Compliance specialists matched to your gaps.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loadingPros ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : recommendedPros.length ? (
          recommendedPros.map(pro => (
            <div key={pro.user_id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{pro.full_name || pro.organisation_name || 'Professional'}</p>
                  <p className="text-sm text-slate-600">{pro.primary_expertise?.join(', ') || 'Compliance specialist'}</p>
                </div>
                <Button variant="ghost" asChild>
                  <a href={`/professionals/${pro.user_id}`} className="flex items-center gap-1">
                    View profile <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              {pro.relevance_tags?.length ? (
                <div className="flex flex-wrap gap-2 mt-2">
                  {pro.relevance_tags.map(tag => (
                    <Badge key={tag} variant="outline" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-600">No tailored matches yet. Update your checklist to see suggestions.</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-orange-600 font-semibold">Compliance Hub</p>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">Business formalisation & compliance health</h1>
                <p className="text-slate-600 mt-2 max-w-3xl">
                  Track company registration, tax, licences, labour, governance, and data protection steps for Zambia. Stay
                  investment-ready with AI guidance and curated specialists.
                </p>
              </div>
              <Badge className="bg-orange-100 text-orange-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Zambia-first
              </Badge>
            </div>
            {!isAuthenticated && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Viewing in read-only mode</AlertTitle>
                <AlertDescription>Sign in to save your checklist progress and run AI assessments.</AlertDescription>
              </Alert>
            )}
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Compliance areas</h2>
                <p className="text-slate-600 text-sm">Key domains your business should review.</p>
              </div>
            </div>
            {loadingAreas ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map(item => (
                  <Card key={item}>
                    <CardHeader>
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : areas.length ? (
              areaCards
            ) : (
              <p className="text-sm text-slate-600">We couldn’t load the areas right now. Please refresh later.</p>
            )}
          </section>

          <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Your compliance checklist</h2>
              <p className="text-slate-600 text-sm">Update statuses and keep notes for audit readiness.</p>
            </div>
            <div className="text-sm text-slate-500">
              {savingStatus ? 'Saving changes…' : loadingStatus ? 'Loading your progress…' : null}
            </div>
          </div>
            {loadingRequirements ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : areas.length ? (
              areas.map(renderAreaSection)
            ) : (
              <p className="text-sm text-slate-600">No checklist items available yet.</p>
            )}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {renderRiskPanel()}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Generate compliance roadmap</CardTitle>
                  <CardDescription>Prioritised steps based on your current gaps.</CardDescription>
                </div>
                <Button onClick={requestRoadmap} disabled={!isAuthenticated || loadingRoadmap}>
                  <Sparkles className="w-4 h-4 mr-2" /> Build roadmap
                </Button>
              </CardHeader>
              <CardContent>
                {loadingRoadmap ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    We’ll use your checklist updates to propose the top actions to complete in the next 30–90 days.
                  </p>
                )}
              </CardContent>
            </Card>
          </section>

          {renderRoadmap()}

          <section className="grid gap-6 md:grid-cols-2">
            {renderAssistant()}
            {renderProfessionals()}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Funding Hub readiness</CardTitle>
                <CardDescription>Better compliance improves funding eligibility.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href="/funding-hub" className="flex items-center gap-2">
                    View funding options <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Partnership Hub</CardTitle>
                <CardDescription>Share compliance documentation with potential partners.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href="/partnerships" className="flex items-center gap-2">
                    Go to Partnership Hub <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>SME Profile</CardTitle>
                <CardDescription>Keep your business profile aligned with compliance records.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href="/sme/profile" className="flex items-center gap-2">
                    Update SME profile <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>

          {!isAuthenticated && (
            <Card className="border-slate-200 bg-white">
              <CardContent className="py-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-sm text-slate-700">
                  Sign in to save your checklist, run AI assessments, and receive professional recommendations tailored to your
                  profile.
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </div>
  );
};
