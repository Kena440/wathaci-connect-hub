import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  BadgeCheck,
  Banknote,
  Download,
  FileText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { defaultPassportInputs } from './mockData';
import { generateCreditPassport, PRICE_POINTS } from './scoring';
import {
  CreditPassportInputs,
  CreditPassportResult,
  MonetizationState,
  PaymentAction,
} from './types';

const PaymentGrid = ({
  actions,
  onPay,
  viewOnly,
  onRequestAccess,
}: {
  actions: PaymentAction[];
  onPay: (action: PaymentAction['actionKey']) => void;
  viewOnly?: boolean;
  onRequestAccess?: () => void;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {actions.map(action => (
      <Card key={action.actionKey} className="border-orange-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{action.label}</CardTitle>
            <Badge variant={action.status === 'paid' ? 'default' : 'secondary'}>
              {action.status === 'paid' ? 'Paid' : 'Action required'}
            </Badge>
          </div>
          <CardDescription>{action.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {PRICE_POINTS.currency} {action.amount}
            </p>
            <p className="text-sm text-muted-foreground">Pay before continuing</p>
          </div>
          <Button
            disabled={action.status === 'paid' || viewOnly}
            onClick={() => {
              if (viewOnly) {
                onRequestAccess?.();
                return;
              }
              onPay(action.actionKey);
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {action.status === 'paid' ? 'Recorded' : viewOnly ? 'Subscribe to unlock' : 'Record payment'}
          </Button>
        </CardContent>
      </Card>
    ))}
  </div>
);

const BreakdownList = ({ result }: { result: CreditPassportResult }) => (
  <div className="grid md:grid-cols-2 gap-4">
    <Card>
      <CardHeader>
        <CardTitle>Score breakdown</CardTitle>
        <CardDescription>Weighted view of the fundability engine</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(result.breakdown).map(([label, score]) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-green-600" />
              <span className="capitalize">{label.replace(/([A-Z])/g, ' $1')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{score.toFixed(1)}</span>
              <div className="w-32">
                <Progress value={score} className="h-2" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Risk profile</CardTitle>
        <CardDescription>Targeted signals for lenders and partners</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(result.riskProfile).map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700">
              <ShieldCheck className="w-4 h-4" />
              <span className="capitalize">{label.replace(/_/g, ' ')}</span>
            </div>
            <Badge
              variant={value === 'low' ? 'default' : value === 'medium' ? 'secondary' : 'destructive'}
              className="capitalize"
            >
              {value}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

const NarrativePanel = ({ result }: { result: CreditPassportResult }) => (
  <Card>
    <CardHeader>
      <CardTitle>AI narrative & lender brief</CardTitle>
      <CardDescription>Explainable insights that do not override numeric scoring</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="w-5 h-5 text-orange-600" />
        {result.narrative.headline}
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Strengths</h4>
          <ul className="space-y-2 text-sm list-disc list-inside text-green-700">
            {result.narrative.strengths.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Weaknesses</h4>
          <ul className="space-y-2 text-sm list-disc list-inside text-amber-700">
            {result.narrative.weaknesses.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Bank & investor concerns</h4>
          <ul className="space-y-2 text-sm list-disc list-inside text-red-700">
            {result.narrative.bank_concerns.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Recommended actions</h4>
          <ul className="space-y-2 text-sm list-disc list-inside">
            {result.narrative.recommendations.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Suggested partners</h4>
          <div className="flex flex-wrap gap-2">
            {result.narrative.suggested_partners.map(partner => (
              <Badge key={partner} variant="outline" className="border-orange-200 text-orange-700">
                {partner}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const InputRow = ({ label, value, onChange, helper }: { label: string; value: string | number; onChange: (val: string) => void; helper?: string }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold text-gray-700">{label}</Label>
    <Input value={value} onChange={e => onChange(e.target.value)} />
    {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
  </div>
);

export const CreditPassportPage = () => {
  const [inputs, setInputs] = useState<CreditPassportInputs>(defaultPassportInputs);
  const [monetization, setMonetization] = useState<MonetizationState>({
    generation: 'required',
    pdf: 'locked',
    share: 'locked',
  });
  const [result, setResult] = useState<CreditPassportResult | null>(null);
  const [history, setHistory] = useState<CreditPassportResult[]>([]);
  const [notes, setNotes] = useState('');
  const viewOnly = false;

  const ensureInteractive = () => {
    return true;
  };

  const paymentActions: PaymentAction[] = useMemo(
    () => [
      {
        label: 'Generate SME Credit Passport',
        amount: PRICE_POINTS.generate,
        status: monetization.generation,
        description: 'Required before the engine runs any scoring.',
        actionKey: 'generation',
      },
      {
        label: 'Download PDF',
        amount: PRICE_POINTS.pdf,
        status: monetization.pdf,
        description: 'Separate revenue event for bank-ready reports.',
        actionKey: 'pdf',
      },
      {
        label: 'Share with partners',
        amount: PRICE_POINTS.share,
        status: monetization.share,
        description: 'Each share link requires payment before access.',
        actionKey: 'share',
      },
    ],
    [monetization],
  );

  const handleInputChange = (section: keyof CreditPassportInputs, key: string, value: number | string | boolean) => {
    setInputs(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [key]: value,
      },
    }));
    setResult(null);
    setMonetization(prev => ({ ...prev, generation: 'required', share: 'locked', pdf: 'locked' }));
  };

  const handlePay = (action: PaymentAction['actionKey']) => {
    if (!ensureInteractive()) return;
    setMonetization(prev => {
      const next = { ...prev };
      next[action] = 'paid';
      return next;
    });
  };

  const runEngine = () => {
    if (!ensureInteractive()) return;
    if (monetization.generation !== 'paid') return;
    const generated = generateCreditPassport(inputs);
    const withNotes: CreditPassportResult = {
      ...generated,
      narrative: {
        ...generated.narrative,
        recommendations: [...generated.narrative.recommendations, ...(notes ? [notes] : [])],
      },
    };
    setResult(withNotes);
    setHistory(prev => [withNotes, ...prev].slice(0, 5));
    setMonetization(prev => ({
      ...prev,
      generation: 'paid',
      share: prev.share === 'paid' ? 'paid' : 'required',
      pdf: prev.pdf === 'paid' ? 'paid' : 'required',
    }));
  };

  const canShare = result && monetization.share === 'paid';
  const canDownload = result && monetization.pdf === 'paid';

  useEffect(() => {
    if (history.length === 0 && result) {
      setHistory([result]);
    }
  }, [history.length, result]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <Badge variant="outline" className="border-orange-300 text-orange-700">Fundability & Monetization Engine</Badge>
            <h1 className="text-4xl font-bold text-gray-900">SME Credit Passport & Fundability Score</h1>
            <p className="text-lg text-gray-700">
              Combine business identity, finance, compliance, behaviour, and AI insights into a single bank-ready credit
              passport. Every run, PDF, and share is monetized with upfront payments via mobile money or cards.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="secondary">ZMW {PRICE_POINTS.generate} per run</Badge>
              <Badge variant="secondary">ZMW {PRICE_POINTS.share} per share</Badge>
              <Badge variant="secondary">ZMW {PRICE_POINTS.pdf} per PDF</Badge>
            </div>
          </div>
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-green-600" /> Payment gating</CardTitle>
              <CardDescription>Generation, sharing, and PDF export are all revenue events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2"><Badge variant="outline">Rule</Badge> Pay before generating the passport.</div>
              <div className="flex items-center gap-2"><Badge variant="outline">Rule</Badge> Each share link requires its own payment.</div>
              <div className="flex items-center gap-2"><Badge variant="outline">Rule</Badge> PDF download is a paid add-on.</div>
              <p className="text-xs text-muted-foreground">All runs are stored with timestamps so SMEs can re-purchase when data changes.</p>
            </CardContent>
          </Card>
        </div>

        <PaymentGrid
          actions={paymentActions}
          onPay={handlePay}
          viewOnly={viewOnly}
        />

        <Card className="border-orange-100">
          <CardHeader>
            <CardTitle>Core inputs</CardTitle>
            <CardDescription>Structured signals captured before the passport is generated.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InputRow
                label="Business name"
                value={inputs.businessIdentity.name}
                onChange={value => handleInputChange('businessIdentity', 'name', value)}
              />
              <InputRow
                label="Sector"
                value={inputs.businessIdentity.sector || ''}
                onChange={value => handleInputChange('businessIdentity', 'sector', value)}
              />
              <InputRow
                label="Monthly revenue (latest)"
                value={inputs.financials.monthlyRevenue?.slice(-1)[0] || ''}
                onChange={value => handleInputChange('financials', 'monthlyRevenue', [...(inputs.financials.monthlyRevenue || []), Number(value)])}
                helper="Exact or estimate accepted"
              />
              <InputRow
                label="Profit margin (%)"
                value={inputs.financials.profitMargin ?? ''}
                onChange={value => handleInputChange('financials', 'profitMargin', Number(value))}
              />
              <InputRow
                label="Cash conversion cycle (days)"
                value={inputs.financials.cashConversionCycle ?? ''}
                onChange={value => handleInputChange('financials', 'cashConversionCycle', Number(value))}
              />
            </div>
            <div className="space-y-4">
              <InputRow
                label="Repayment history score"
                value={inputs.banking.repaymentHistory ?? ''}
                onChange={value => handleInputChange('banking', 'repaymentHistory', Number(value))}
                helper="Blend of bank, mobile money, POS data"
              />
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Tax clearance</Label>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Valid tax clearance</p>
                    <p className="text-xs text-muted-foreground">Compliance & governance score lever</p>
                  </div>
                  <Switch
                    checked={Boolean(inputs.compliance.taxClearance)}
                    onCheckedChange={checked => handleInputChange('compliance', 'taxClearance', checked)}
                  />
                </div>
              </div>
              <InputRow
                label="Digital footprint score"
                value={inputs.digitalOperational.digitalFootprint ?? ''}
                onChange={value => handleInputChange('digitalOperational', 'digitalFootprint', Number(value))}
              />
              <InputRow
                label="Seasonality impact (%)"
                value={inputs.digitalOperational.seasonality ?? ''}
                onChange={value => handleInputChange('digitalOperational', 'seasonality', Number(value))}
              />
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Custom note for recommendations</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add lender-facing context or planned mitigations"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={runEngine}
            disabled={monetization.generation !== 'paid' || viewOnly}
          >
            <Sparkles className="w-4 h-4 mr-2" /> Generate passport
          </Button>
          <Button variant="outline" disabled={!canDownload || viewOnly} className="border-orange-300">
            <Download className="w-4 h-4 mr-2" /> Download PDF (requires payment)
          </Button>
          <Button variant="outline" disabled={!canShare || viewOnly} className="border-green-300">
            <UploadCloud className="w-4 h-4 mr-2" /> Share with bank/investor
          </Button>
          {monetization.generation !== 'paid' && (
            <p className="text-sm text-red-600 mt-2">Pay for generation before running the engine.</p>
          )}
        </div>

        {result ? (
          <div className="space-y-6">
            <Card className="border-green-200">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl">Fundability score: {result.fundabilityScore}/100</CardTitle>
                  <CardDescription>{result.interpretation}</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Liquidity strength</p>
                    <p className="text-2xl font-semibold">{result.liquidityIndex}/10</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Resilience</p>
                    <p className="text-2xl font-semibold">{result.resilienceScore.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Repayment</p>
                    <p className="text-2xl font-semibold">{result.repaymentCapacity.label}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={result.fundabilityScore} className="h-3" />
              </CardContent>
            </Card>

            <BreakdownList result={result} />
            <NarrativePanel result={result} />

            <Card>
              <CardHeader>
                <CardTitle>Access control</CardTitle>
                <CardDescription>Wallet, mobile money, and card-ready monetization with expiring share links.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg flex gap-3">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-semibold">Stored run</p>
                    <p className="text-sm text-muted-foreground">Passport run is stored and must be repurchased after updates.</p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg flex gap-3">
                  <ArrowDownCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-semibold">PDF requires payment</p>
                    <p className="text-sm text-muted-foreground">Download unlocks after ZMW {PRICE_POINTS.pdf} is paid.</p>
                  </div>
                </div>
                <div className="p-4 border rounded-lg flex gap-3">
                  <UploadCloud className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold">Share control</p>
                    <p className="text-sm text-muted-foreground">Each share event (ZMW {PRICE_POINTS.share}) issues an expiring link.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Awaiting payment & generation</CardTitle>
              <CardDescription>Pay for the run, then click “Generate passport” to activate scoring.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Run history</CardTitle>
            <CardDescription>Latest stored passports (max 5) with payment awareness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet. Pay and generate to see the ledger.</p>
            ) : (
              history.map(item => (
                <div key={item.timestamp} className="flex flex-wrap items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-semibold">{item.fundabilityScore}/100 — {item.interpretation}</p>
                    <p className="text-xs text-muted-foreground">Generated {new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Liquidity {item.liquidityIndex}/10</Badge>
                    <Badge variant="outline">Repayment {item.repaymentCapacity.label}</Badge>
                    <Badge variant="outline">Shares paid? {monetization.share === 'paid' ? 'Yes' : 'No'}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CreditPassportPage;
