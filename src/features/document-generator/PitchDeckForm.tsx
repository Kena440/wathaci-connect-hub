/**
 * Pitch Deck Form
 * Multi-step form for collecting pitch deck data
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  ArrowRight,
  Presentation,
  Lightbulb,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { documentGeneratorService, DOCUMENT_PRICES } from '@/lib/services/document-generator-service';
import { formatAmount } from '@/lib/payment-config';
import type { PitchDeckInput, FounderInfo, UseOfFunds, KeyMetric } from '@/@types/database';
import { AppLayout } from '@/components/AppLayout';
import { DocumentPaymentModal } from './DocumentPaymentModal';

const STEPS = [
  { id: 'intro', label: 'Introduction', icon: Presentation },
  { id: 'problem', label: 'Problem & Solution', icon: Lightbulb },
  { id: 'market', label: 'Market Opportunity', icon: TrendingUp },
  { id: 'business', label: 'Business Model', icon: Target },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'financials', label: 'Financials & Ask', icon: DollarSign },
];

export const PitchDeckForm = () => {
  const navigate = useNavigate();
  const { user, profile } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentRequestId, setDocumentRequestId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<PitchDeckInput>>({
    company_name: profile?.business_name || '',
    tagline: '',
    logo_url: '',
    problem_statement: '',
    solution_description: '',
    target_market: '',
    market_size: '',
    market_growth_rate: '',
    product_description: '',
    key_features: [],
    demo_url: '',
    revenue_streams: [],
    pricing_strategy: '',
    unit_economics: '',
    current_customers: undefined,
    revenue_to_date: undefined,
    key_metrics: [],
    testimonials: [],
    competitors: [],
    competitive_advantage: '',
    founders: [],
    advisors: [],
    funding_ask: undefined,
    use_of_funds: [],
    financial_projections: [],
    contact_email: user?.email || '',
    website_url: profile?.website_url || '',
    social_links: {},
  });

  // Autosave functionality
  const autoSave = useCallback(async () => {
    if (!documentRequestId || !user?.id) return;

    setSaving(true);
    const result = await documentGeneratorService.updateDocumentRequest(documentRequestId, formData);
    if (result.success) {
      setLastSaved(new Date());
    }
    setSaving(false);
  }, [documentRequestId, formData, user?.id]);

  // Autosave every 30 seconds
  useEffect(() => {
    if (documentRequestId) {
      const interval = setInterval(autoSave, 30000);
      return () => clearInterval(interval);
    }
  }, [autoSave, documentRequestId]);

  // Create document request on mount if not exists
  useEffect(() => {
    const createRequest = async () => {
      if (!user?.id || documentRequestId) return;

      const result = await documentGeneratorService.createDocumentRequest({
        userId: user.id,
        companyId: profile?.id || user.id,
        documentType: 'pitch_deck',
        inputData: formData as PitchDeckInput,
      });

      if (result.success && result.data) {
        setDocumentRequestId(result.data.id);
      } else {
        setError(result.error || 'Failed to create document request');
      }
    };

    createRequest();
  }, [user?.id, profile?.id, documentRequestId, formData]);

  const updateFormData = (field: keyof PitchDeckInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: keyof PitchDeckInput, value: string) => {
    const values = value.split('\n').filter((v) => v.trim());
    updateFormData(field, values);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      autoSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateClick = () => {
    autoSave();
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    if (documentRequestId) {
      navigate(`/document-generator/generating/${documentRequestId}`);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Introduction
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name || ''}
                onChange={(e) => updateFormData('company_name', e.target.value)}
                placeholder="Enter your company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">Tagline *</Label>
              <Input
                id="tagline"
                value={formData.tagline || ''}
                onChange={(e) => updateFormData('tagline', e.target.value)}
                placeholder="A memorable one-liner about your company"
              />
              <p className="text-xs text-muted-foreground">
                Example: "Airbnb for Zambian SMEs" or "Making finance accessible to all"
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL (Optional)</Label>
              <Input
                id="logo_url"
                value={formData.logo_url || ''}
                onChange={(e) => updateFormData('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => updateFormData('contact_email', e.target.value)}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  value={formData.website_url || ''}
                  onChange={(e) => updateFormData('website_url', e.target.value)}
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>
          </div>
        );

      case 1: // Problem & Solution
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="problem_statement">The Problem *</Label>
              <Textarea
                id="problem_statement"
                value={formData.problem_statement || ''}
                onChange={(e) => updateFormData('problem_statement', e.target.value)}
                placeholder="What problem are you solving? Be specific about the pain points..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Focus on the customer's pain point, not your solution yet.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="solution_description">Your Solution *</Label>
              <Textarea
                id="solution_description"
                value={formData.solution_description || ''}
                onChange={(e) => updateFormData('solution_description', e.target.value)}
                placeholder="How does your product/service solve this problem?"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_description">Product/Service Description *</Label>
              <Textarea
                id="product_description"
                value={formData.product_description || ''}
                onChange={(e) => updateFormData('product_description', e.target.value)}
                placeholder="Describe your product or service in more detail..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key_features">Key Features (one per line)</Label>
              <Textarea
                id="key_features"
                value={(formData.key_features || []).join('\n')}
                onChange={(e) => updateArrayField('key_features', e.target.value)}
                placeholder="What are the main features?&#10;Enter each feature on a new line..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo_url">Demo/Video URL (Optional)</Label>
              <Input
                id="demo_url"
                value={formData.demo_url || ''}
                onChange={(e) => updateFormData('demo_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        );

      case 2: // Market Opportunity
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="target_market">Target Market *</Label>
              <Textarea
                id="target_market"
                value={formData.target_market || ''}
                onChange={(e) => updateFormData('target_market', e.target.value)}
                placeholder="Who is your target customer? Be specific about demographics and characteristics..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="market_size">Total Addressable Market (TAM) *</Label>
                <Input
                  id="market_size"
                  value={formData.market_size || ''}
                  onChange={(e) => updateFormData('market_size', e.target.value)}
                  placeholder="e.g., ZMW 500 million"
                />
                <p className="text-xs text-muted-foreground">
                  The total market demand for your product/service
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="market_growth_rate">Market Growth Rate</Label>
                <Input
                  id="market_growth_rate"
                  value={formData.market_growth_rate || ''}
                  onChange={(e) => updateFormData('market_growth_rate', e.target.value)}
                  placeholder="e.g., 15% annually"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitors">Main Competitors (one per line)</Label>
              <Textarea
                id="competitors"
                value={(formData.competitors || []).join('\n')}
                onChange={(e) => updateArrayField('competitors', e.target.value)}
                placeholder="Who are your competitors?&#10;Enter each competitor on a new line..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitive_advantage">Your Competitive Advantage *</Label>
              <Textarea
                id="competitive_advantage"
                value={formData.competitive_advantage || ''}
                onChange={(e) => updateFormData('competitive_advantage', e.target.value)}
                placeholder="What makes you different and better than competitors?"
                rows={3}
              />
            </div>
          </div>
        );

      case 3: // Business Model
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="revenue_streams">Revenue Streams (one per line) *</Label>
              <Textarea
                id="revenue_streams"
                value={(formData.revenue_streams || []).join('\n')}
                onChange={(e) => updateArrayField('revenue_streams', e.target.value)}
                placeholder="How do you make money?&#10;Enter each revenue stream on a new line..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricing_strategy">Pricing Strategy</Label>
              <Textarea
                id="pricing_strategy"
                value={formData.pricing_strategy || ''}
                onChange={(e) => updateFormData('pricing_strategy', e.target.value)}
                placeholder="How do you price your product/service?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_economics">Unit Economics</Label>
              <Textarea
                id="unit_economics"
                value={formData.unit_economics || ''}
                onChange={(e) => updateFormData('unit_economics', e.target.value)}
                placeholder="Customer acquisition cost, lifetime value, margins..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_customers">Current Customers</Label>
                <Input
                  id="current_customers"
                  type="number"
                  value={formData.current_customers || ''}
                  onChange={(e) => updateFormData('current_customers', parseInt(e.target.value) || undefined)}
                  placeholder="Number of customers"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue_to_date">Revenue to Date (ZMW)</Label>
                <Input
                  id="revenue_to_date"
                  type="number"
                  value={formData.revenue_to_date || ''}
                  onChange={(e) => updateFormData('revenue_to_date', parseFloat(e.target.value) || undefined)}
                  placeholder="Total revenue earned"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonials">Customer Testimonials (one per line)</Label>
              <Textarea
                id="testimonials"
                value={(formData.testimonials || []).join('\n')}
                onChange={(e) => updateArrayField('testimonials', e.target.value)}
                placeholder="Add customer quotes or success stories...&#10;Enter each testimonial on a new line..."
                rows={3}
              />
            </div>
          </div>
        );

      case 4: // Team
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Founders *</Label>
              <p className="text-sm text-muted-foreground">
                Add your founding team members with their roles and brief bios.
              </p>
              {(formData.founders || []).map((founder, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      value={founder.name}
                      onChange={(e) => {
                        const updated = [...(formData.founders || [])];
                        updated[index] = { ...founder, name: e.target.value };
                        updateFormData('founders', updated);
                      }}
                      placeholder="Full Name"
                    />
                    <Input
                      value={founder.title}
                      onChange={(e) => {
                        const updated = [...(formData.founders || [])];
                        updated[index] = { ...founder, title: e.target.value };
                        updateFormData('founders', updated);
                      }}
                      placeholder="Title (e.g., CEO, CTO)"
                    />
                  </div>
                  <Textarea
                    value={founder.bio}
                    onChange={(e) => {
                      const updated = [...(formData.founders || [])];
                      updated[index] = { ...founder, bio: e.target.value };
                      updateFormData('founders', updated);
                    }}
                    placeholder="Brief bio highlighting relevant experience..."
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={founder.linkedin_url || ''}
                      onChange={(e) => {
                        const updated = [...(formData.founders || [])];
                        updated[index] = { ...founder, linkedin_url: e.target.value };
                        updateFormData('founders', updated);
                      }}
                      placeholder="LinkedIn URL (optional)"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const updated = (formData.founders || []).filter((_, i) => i !== index);
                        updateFormData('founders', updated);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const updated = [...(formData.founders || []), { name: '', title: '', bio: '' }];
                  updateFormData('founders', updated);
                }}
                className="mt-2"
              >
                Add Founder
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Advisors (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Add any advisors or board members.
              </p>
              {(formData.advisors || []).map((advisor, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                  <Input
                    value={advisor.name}
                    onChange={(e) => {
                      const updated = [...(formData.advisors || [])];
                      updated[index] = { ...advisor, name: e.target.value };
                      updateFormData('advisors', updated);
                    }}
                    placeholder="Name"
                  />
                  <Input
                    value={advisor.expertise}
                    onChange={(e) => {
                      const updated = [...(formData.advisors || [])];
                      updated[index] = { ...advisor, expertise: e.target.value };
                      updateFormData('advisors', updated);
                    }}
                    placeholder="Expertise"
                  />
                  <Input
                    value={advisor.company || ''}
                    onChange={(e) => {
                      const updated = [...(formData.advisors || [])];
                      updated[index] = { ...advisor, company: e.target.value };
                      updateFormData('advisors', updated);
                    }}
                    placeholder="Company"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = (formData.advisors || []).filter((_, i) => i !== index);
                      updateFormData('advisors', updated);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const updated = [...(formData.advisors || []), { name: '', expertise: '' }];
                  updateFormData('advisors', updated);
                }}
                className="mt-2"
              >
                Add Advisor
              </Button>
            </div>
          </div>
        );

      case 5: // Financials & Ask
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="funding_ask">Funding Ask (ZMW) *</Label>
              <Input
                id="funding_ask"
                type="number"
                value={formData.funding_ask || ''}
                onChange={(e) => updateFormData('funding_ask', parseFloat(e.target.value) || undefined)}
                placeholder="How much are you raising?"
              />
            </div>

            <div className="space-y-2">
              <Label>Use of Funds *</Label>
              <p className="text-sm text-muted-foreground">
                How will you allocate the funding? Add categories with percentages.
              </p>
              {(formData.use_of_funds || []).map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                  <Input
                    value={item.category}
                    onChange={(e) => {
                      const updated = [...(formData.use_of_funds || [])];
                      updated[index] = { ...item, category: e.target.value };
                      updateFormData('use_of_funds', updated);
                    }}
                    placeholder="Category (e.g., Product Development)"
                    className="md:col-span-2"
                  />
                  <Input
                    type="number"
                    value={item.percentage}
                    onChange={(e) => {
                      const updated = [...(formData.use_of_funds || [])];
                      updated[index] = { ...item, percentage: parseInt(e.target.value) || 0 };
                      updateFormData('use_of_funds', updated);
                    }}
                    placeholder="%"
                    min={0}
                    max={100}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = (formData.use_of_funds || []).filter((_, i) => i !== index);
                      updateFormData('use_of_funds', updated);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const updated = [...(formData.use_of_funds || []), { category: '', percentage: 0 }];
                  updateFormData('use_of_funds', updated);
                }}
                className="mt-2"
              >
                Add Category
              </Button>
              {(formData.use_of_funds || []).length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total:{' '}
                  <span
                    className={
                      (formData.use_of_funds || []).reduce((sum, item) => sum + item.percentage, 0) === 100
                        ? 'text-green-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {(formData.use_of_funds || []).reduce((sum, item) => sum + item.percentage, 0)}%
                  </span>
                  {' '}(should equal 100%)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Key Metrics (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Add important business metrics to showcase your traction.
              </p>
              {(formData.key_metrics || []).map((metric, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                  <Input
                    value={metric.name}
                    onChange={(e) => {
                      const updated = [...(formData.key_metrics || [])];
                      updated[index] = { ...metric, name: e.target.value };
                      updateFormData('key_metrics', updated);
                    }}
                    placeholder="Metric name (e.g., MRR)"
                  />
                  <Input
                    value={metric.value}
                    onChange={(e) => {
                      const updated = [...(formData.key_metrics || [])];
                      updated[index] = { ...metric, value: e.target.value };
                      updateFormData('key_metrics', updated);
                    }}
                    placeholder="Value"
                  />
                  <Input
                    value={metric.growth_rate || ''}
                    onChange={(e) => {
                      const updated = [...(formData.key_metrics || [])];
                      updated[index] = { ...metric, growth_rate: e.target.value };
                      updateFormData('key_metrics', updated);
                    }}
                    placeholder="Growth rate"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = (formData.key_metrics || []).filter((_, i) => i !== index);
                      updateFormData('key_metrics', updated);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const updated = [...(formData.key_metrics || []), { name: '', value: '' }];
                  updateFormData('key_metrics', updated);
                }}
                className="mt-2"
              >
                Add Metric
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/document-generator')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mb-2">Create AI Pitch Deck</h1>
          <p className="text-muted-foreground">
            Fill in your business details and we'll generate a professional investor pitch deck for you.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}
            </span>
            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Saved {lastSaved.toLocaleTimeString()}
                  </>
                )}
              </span>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={`flex flex-col items-center gap-1 p-2 rounded transition-colors ${
                    index === currentStep
                      ? 'text-blue-600'
                      : index < currentStep
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}
                >
                  <StepIcon className="h-5 w-5" />
                  <span className="text-xs hidden md:block">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const StepIcon = STEPS[currentStep].icon;
                return <StepIcon className="h-5 w-5" />;
              })()}
              {STEPS[currentStep].label}
            </CardTitle>
            <CardDescription>
              {currentStep === 0 && 'Start with your company basics and contact information.'}
              {currentStep === 1 && 'Clearly articulate the problem you solve and your solution.'}
              {currentStep === 2 && 'Show investors the market opportunity and your competitive position.'}
              {currentStep === 3 && 'Explain how you make money and your traction so far.'}
              {currentStep === 4 && "Introduce your team - investors invest in people."}
              {currentStep === 5 && 'State your funding ask and how you will use the investment.'}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderStepContent()}</CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleGenerateClick} className="bg-green-600 hover:bg-green-700">
              Generate Pitch Deck ({formatAmount(DOCUMENT_PRICES.pitch_deck)})
              <Presentation className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Payment Modal */}
        {documentRequestId && (
          <DocumentPaymentModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            documentRequestId={documentRequestId}
            documentType="pitch_deck"
            amount={DOCUMENT_PRICES.pitch_deck}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </AppLayout>
  );
};
