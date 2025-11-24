/**
 * Business Health Dashboard
 * 
 * Main dashboard component for viewing SME diagnostics results,
 * including scores, SWOT analysis, and recommendations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Shield, 
  Building2, 
  Globe, 
  Target, 
  Settings,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Download,
  RefreshCw,
  Lightbulb,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { AppLayout } from '@/components/AppLayout';
import { toast } from 'sonner';
import type { 
  DiagnosticsOutput, 
  DiagnosticsScores,
  Bottleneck,
  Recommendation,
} from '@/@types/diagnostics';
import { runDiagnosis } from '@/lib/diagnostics';
import { SWOTDisplay } from './SWOTDisplay';
import { ScoreCard } from './ScoreCard';
import { RecommendationsTimeline } from './RecommendationsTimeline';
import { PartnerRecommendations } from './PartnerRecommendations';

interface HealthBandConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const healthBandConfig: Record<string, HealthBandConfig> = {
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'Urgent attention needed',
  },
  developing: {
    label: 'Developing',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    description: 'Building foundations',
  },
  emerging: {
    label: 'Emerging',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'Growing potential',
  },
  established: {
    label: 'Established',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Solid business',
  },
  thriving: {
    label: 'Thriving',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'Excellence achieved',
  },
};

export const BusinessHealthDashboard = () => {
  const { user, profile } = useAppContext();
  const navigate = useNavigate();
  const [diagnostics, setDiagnostics] = useState<DiagnosticsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      // Create mock profile data for demonstration
      const mockProfile = {
        id: user?.id || '',
        email: user?.email || '',
        business_name: profile?.business_name || 'My Business',
        sector: profile?.industry_sector || 'retail',
        country: profile?.country || 'ZM',
        city: profile?.address || 'Lusaka',
        years_in_operation: 2,
        registration_status: profile?.registration_number ? 'company' : undefined,
        employee_count_fulltime: profile?.employee_count || 3,
        website_url: profile?.website_url,
        uses_accounting_software: true,
        has_board_of_directors: false,
        has_hr_policy: false,
        business_model: ['B2C'],
        revenue_model: ['product_sales'],
      } as any;

      const result = await runDiagnosis({
        profile: mockProfile,
        financial_data: undefined,
        documents: undefined,
        platform_behavior: undefined,
      });

      setDiagnostics(result);
    } catch (error) {
      console.error('Error loading diagnostics:', error);
      toast.error('Failed to load diagnostics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) {
      loadDiagnostics();
    }
  }, [user, profile, loadDiagnostics]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDiagnostics();
    setRefreshing(false);
    toast.success('Diagnostics refreshed!');
  };

  const handleDownloadPDF = () => {
    // PDF generation requires additional libraries (e.g., jsPDF, html2pdf)
    // For now, show a coming soon message
    toast.info('PDF export feature coming soon! We are working on generating beautiful PDF reports for your business health assessment.');
  };

  const getOverallScore = (scores: DiagnosticsScores): number => {
    const values = Object.values(scores);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-600 mb-4" />
              <p className="text-gray-600">Analyzing your business health...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!diagnostics) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Card>
            <CardHeader>
              <CardTitle>Business Health Check</CardTitle>
              <CardDescription>
                Complete your profile to get a comprehensive business health assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/profile-setup')} className="bg-orange-600 hover:bg-orange-700">
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const healthBand = healthBandConfig[diagnostics.overall_summary.health_band] || healthBandConfig.emerging;
  const overallScore = getOverallScore(diagnostics.scores);
  const urgentItems = diagnostics.bottlenecks.filter(b => b.severity === 'high' || b.severity === 'critical');

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Health Dashboard</h1>
            <p className="text-gray-600">
              Your comprehensive business health assessment and growth roadmap
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              className="gap-2"
              title="PDF export coming soon"
            >
              <Download className="w-4 h-4" />
              Download Report
              <Badge variant="secondary" className="ml-1 text-xs">Soon</Badge>
            </Button>
          </div>
        </div>

        {/* Overall Health Summary */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Health Band */}
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl ${healthBand.bgColor}`}>
                  <TrendingUp className={`w-8 h-8 ${healthBand.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Overall Health</p>
                  <p className={`text-2xl font-bold ${healthBand.color}`}>{healthBand.label}</p>
                  <p className="text-sm text-gray-600">{healthBand.description}</p>
                </div>
              </div>

              {/* Overall Score */}
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="#f97316"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${overallScore * 2.26} 226`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">
                    {overallScore}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Readiness Score</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {overallScore >= 70 ? 'Strong' : overallScore >= 50 ? 'Developing' : 'Needs Work'}
                  </p>
                </div>
              </div>

              {/* Urgent Items */}
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl ${urgentItems.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  {urgentItems.length > 0 ? (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Urgent Actions</p>
                  <p className="text-2xl font-bold text-gray-900">{urgentItems.length}</p>
                  <p className="text-sm text-gray-600">
                    {urgentItems.length > 0 ? 'items need attention' : 'all clear!'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Recommendations */}
        {diagnostics.overall_summary.urgent_gaps.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-lg">Recommended Focus Areas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {diagnostics.overall_summary.recommended_themes.map((theme, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-orange-100 text-orange-800">
                    {theme}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ScoreCard
            title="Funding Readiness"
            score={diagnostics.scores.funding_readiness}
            icon={TrendingUp}
            explanation={diagnostics.score_explanations.funding_readiness}
          />
          <ScoreCard
            title="Compliance Maturity"
            score={diagnostics.scores.compliance_maturity}
            icon={Shield}
            explanation={diagnostics.score_explanations.compliance_maturity}
          />
          <ScoreCard
            title="Governance Maturity"
            score={diagnostics.scores.governance_maturity}
            icon={Building2}
            explanation={diagnostics.score_explanations.governance_maturity}
          />
          <ScoreCard
            title="Digital Maturity"
            score={diagnostics.scores.digital_maturity}
            icon={Globe}
            explanation={diagnostics.score_explanations.digital_maturity}
          />
          <ScoreCard
            title="Market Readiness"
            score={diagnostics.scores.market_readiness}
            icon={Target}
            explanation={diagnostics.score_explanations.market_readiness}
          />
          <ScoreCard
            title="Operational Efficiency"
            score={diagnostics.scores.operational_efficiency}
            icon={Settings}
            explanation={diagnostics.score_explanations.operational_efficiency}
          />
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="swot" className="mb-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="swot">SWOT Analysis</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="partners">Find Support</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="swot" className="mt-6">
            <SWOTDisplay swot={diagnostics.swot_analysis} />
          </TabsContent>
          
          <TabsContent value="actions" className="mt-6">
            <RecommendationsTimeline 
              recommendations={diagnostics.recommendations}
              bottlenecks={diagnostics.bottlenecks}
            />
          </TabsContent>
          
          <TabsContent value="partners" className="mt-6">
            <PartnerRecommendations partners={diagnostics.recommended_partners} />
          </TabsContent>
          
          <TabsContent value="opportunities" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Suggested Opportunities</CardTitle>
                <CardDescription>
                  Opportunities matched to your business profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {diagnostics.suggested_opportunities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Complete more of your profile to unlock matched opportunities
                  </p>
                ) : (
                  <div className="space-y-4">
                    {diagnostics.suggested_opportunities.map((opp) => (
                      <div 
                        key={opp.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="capitalize">
                              {opp.type}
                            </Badge>
                            <span className="text-sm text-gray-500">{opp.provider}</span>
                          </div>
                          <h4 className="font-medium text-gray-900">{opp.title}</h4>
                          <p className="text-sm text-gray-600">{opp.description}</p>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Fit Score</p>
                            <p className="text-lg font-semibold text-orange-600">{opp.fit_score}%</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Narrative Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {diagnostics.overall_summary.headline}
            </p>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Key Strengths
                </h4>
                <ul className="space-y-1">
                  {diagnostics.overall_summary.key_strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Urgent Gaps
                </h4>
                <ul className="space-y-1">
                  {diagnostics.overall_summary.urgent_gaps.map((gap, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer with metadata */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Last updated: {new Date(diagnostics.meta.last_updated).toLocaleDateString()} |{' '}
            Data coverage: {diagnostics.meta.data_coverage_level} |{' '}
            Model version: {diagnostics.meta.model_version}
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default BusinessHealthDashboard;
