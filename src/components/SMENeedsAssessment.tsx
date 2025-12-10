import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp,
  Users,
  Target,
  Shield,
  FileText,
  Brain,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';

// Assessment form validation schema
const assessmentSchema = z.object({
  // Financial Health
  monthly_revenue: z.number().min(0, 'Revenue must be positive'),
  monthly_expenses: z.number().min(0, 'Expenses must be positive'),
  cash_flow_positive: z.boolean(),
  debt_obligations: z.number().min(0, 'Debt must be positive'),
  financial_records_organized: z.boolean(),
  
  // Operations & Technology
  key_operational_challenges: z.array(z.string()).min(1, 'Select at least one challenge'),
  technology_gaps: z.array(z.string()),
  automation_level: z.enum(['manual', 'partially_automated', 'fully_automated']),
  
  // Market & Customers
  target_market_clarity: z.number().min(1).max(5),
  customer_acquisition_challenges: z.array(z.string()),
  competitive_position: z.enum(['weak', 'average', 'strong']),
  
  // Compliance & Legal
  regulatory_compliance_status: z.enum(['non_compliant', 'partially_compliant', 'fully_compliant']),
  legal_structure_optimized: z.boolean(),
  intellectual_property_protected: z.boolean(),
  
  // Strategic Planning
  growth_strategy_defined: z.boolean(),
  funding_amount: z.number().min(0),
  funding_purpose: z.string().min(1, 'Please specify funding purpose'),
  funding_timeline: z.string().min(1, 'Please specify timeline'),
  key_performance_metrics_tracked: z.boolean(),
  
  // Professional Support
  immediate_support_areas: z.array(z.string()),
  budget_for_professional_services: z.number().min(0),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

interface SMENeedsAssessmentProps {
  onComplete: (results: any) => void;
  onSkip?: () => void;
}

export const SMENeedsAssessment = ({ onComplete, onSkip }: SMENeedsAssessmentProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [selectedTechGaps, setSelectedTechGaps] = useState<string[]>([]);
  const [selectedCustomerChallenges, setSelectedCustomerChallenges] = useState<string[]>([]);
  const [selectedSupportAreas, setSelectedSupportAreas] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { user } = useAppContext();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    mode: 'onChange',
  });

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const operationalChallenges = [
    'Inventory Management',
    'Supply Chain Issues',
    'Quality Control',
    'Staff Training',
    'Process Documentation',
    'Equipment Maintenance',
    'Customer Service',
    'Delivery/Logistics'
  ];

  const technologyGaps = [
    'Digital Marketing',
    'E-commerce Platform',
    'Inventory Management System',
    'Customer Relationship Management (CRM)',
    'Accounting Software',
    'Point of Sale (POS) System',
    'Data Analytics',
    'Cybersecurity',
    'Cloud Storage',
    'Mobile App'
  ];

  const customerChallenges = [
    'Lead Generation',
    'Customer Retention',
    'Pricing Strategy',
    'Brand Awareness',
    'Market Research',
    'Customer Feedback',
    'Digital Presence',
    'Sales Process'
  ];

  const supportAreas = [
    'Business Strategy',
    'Financial Management',
    'Marketing & Sales',
    'Operations Management',
    'Legal & Compliance',
    'Technology Implementation',
    'Human Resources',
    'Export/International Trade'
  ];

  const handleNext = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateAssessmentScore = (data: AssessmentFormData): number => {
    let score = 0;
    const maxScore = 100;

    // Financial health (25 points)
    if (data.cash_flow_positive) score += 8;
    if (data.financial_records_organized) score += 7;
    if (data.monthly_revenue > data.monthly_expenses) score += 5;
    if (data.debt_obligations < data.monthly_revenue) score += 5;

    // Operations & Technology (20 points)
    if (data.automation_level === 'fully_automated') score += 10;
    else if (data.automation_level === 'partially_automated') score += 6;
    else score += 2;
    
    score += Math.max(0, 10 - data.key_operational_challenges.length * 2);

    // Market & Strategy (25 points)
    score += data.target_market_clarity * 3;
    if (data.competitive_position === 'strong') score += 8;
    else if (data.competitive_position === 'average') score += 5;
    else score += 2;
    
    score += Math.max(0, 4 - data.customer_acquisition_challenges.length);

    // Compliance & Legal (15 points)
    if (data.regulatory_compliance_status === 'fully_compliant') score += 7;
    else if (data.regulatory_compliance_status === 'partially_compliant') score += 4;
    else score += 1;
    
    if (data.legal_structure_optimized) score += 4;
    if (data.intellectual_property_protected) score += 4;

    // Strategic Planning (15 points)
    if (data.growth_strategy_defined) score += 8;
    if (data.key_performance_metrics_tracked) score += 7;

    return Math.min(score, maxScore);
  };

  const identifyGaps = (data: AssessmentFormData): string[] => {
    const gaps: string[] = [];

    // Financial gaps
    if (!data.cash_flow_positive) gaps.push('Cash Flow Management');
    if (!data.financial_records_organized) gaps.push('Financial Record Keeping');
    if (data.monthly_expenses >= data.monthly_revenue) gaps.push('Cost Management');

    // Operational gaps
    if (data.automation_level === 'manual') gaps.push('Process Automation');
    if (data.key_operational_challenges.length > 3) gaps.push('Operational Efficiency');

    // Market gaps
    if (data.target_market_clarity < 3) gaps.push('Market Research & Analysis');
    if (data.competitive_position === 'weak') gaps.push('Competitive Strategy');
    if (data.customer_acquisition_challenges.length > 2) gaps.push('Customer Acquisition');

    // Compliance gaps
    if (data.regulatory_compliance_status !== 'fully_compliant') gaps.push('Regulatory Compliance');
    if (!data.legal_structure_optimized) gaps.push('Legal Structure Optimization');

    // Strategic gaps
    if (!data.growth_strategy_defined) gaps.push('Strategic Planning');
    if (!data.key_performance_metrics_tracked) gaps.push('Performance Measurement');

    return gaps;
  };

  const onSubmit = async (data: AssessmentFormData) => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Calculate assessment score and identify gaps
      const overallScore = calculateAssessmentScore(data);
      const identifiedGaps = identifyGaps(data);
      
      // Prepare assessment data for database
      const assessmentData = {
        user_id: user.id,
        monthly_revenue: data.monthly_revenue,
        monthly_expenses: data.monthly_expenses,
        cash_flow_positive: data.cash_flow_positive,
        debt_obligations: data.debt_obligations,
        financial_records_organized: data.financial_records_organized,
        key_operational_challenges: data.key_operational_challenges,
        technology_gaps: data.technology_gaps,
        automation_level: data.automation_level,
        target_market_clarity: data.target_market_clarity,
        customer_acquisition_challenges: data.customer_acquisition_challenges,
        competitive_position: data.competitive_position,
        regulatory_compliance_status: data.regulatory_compliance_status,
        legal_structure_optimized: data.legal_structure_optimized,
        intellectual_property_protected: data.intellectual_property_protected,
        growth_strategy_defined: data.growth_strategy_defined,
        funding_requirements: {
          amount: data.funding_amount,
          purpose: data.funding_purpose,
          timeline: data.funding_timeline
        },
        key_performance_metrics_tracked: data.key_performance_metrics_tracked,
        immediate_support_areas: data.immediate_support_areas,
        budget_for_professional_services: data.budget_for_professional_services,
        overall_score: overallScore,
        identified_gaps: identifiedGaps,
        priority_areas: identifiedGaps.slice(0, 3), // Top 3 priority areas
        completed_at: new Date().toISOString(),
      };

      // Save to database
      const { data: savedAssessment, error } = await supabase
        .from('sme_needs_assessments')
        .insert([assessmentData])
        .select()
        .single();

      if (error) throw error;

      // Get AI recommendations for professionals
      const recommendationResponse = await supabase.functions.invoke('sme-assessment-recommendations', {
        body: { 
          assessmentId: savedAssessment.id,
          gaps: identifiedGaps,
          supportAreas: data.immediate_support_areas,
          budget: data.budget_for_professional_services
        }
      });

      if (recommendationResponse.error) {
        console.error('Failed to get AI recommendations:', recommendationResponse.error);
      }

      toast({
        title: "Assessment Complete!",
        description: `Your business health score is ${overallScore}%. View your personalized recommendations.`,
      });

      onComplete({
        assessment: savedAssessment,
        recommendations: recommendationResponse.data?.recommendations || []
      });

    } catch (error: any) {
      console.error('Assessment submission error:', error);
      toast({
        title: "Error",
        description: "Failed to complete assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (value: string, selected: string[], setter: (arr: string[]) => void, formField: keyof AssessmentFormData) => {
    const updated = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    setter(updated);
    setValue(formField as any, updated);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <DollarSign className="w-12 h-12 mx-auto text-green-600 mb-3" />
              <h3 className="text-xl font-semibold">Financial Health</h3>
              <p className="text-gray-600">Let's understand your current financial position</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_revenue">Monthly Revenue (ZMW)</Label>
                <Input
                  id="monthly_revenue"
                  type="number"
                  {...register('monthly_revenue', { valueAsNumber: true })}
                  placeholder="50000"
                />
                {errors.monthly_revenue && (
                  <p className="text-sm text-red-600 mt-1">{errors.monthly_revenue.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="monthly_expenses">Monthly Expenses (ZMW)</Label>
                <Input
                  id="monthly_expenses"
                  type="number"
                  {...register('monthly_expenses', { valueAsNumber: true })}
                  placeholder="40000"
                />
                {errors.monthly_expenses && (
                  <p className="text-sm text-red-600 mt-1">{errors.monthly_expenses.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="debt_obligations">Total Debt Obligations (ZMW)</Label>
                <Input
                  id="debt_obligations"
                  type="number"
                  {...register('debt_obligations', { valueAsNumber: true })}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cash_flow_positive"
                  {...register('cash_flow_positive')}
                  onCheckedChange={(checked) => setValue('cash_flow_positive', !!checked)}
                />
                <Label htmlFor="cash_flow_positive">My business has positive cash flow</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="financial_records_organized"
                  {...register('financial_records_organized')}
                  onCheckedChange={(checked) => setValue('financial_records_organized', !!checked)}
                />
                <Label htmlFor="financial_records_organized">I maintain organized financial records</Label>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Target className="w-12 h-12 mx-auto text-blue-600 mb-3" />
              <h3 className="text-xl font-semibold">Operations & Technology</h3>
              <p className="text-gray-600">Help us understand your operational challenges</p>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Key Operational Challenges (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {operationalChallenges.map((challenge) => (
                  <div key={challenge} className="flex items-center space-x-2">
                    <Checkbox
                      id={challenge}
                      checked={selectedChallenges.includes(challenge)}
                      onCheckedChange={() => handleCheckboxChange(challenge, selectedChallenges, setSelectedChallenges, 'key_operational_challenges')}
                    />
                    <Label htmlFor={challenge} className="text-sm">{challenge}</Label>
                  </div>
                ))}
              </div>
              {errors.key_operational_challenges && (
                <p className="text-sm text-red-600 mt-2">{errors.key_operational_challenges.message}</p>
              )}
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Technology Gaps (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {technologyGaps.map((gap) => (
                  <div key={gap} className="flex items-center space-x-2">
                    <Checkbox
                      id={gap}
                      checked={selectedTechGaps.includes(gap)}
                      onCheckedChange={() => handleCheckboxChange(gap, selectedTechGaps, setSelectedTechGaps, 'technology_gaps')}
                    />
                    <Label htmlFor={gap} className="text-sm">{gap}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Current Automation Level</Label>
              <RadioGroup
                onValueChange={(value) => setValue('automation_level', value as any)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual">Manual - Most processes are done manually</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partially_automated" id="partially_automated" />
                  <Label htmlFor="partially_automated">Partially Automated - Some digital tools in use</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fully_automated" id="fully_automated" />
                  <Label htmlFor="fully_automated">Fully Automated - Most processes are digitized</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Users className="w-12 h-12 mx-auto text-purple-600 mb-3" />
              <h3 className="text-xl font-semibold">Market & Customers</h3>
              <p className="text-gray-600">Tell us about your market position</p>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">
                How clear is your understanding of your target market? (1 = Very unclear, 5 = Crystal clear)
              </Label>
              <RadioGroup
                onValueChange={(value) => setValue('target_market_clarity', parseInt(value))}
                className="flex space-x-6"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <RadioGroupItem value={rating.toString()} id={`clarity-${rating}`} />
                    <Label htmlFor={`clarity-${rating}`}>{rating}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Customer Acquisition Challenges</Label>
              <div className="grid grid-cols-2 gap-3">
                {customerChallenges.map((challenge) => (
                  <div key={challenge} className="flex items-center space-x-2">
                    <Checkbox
                      id={challenge}
                      checked={selectedCustomerChallenges.includes(challenge)}
                      onCheckedChange={() => handleCheckboxChange(challenge, selectedCustomerChallenges, setSelectedCustomerChallenges, 'customer_acquisition_challenges')}
                    />
                    <Label htmlFor={challenge} className="text-sm">{challenge}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Competitive Position</Label>
              <RadioGroup
                onValueChange={(value) => setValue('competitive_position', value as any)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weak" id="weak" />
                  <Label htmlFor="weak">Weak - Struggling to compete</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="average" id="average" />
                  <Label htmlFor="average">Average - Holding our own</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="strong" id="strong" />
                  <Label htmlFor="strong">Strong - Leading in our market</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 mx-auto text-red-600 mb-3" />
              <h3 className="text-xl font-semibold">Compliance & Legal</h3>
              <p className="text-gray-600">Ensure your business is properly protected</p>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Regulatory Compliance Status</Label>
              <RadioGroup
                onValueChange={(value) => setValue('regulatory_compliance_status', value as any)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="non_compliant" id="non_compliant" />
                  <Label htmlFor="non_compliant">Non-compliant - Need to address compliance issues</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partially_compliant" id="partially_compliant" />
                  <Label htmlFor="partially_compliant">Partially compliant - Some areas need attention</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fully_compliant" id="fully_compliant" />
                  <Label htmlFor="fully_compliant">Fully compliant - All regulatory requirements met</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="legal_structure_optimized"
                  {...register('legal_structure_optimized')}
                  onCheckedChange={(checked) => setValue('legal_structure_optimized', !!checked)}
                />
                <Label htmlFor="legal_structure_optimized">My business legal structure is optimized for my needs</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="intellectual_property_protected"
                  {...register('intellectual_property_protected')}
                  onCheckedChange={(checked) => setValue('intellectual_property_protected', !!checked)}
                />
                <Label htmlFor="intellectual_property_protected">My intellectual property is properly protected</Label>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <TrendingUp className="w-12 h-12 mx-auto text-orange-600 mb-3" />
              <h3 className="text-xl font-semibold">Strategic Planning & Funding</h3>
              <p className="text-gray-600">Plan for your business growth</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="funding_amount">Funding Needed (ZMW)</Label>
                <Input
                  id="funding_amount"
                  type="number"
                  {...register('funding_amount', { valueAsNumber: true })}
                  placeholder="200000"
                />
              </div>

              <div>
                <Label htmlFor="funding_timeline">Funding Timeline</Label>
                <Select onValueChange={(value) => setValue('funding_timeline', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediately</SelectItem>
                    <SelectItem value="1-3months">1-3 months</SelectItem>
                    <SelectItem value="3-6months">3-6 months</SelectItem>
                    <SelectItem value="6months+">6+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="funding_purpose">Funding Purpose</Label>
              <Textarea
                id="funding_purpose"
                {...register('funding_purpose')}
                placeholder="Describe what you'll use the funding for..."
                rows={3}
              />
              {errors.funding_purpose && (
                <p className="text-sm text-red-600 mt-1">{errors.funding_purpose.message}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="growth_strategy_defined"
                  {...register('growth_strategy_defined')}
                  onCheckedChange={(checked) => setValue('growth_strategy_defined', !!checked)}
                />
                <Label htmlFor="growth_strategy_defined">I have a clear growth strategy defined</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="key_performance_metrics_tracked"
                  {...register('key_performance_metrics_tracked')}
                  onCheckedChange={(checked) => setValue('key_performance_metrics_tracked', !!checked)}
                />
                <Label htmlFor="key_performance_metrics_tracked">I track key performance metrics regularly</Label>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Brain className="w-12 h-12 mx-auto text-indigo-600 mb-3" />
              <h3 className="text-xl font-semibold">Professional Support Needs</h3>
              <p className="text-gray-600">Identify areas where you need expert help</p>
            </div>

            <div>
              <Label className="text-base font-medium mb-3 block">Immediate Support Areas (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {supportAreas.map((area) => (
                  <div key={area} className="flex items-center space-x-2">
                    <Checkbox
                      id={area}
                      checked={selectedSupportAreas.includes(area)}
                      onCheckedChange={() => handleCheckboxChange(area, selectedSupportAreas, setSelectedSupportAreas, 'immediate_support_areas')}
                    />
                    <Label htmlFor={area} className="text-sm">{area}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="budget_for_professional_services">Monthly Budget for Professional Services (ZMW)</Label>
              <Input
                id="budget_for_professional_services"
                type="number"
                {...register('budget_for_professional_services', { valueAsNumber: true })}
                placeholder="5000"
              />
              <p className="text-sm text-gray-500 mt-1">
                This helps us recommend professionals within your budget
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">SME Business Needs Assessment</CardTitle>
              <CardDescription>
                Help us understand your business needs to provide personalized recommendations
              </CardDescription>
            </div>
            {onSkip && (
              <Button variant="ghost" onClick={onSkip}>
                Skip for now
              </Button>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {renderStepContent()}

            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                {currentStep < totalSteps ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Completing Assessment...' : 'Complete Assessment'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};