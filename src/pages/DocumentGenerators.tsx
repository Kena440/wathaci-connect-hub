import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { documentGeneratorService, type DocumentType, type PaidDocumentRequest } from '@/lib/services/document-generator-service';
import { cn } from '@/lib/utils';
import { CheckCircle2, CreditCard, FileText, Loader2, Shield, ShoppingBag } from 'lucide-react';

const initialForm = {
  businessName: '',
  industry: '',
  stage: '',
  vision: '',
  goals: '',
  market: '',
  financials: '',
  team: '',
  documents: '',
};

type Step = 'details' | 'payment' | 'generation';

const stepToProgress = (step: Step) => {
  if (step === 'details') return 33;
  if (step === 'payment') return 66;
  return 100;
};

interface OutputFiles {
  pdf?: { signed_url?: string };
  docx?: { signed_url?: string };
  pptx?: { signed_url?: string };
  receipt?: { receipt_number?: string; issued_at?: string; amount?: number; currency?: string };
  model_version?: string;
  generated_at?: string;
}

const DocumentGenerators = () => {
  const { user, profile } = useAppContext();
  const [formData, setFormData] = useState(initialForm);
  const [activeStep, setActiveStep] = useState<Step>('details');
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [isPaying, setIsPaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<PaidDocumentRequest | null>(null);
  const [history, setHistory] = useState<PaidDocumentRequest[]>([]);
  const [statusText, setStatusText] = useState('Waiting for payment...');

  const progressValue = useMemo(() => stepToProgress(activeStep), [activeStep]);
  const currentStepIndex = activeStep === 'details' ? 1 : activeStep === 'payment' ? 2 : 3;

  const handleFieldChange = (field: keyof typeof initialForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStartPayment = (type: DocumentType) => {
    setSelectedType(type);
    setActiveStep('payment');
    setStatusText('Awaiting payment confirmation');
  };

  const loadHistory = async () => {
    if (!user) return;
    try {
      const { requests } = await documentGeneratorService.listRequests(user.id);
      setHistory(requests || []);
    } catch (error) {
      console.error('[documents] history error', error);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user?.id]);

  const triggerPayment = async () => {
    if (!user || !selectedType) {
      toast({ title: 'Sign in required', description: 'Please sign in to continue.' });
      return;
    }
    setIsPaying(true);
    try {
      const payment = await documentGeneratorService.initiatePayment({
        document_type: selectedType,
        payment_method: paymentMethod,
        user_id: user.id,
        company_id: (profile as any)?.company_id || user.id,
        input_data: {
          ...formData,
          ip_address: typeof window !== 'undefined' ? window.location.hostname : 'server',
        },
        auto_confirm: true,
      });

      let request = payment.request;
      if (payment.payment.requires_confirmation) {
        const confirmation = await documentGeneratorService.confirmPayment(request.id, 'success');
        request = confirmation.request;
      }

      setCurrentRequest(request);
      setActiveStep('generation');
      setStatusText('Payment successful! Generating your document...');
      toast({ title: 'Payment successful', description: 'Your AI document is now generating.' });
      await triggerGeneration(request.id, user.id);
      await loadHistory();
    } catch (error: any) {
      console.error('[documents] payment error', error);
      toast({ title: 'Payment failed', description: error?.message || 'Could not process payment', variant: 'destructive' });
      setStatusText('Payment failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

  const triggerGeneration = async (requestId: string, userId: string) => {
    setIsGenerating(true);
    setStatusText('Preparing data');
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setStatusText('Running AI model');
      await new Promise(resolve => setTimeout(resolve, 300));
      setStatusText('Rendering files');

      const { request } = await documentGeneratorService.generateDocument(requestId, userId);
      setCurrentRequest(request);
      setStatusText('Document ready');
      toast({ title: 'AI document ready', description: 'Downloads are unlocked with expiring links.' });
    } catch (error: any) {
      console.error('[documents] generation error', error);
      toast({ title: 'Generation failed', description: error?.message || 'Could not generate document', variant: 'destructive' });
      setStatusText('Generation failed. Retry after confirming payment.');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForRegeneration = () => {
    if (!selectedType) return;
    setActiveStep('payment');
    setStatusText('Awaiting payment confirmation');
  };

  const outputFiles: OutputFiles | undefined = currentRequest?.output_files as OutputFiles | undefined;
  const generationComplete = currentRequest?.generation_status === 'completed' && currentRequest.payment_status === 'success';
  const downloadDisabled = !generationComplete;

  const renderDownloadButton = (label: string, url?: string) => (
    <Button asChild variant="secondary" disabled={!url || downloadDisabled}>
      <a href={url || '#'} target="_blank" rel="noreferrer">
        {label}
      </a>
    </Button>
  );

  return (
    <AppLayout>
      <div className="container mx-auto space-y-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Premium AI Workbench</p>
            <h1 className="text-3xl font-bold">AI Business Plan & Investor Pitch Deck</h1>
            <p className="text-muted-foreground">
              ZMW150 per document. Secure payments, receipts, and expiring download links with regeneration on demand.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">Autosave</Badge>
              <Badge variant="outline">Progress tracking</Badge>
              <Badge variant="outline">Payment required</Badge>
              <Badge variant="secondary">Private storage</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <Badge className="bg-emerald-600 text-white">ZMW150 / doc</Badge>
            <Badge variant="outline">Bundle: ZMW300</Badge>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Three-step flow</CardTitle>
              <CardDescription>Collect details → Mandatory payment → AI generation & locked downloads.</CardDescription>
            </div>
            <div className="w-full max-w-sm">
              <Progress value={progressValue} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">Step {currentStepIndex} of 3</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeStep} onValueChange={value => setActiveStep(value as Step)}>
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="details">1. Data</TabsTrigger>
                <TabsTrigger value="payment">2. Payment</TabsTrigger>
                <TabsTrigger value="generation">3. AI Output</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Business details</CardTitle>
                      <CardDescription>Tell us about the company.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        value={formData.businessName}
                        onChange={e => handleFieldChange('businessName', e.target.value)}
                        placeholder="Business name"
                      />
                      <Input
                        value={formData.industry}
                        onChange={e => handleFieldChange('industry', e.target.value)}
                        placeholder="Industry"
                      />
                      <Input
                        value={formData.stage}
                        onChange={e => handleFieldChange('stage', e.target.value)}
                        placeholder="Stage (idea, early, growth)"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Vision & goals</CardTitle>
                      <CardDescription>Strategic direction to inform the AI output.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={formData.vision}
                        onChange={e => handleFieldChange('vision', e.target.value)}
                        placeholder="Vision"
                      />
                      <Textarea
                        value={formData.goals}
                        onChange={e => handleFieldChange('goals', e.target.value)}
                        placeholder="Short- and long-term goals"
                      />
                    </CardContent>
                  </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Financials</CardTitle>
                      <CardDescription>Key figures and assumptions.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={formData.financials}
                        onChange={e => handleFieldChange('financials', e.target.value)}
                        placeholder="Revenue, margins, runway, or funding requirements"
                      />
                      <Textarea
                        value={formData.market}
                        onChange={e => handleFieldChange('market', e.target.value)}
                        placeholder="Market dynamics, ICP, competitors"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Team & documents</CardTitle>
                      <CardDescription>Highlight founders and attach context.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        value={formData.team}
                        onChange={e => handleFieldChange('team', e.target.value)}
                        placeholder="Team bios, roles, traction"
                      />
                      <Textarea
                        value={formData.documents}
                        onChange={e => handleFieldChange('documents', e.target.value)}
                        placeholder="Link or note files for extraction"
                      />
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Live summary preview</CardTitle>
                    <CardDescription>Autosaves your inputs and shows what the AI will use.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Business</p>
                      <p className="font-semibold">{formData.businessName || 'Not provided'}</p>
                      <p className="text-xs text-muted-foreground">Industry: {formData.industry || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Market & financials</p>
                      <p className="font-semibold">{formData.market || 'Add market details'}</p>
                      <p className="text-xs text-muted-foreground">{formData.financials || 'Add financial notes'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vision & team</p>
                      <p className="font-semibold">{formData.vision || 'Set your vision'}</p>
                      <p className="text-xs text-muted-foreground">Team: {formData.team || 'Add team profiles'}</p>
                    </div>
                  </CardContent>
                </Card>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleStartPayment('business_plan')}>
                    Generate Business Plan (ZMW150)
                  </Button>
                  <Button variant="secondary" onClick={() => handleStartPayment('pitch_deck')}>
                    Generate Pitch Deck (ZMW150)
                  </Button>
                  <Button variant="outline" onClick={() => handleStartPayment('bundle')}>
                    Buy Both for ZMW300
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="payment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment required</CardTitle>
                    <CardDescription>
                      This feature is NOT included in your subscription. Pay per document to unlock AI generation.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-semibold">AI Business Plan</p>
                      <p className="text-2xl font-bold">ZMW150</p>
                      <p className="text-xs text-muted-foreground">One-time per document</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm font-semibold">AI Investor Pitch Deck</p>
                      <p className="text-2xl font-bold">ZMW150</p>
                      <p className="text-xs text-muted-foreground">Includes PPTX rendering</p>
                    </div>
                    <div className="rounded-lg border p-3 bg-emerald-50">
                      <p className="text-sm font-semibold text-emerald-700">Bundle offer</p>
                      <p className="text-2xl font-bold text-emerald-700">ZMW300</p>
                      <p className="text-xs text-muted-foreground">Buy both together</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment options</CardTitle>
                      <CardDescription>Select a payment rail and confirm.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 rounded border p-3 cursor-pointer" onClick={() => setPaymentMethod('mobile_money')}>
                        <CheckCircle2 className={cn('h-5 w-5', paymentMethod === 'mobile_money' ? 'text-emerald-600' : 'text-muted-foreground')} />
                        <div className="flex-1">
                          <p className="font-semibold">Pay ZMW150 via Mobile Money</p>
                          <p className="text-xs text-muted-foreground">MTN / Airtel / Zamtel</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 rounded border p-3 cursor-pointer" onClick={() => setPaymentMethod('card')}>
                        <CheckCircle2 className={cn('h-5 w-5', paymentMethod === 'card' ? 'text-emerald-600' : 'text-muted-foreground')} />
                        <div className="flex-1">
                          <p className="font-semibold">Pay with Visa/Mastercard</p>
                          <p className="text-xs text-muted-foreground">Stripe / Flutterwave / Paystack</p>
                        </div>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center gap-2 rounded border p-3 cursor-pointer" onClick={() => setPaymentMethod('bank_transfer')}>
                        <CheckCircle2 className={cn('h-5 w-5', paymentMethod === 'bank_transfer' ? 'text-emerald-600' : 'text-muted-foreground')} />
                        <div className="flex-1">
                          <p className="font-semibold">Pay via Bank Transfer</p>
                          <p className="text-xs text-muted-foreground">Manual confirmation</p>
                        </div>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Why it costs</CardTitle>
                      <CardDescription>This covers AI compute, rendering, formatting, and secure storage.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" /> AI model execution & QC
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShoppingBag className="h-4 w-4" /> Document rendering to PDF/DOCX/PPTX
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" /> Private storage with expiring links
                      </div>
                      <Button className="w-full" disabled={isPaying} onClick={triggerPayment}>
                        {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Confirm payment & generate
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="generation" className="space-y-4">
                <Alert>
                  <AlertTitle>Generation status</AlertTitle>
                  <AlertDescription>{statusText}</AlertDescription>
                </Alert>
                <div className="grid gap-4 md:grid-cols-3">
                  {['Preparing data', 'Running AI model', 'Rendering PDF', 'Finalizing'].map(stage => (
                    <div key={stage} className="rounded-lg border p-3">
                      <p className="text-sm font-semibold">{stage}</p>
                      <p className="text-xs text-muted-foreground">{currentRequest?.payment_status === 'success' ? 'Paid' : 'Awaiting payment'}</p>
                    </div>
                  ))}
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Your document</CardTitle>
                    <CardDescription>
                      Downloads unlock only after payment success and generation completion. Links expire automatically.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-3">
                    {renderDownloadButton('Download PDF', outputFiles?.pdf?.signed_url)}
                    {renderDownloadButton('Download Word', outputFiles?.docx?.signed_url)}
                    {renderDownloadButton('Download Pitch Deck', outputFiles?.pptx?.signed_url)}
                    <Button variant="outline" disabled={isGenerating || !currentRequest} onClick={resetForRegeneration}>
                      Regenerate (new payment required)
                    </Button>
                  </CardContent>
                  <Separator />
                  <CardContent className="grid gap-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-4">
                      <span>Payment status: <strong>{currentRequest?.payment_status || 'pending'}</strong></span>
                      <span>Generation: <strong>{currentRequest?.generation_status || 'not_started'}</strong></span>
                      <span>Model: <strong>{outputFiles?.model_version || 'pending'}</strong></span>
                    </div>
                    {outputFiles?.receipt?.receipt_number ? (
                      <div className="flex flex-wrap gap-4 text-xs">
                        <span>Receipt #{outputFiles.receipt.receipt_number}</span>
                        <span>Amount: {outputFiles.receipt.amount} {outputFiles.receipt.currency}</span>
                        <span>Issued: {outputFiles.receipt.issued_at}</span>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previous paid documents</CardTitle>
            <CardDescription>Entitlements are locked to your account with expiring download URLs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid documents yet.</p>
            ) : (
              history.map(request => {
                const outputs = request.output_files as OutputFiles | undefined;
                const canDownload = request.payment_status === 'success' && request.generation_status === 'completed';
                return (
                  <div key={request.id} className="rounded border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold capitalize">{request.document_type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{request.amount} {request.currency} • {request.payment_status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={!canDownload || !outputs?.pdf?.signed_url} asChild>
                          <a href={(outputs?.pdf?.signed_url as string | undefined) || '#'} target="_blank" rel="noreferrer">Download</a>
                        </Button>
                        <Button size="sm" variant="ghost" disabled={isGenerating} onClick={() => { setCurrentRequest(request); setSelectedType(request.document_type); setActiveStep('payment'); }}>
                          Repurchase & regenerate
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security & entitlements</CardTitle>
            <CardDescription>Strict access control, fraud logging, and signed URLs only.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4" />
              Private storage: storage/private/documents/&lt;user_id&gt;/&lt;document_id&gt;/</div>
            <div className="flex items-center gap-2"><Shield className="h-4 w-4" />
              Downloads require payment_status=success & generation_status=completed</div>
            <div className="flex items-center gap-2"><Shield className="h-4 w-4" />
              Expiring signed URLs (5–30 minutes). No public links.</div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-lg font-semibold">Need a quick start?</p>
            <p className="text-sm text-muted-foreground">You can regenerate anytime by paying again. Upsell bundle: Business Plan + Pitch Deck for ZMW300.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link to="/resources">Browse resources</Link>
            </Button>
            <Button onClick={() => handleStartPayment('bundle')}>Buy both for ZMW300</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DocumentGenerators;
