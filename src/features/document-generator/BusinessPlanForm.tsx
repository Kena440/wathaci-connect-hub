/**
 * Business Plan Form
 * Multi-step form for collecting business plan data
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  FileText,
  Building,
  Users,
  TrendingUp,
  Target,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { documentGeneratorService, DOCUMENT_PRICES } from '@/lib/services/document-generator-service';
import { formatAmount } from '@/lib/payment-config';
import type { BusinessPlanInput, TeamMember, Milestone } from '@/@types/database';
import { AppLayout } from '@/components/AppLayout';
import { DocumentPaymentModal } from './DocumentPaymentModal';

const STEPS = [
  { id: 'executive', label: 'Executive Summary', icon: FileText },
  { id: 'business', label: 'Business Details', icon: Building },
  { id: 'market', label: 'Market Analysis', icon: TrendingUp },
  { id: 'financials', label: 'Financials', icon: DollarSign },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'goals', label: 'Goals & Strategy', icon: Target },
];

const INDUSTRY_SECTORS = [
  'Agriculture & Agribusiness',
  'Construction & Real Estate',
  'Education & Training',
  'Energy & Mining',
  'Financial Services',
  'Healthcare',
  'Hospitality & Tourism',
  'Manufacturing',
  'Retail & E-commerce',
  'Technology & IT',
  'Transportation & Logistics',
  'Other',
];

const BUSINESS_MODELS = [
  'B2B (Business to Business)',
  'B2C (Business to Consumer)',
  'B2B2C (Business to Business to Consumer)',
  'Marketplace',
  'Subscription',
  'Freemium',
  'E-commerce',
  'Service-based',
  'Other',
];

const LEGAL_STRUCTURES = [
  'Sole Proprietorship',
  'Partnership',
  'Limited Liability Company (LLC)',
  'Corporation',
  'Cooperative',
  'Non-profit Organization',
  'Other',
];

export const BusinessPlanForm = () => {
  const navigate = useNavigate();
  const { user, profile } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentRequestId, setDocumentRequestId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<BusinessPlanInput>>({
    business_name: profile?.business_name || '',
    business_description: '',
    mission_statement: '',
    vision_statement: '',
    value_proposition: '',
    industry_sector: profile?.industry_sector || '',
    business_model: '',
    legal_structure: '',
    registration_number: profile?.registration_number || '',
    year_established: undefined,
    location: profile?.country || 'Zambia',
    products_services: '',
    unique_selling_points: [],
    competitive_advantages: [],
    target_market: '',
    market_size_estimate: '',
    market_trends: '',
    competitor_analysis: '',
    current_revenue: undefined,
    projected_revenue_year1: undefined,
    projected_revenue_year2: undefined,
    projected_revenue_year3: undefined,
    startup_costs: undefined,
    operating_expenses: undefined,
    funding_required: undefined,
    funding_purpose: '',
    team_members: [],
    key_positions_to_fill: [],
    short_term_goals: [],
    long_term_goals: [],
    milestones: [],
    swot_analysis: {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    },
    risk_factors: [],
    exit_strategy: '',
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
        documentType: 'business_plan',
        inputData: formData as BusinessPlanInput,
      });

      if (result.success && result.data) {
        setDocumentRequestId(result.data.id);
      } else {
        setError(result.error || 'Failed to create document request');
      }
    };

    createRequest();
  }, [user?.id, profile?.id, documentRequestId, formData]);

  const updateFormData = (field: keyof BusinessPlanInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field: keyof BusinessPlanInput, value: string) => {
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
      case 0: // Executive Summary
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={formData.business_name || ''}
                onChange={(e) => updateFormData('business_name', e.target.value)}
                placeholder="Enter your business name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_description">Business Description *</Label>
              <Textarea
                id="business_description"
                value={formData.business_description || ''}
                onChange={(e) => updateFormData('business_description', e.target.value)}
                placeholder="Describe what your business does, who it serves, and its key activities..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value_proposition">Value Proposition *</Label>
              <Textarea
                id="value_proposition"
                value={formData.value_proposition || ''}
                onChange={(e) => updateFormData('value_proposition', e.target.value)}
                placeholder="What unique value does your business provide to customers?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mission_statement">Mission Statement</Label>
                <Textarea
                  id="mission_statement"
                  value={formData.mission_statement || ''}
                  onChange={(e) => updateFormData('mission_statement', e.target.value)}
                  placeholder="Your company's purpose..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vision_statement">Vision Statement</Label>
                <Textarea
                  id="vision_statement"
                  value={formData.vision_statement || ''}
                  onChange={(e) => updateFormData('vision_statement', e.target.value)}
                  placeholder="Where you see your company in the future..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 1: // Business Details
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry_sector">Industry Sector *</Label>
                <Select
                  value={formData.industry_sector || ''}
                  onValueChange={(value) => updateFormData('industry_sector', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_SECTORS.map((sector) => (
                      <SelectItem key={sector} value={sector}>
                        {sector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_model">Business Model *</Label>
                <Select
                  value={formData.business_model || ''}
                  onValueChange={(value) => updateFormData('business_model', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business model" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_MODELS.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legal_structure">Legal Structure *</Label>
                <Select
                  value={formData.legal_structure || ''}
                  onValueChange={(value) => updateFormData('legal_structure', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select legal structure" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_STRUCTURES.map((structure) => (
                      <SelectItem key={structure} value={structure}>
                        {structure}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number || ''}
                  onChange={(e) => updateFormData('registration_number', e.target.value)}
                  placeholder="PACRA registration number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year_established">Year Established</Label>
                <Input
                  id="year_established"
                  type="number"
                  value={formData.year_established || ''}
                  onChange={(e) => updateFormData('year_established', parseInt(e.target.value) || undefined)}
                  placeholder="e.g., 2020"
                  min={1900}
                  max={new Date().getFullYear()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="products_services">Products/Services *</Label>
              <Textarea
                id="products_services"
                value={formData.products_services || ''}
                onChange={(e) => updateFormData('products_services', e.target.value)}
                placeholder="Describe your main products or services in detail..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unique_selling_points">Unique Selling Points (one per line)</Label>
              <Textarea
                id="unique_selling_points"
                value={(formData.unique_selling_points || []).join('\n')}
                onChange={(e) => updateArrayField('unique_selling_points', e.target.value)}
                placeholder="What makes your business unique?&#10;Enter each point on a new line..."
                rows={3}
              />
            </div>
          </div>
        );

      case 2: // Market Analysis
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="target_market">Target Market *</Label>
              <Textarea
                id="target_market"
                value={formData.target_market || ''}
                onChange={(e) => updateFormData('target_market', e.target.value)}
                placeholder="Who are your ideal customers? Describe demographics, behaviors, needs..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="market_size_estimate">Market Size Estimate</Label>
                <Input
                  id="market_size_estimate"
                  value={formData.market_size_estimate || ''}
                  onChange={(e) => updateFormData('market_size_estimate', e.target.value)}
                  placeholder="e.g., ZMW 50 million annually"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="market_trends">Market Trends</Label>
                <Input
                  id="market_trends"
                  value={formData.market_trends || ''}
                  onChange={(e) => updateFormData('market_trends', e.target.value)}
                  placeholder="Key trends affecting your market"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor_analysis">Competitor Analysis</Label>
              <Textarea
                id="competitor_analysis"
                value={formData.competitor_analysis || ''}
                onChange={(e) => updateFormData('competitor_analysis', e.target.value)}
                placeholder="Who are your main competitors? What are their strengths and weaknesses?"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitive_advantages">Competitive Advantages (one per line)</Label>
              <Textarea
                id="competitive_advantages"
                value={(formData.competitive_advantages || []).join('\n')}
                onChange={(e) => updateArrayField('competitive_advantages', e.target.value)}
                placeholder="How do you differentiate from competitors?&#10;Enter each advantage on a new line..."
                rows={3}
              />
            </div>
          </div>
        );

      case 3: // Financials
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_revenue">Current Annual Revenue (ZMW)</Label>
                <Input
                  id="current_revenue"
                  type="number"
                  value={formData.current_revenue || ''}
                  onChange={(e) => updateFormData('current_revenue', parseFloat(e.target.value) || undefined)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="operating_expenses">Monthly Operating Expenses (ZMW)</Label>
                <Input
                  id="operating_expenses"
                  type="number"
                  value={formData.operating_expenses || ''}
                  onChange={(e) => updateFormData('operating_expenses', parseFloat(e.target.value) || undefined)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projected_revenue_year1">Projected Revenue Year 1</Label>
                <Input
                  id="projected_revenue_year1"
                  type="number"
                  value={formData.projected_revenue_year1 || ''}
                  onChange={(e) => updateFormData('projected_revenue_year1', parseFloat(e.target.value) || undefined)}
                  placeholder="ZMW"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projected_revenue_year2">Projected Revenue Year 2</Label>
                <Input
                  id="projected_revenue_year2"
                  type="number"
                  value={formData.projected_revenue_year2 || ''}
                  onChange={(e) => updateFormData('projected_revenue_year2', parseFloat(e.target.value) || undefined)}
                  placeholder="ZMW"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projected_revenue_year3">Projected Revenue Year 3</Label>
                <Input
                  id="projected_revenue_year3"
                  type="number"
                  value={formData.projected_revenue_year3 || ''}
                  onChange={(e) => updateFormData('projected_revenue_year3', parseFloat(e.target.value) || undefined)}
                  placeholder="ZMW"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startup_costs">Startup Costs (ZMW)</Label>
                <Input
                  id="startup_costs"
                  type="number"
                  value={formData.startup_costs || ''}
                  onChange={(e) => updateFormData('startup_costs', parseFloat(e.target.value) || undefined)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="funding_required">Funding Required (ZMW)</Label>
                <Input
                  id="funding_required"
                  type="number"
                  value={formData.funding_required || ''}
                  onChange={(e) => updateFormData('funding_required', parseFloat(e.target.value) || undefined)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="funding_purpose">Funding Purpose</Label>
              <Textarea
                id="funding_purpose"
                value={formData.funding_purpose || ''}
                onChange={(e) => updateFormData('funding_purpose', e.target.value)}
                placeholder="How will you use the funding?"
                rows={3}
              />
            </div>
          </div>
        );

      case 4: // Team
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Team Members</Label>
              <p className="text-sm text-muted-foreground">
                Add key team members. Enter each member's name and role.
              </p>
              {(formData.team_members || []).map((member, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  <Input
                    value={member.name}
                    onChange={(e) => {
                      const updated = [...(formData.team_members || [])];
                      updated[index] = { ...member, name: e.target.value };
                      updateFormData('team_members', updated);
                    }}
                    placeholder="Name"
                  />
                  <Input
                    value={member.role}
                    onChange={(e) => {
                      const updated = [...(formData.team_members || [])];
                      updated[index] = { ...member, role: e.target.value };
                      updateFormData('team_members', updated);
                    }}
                    placeholder="Role"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const updated = (formData.team_members || []).filter((_, i) => i !== index);
                      updateFormData('team_members', updated);
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
                  const updated = [...(formData.team_members || []), { name: '', role: '' }];
                  updateFormData('team_members', updated);
                }}
                className="mt-2"
              >
                Add Team Member
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="key_positions_to_fill">Key Positions to Fill (one per line)</Label>
              <Textarea
                id="key_positions_to_fill"
                value={(formData.key_positions_to_fill || []).join('\n')}
                onChange={(e) => updateArrayField('key_positions_to_fill', e.target.value)}
                placeholder="What positions do you need to hire for?&#10;Enter each position on a new line..."
                rows={3}
              />
            </div>
          </div>
        );

      case 5: // Goals & Strategy
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="short_term_goals">Short-term Goals (1 year, one per line)</Label>
              <Textarea
                id="short_term_goals"
                value={(formData.short_term_goals || []).join('\n')}
                onChange={(e) => updateArrayField('short_term_goals', e.target.value)}
                placeholder="What do you want to achieve in the next year?&#10;Enter each goal on a new line..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="long_term_goals">Long-term Goals (3-5 years, one per line)</Label>
              <Textarea
                id="long_term_goals"
                value={(formData.long_term_goals || []).join('\n')}
                onChange={(e) => updateArrayField('long_term_goals', e.target.value)}
                placeholder="Where do you see your business in 3-5 years?&#10;Enter each goal on a new line..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="risk_factors">Risk Factors (one per line)</Label>
              <Textarea
                id="risk_factors"
                value={(formData.risk_factors || []).join('\n')}
                onChange={(e) => updateArrayField('risk_factors', e.target.value)}
                placeholder="What are the main risks to your business?&#10;Enter each risk on a new line..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_strategy">Exit Strategy (Optional)</Label>
              <Textarea
                id="exit_strategy"
                value={formData.exit_strategy || ''}
                onChange={(e) => updateFormData('exit_strategy', e.target.value)}
                placeholder="What is your long-term exit strategy?"
                rows={2}
              />
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
          <h1 className="text-3xl font-bold mb-2">Create AI Business Plan</h1>
          <p className="text-muted-foreground">
            Fill in your business details and we'll generate a professional business plan for you.
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
              {currentStep === 0 && 'Provide a high-level overview of your business.'}
              {currentStep === 1 && 'Tell us more about your business structure and offerings.'}
              {currentStep === 2 && 'Describe your target market and competitive landscape.'}
              {currentStep === 3 && 'Share your financial information and projections.'}
              {currentStep === 4 && 'Introduce your team and key personnel.'}
              {currentStep === 5 && 'Define your goals, strategy, and exit plan.'}
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
              Generate Business Plan ({formatAmount(DOCUMENT_PRICES.business_plan)})
              <FileText className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Payment Modal */}
        {documentRequestId && (
          <DocumentPaymentModal
            open={showPaymentModal}
            onOpenChange={setShowPaymentModal}
            documentRequestId={documentRequestId}
            documentType="business_plan"
            amount={DOCUMENT_PRICES.business_plan}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </AppLayout>
  );
};
