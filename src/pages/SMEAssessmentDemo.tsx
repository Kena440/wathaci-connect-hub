import { useState } from 'react';
import { SMENeedsAssessment } from '@/components/SMENeedsAssessment';
import { AssessmentResults } from '@/components/AssessmentResults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle, TrendingUp, InfoIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Mock data for demo purposes
const mockAssessmentResults = {
  assessment: {
    id: 'demo-assessment-123',
    user_id: 'demo-user',
    monthly_revenue: 50000,
    monthly_expenses: 35000,
    cash_flow_positive: true,
    debt_obligations: 100000,
    financial_records_organized: true,
    key_operational_challenges: ['Inventory Management', 'Staff Training'],
    technology_gaps: ['CRM System', 'Accounting Software'],
    automation_level: 'partially_automated',
    target_market_clarity: 4,
    customer_acquisition_challenges: ['Lead Generation', 'Digital Presence'],
    competitive_position: 'average',
    regulatory_compliance_status: 'partially_compliant',
    legal_structure_optimized: true,
    intellectual_property_protected: false,
    growth_strategy_defined: true,
    funding_requirements: {
      amount: 200000,
      purpose: 'Expand operations and improve technology infrastructure',
      timeline: '3-6months'
    },
    key_performance_metrics_tracked: false,
    immediate_support_areas: ['Business Strategy', 'Technology Implementation', 'Marketing & Sales'],
    budget_for_professional_services: 8000,
    overall_score: 72,
    identified_gaps: [
      'Performance Measurement',
      'Technology Infrastructure',
      'Intellectual Property Protection',
      'Regulatory Compliance'
    ],
    priority_areas: [
      'Technology Implementation',
      'Performance Measurement',
      'Regulatory Compliance'
    ],
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  recommendations: [
    {
      professional: {
        id: 'prof-001',
        name: 'Sarah Mulenga',
        expertise: ['Business Strategy', 'Digital Transformation', 'Performance Management'],
        experience: '8 years',
        successRate: 0.92,
        rating: 4.8,
        hourlyRate: 'ZMW 300',
        availability: 'Available',
        bio: 'Business transformation specialist focused on SME growth',
        qualifications: [
          { name: 'MBA Business Strategy', institution: 'UNZA', year: 2018 },
          { name: 'Digital Marketing Certificate', institution: 'Google', year: 2020 }
        ]
      },
      matchScore: 89,
      recommendedFor: ['Technology Implementation', 'Performance Measurement'],
      aiReasoning: 'Sarah\'s expertise in digital transformation and performance management directly addresses your technology gaps and KPI tracking needs. Her 92% success rate with SMEs makes her ideal for your business growth stage.'
    },
    {
      professional: {
        id: 'prof-002',
        name: 'James Banda',
        expertise: ['Regulatory Compliance', 'Legal Structure', 'Risk Management'],
        experience: '12 years',
        successRate: 0.95,
        rating: 4.9,
        hourlyRate: 'ZMW 400',
        availability: 'Limited',
        bio: 'Legal and compliance expert specializing in Zambian business regulations',
        qualifications: [
          { name: 'LLB Law', institution: 'UNZA', year: 2012 },
          { name: 'Corporate Law Certificate', institution: 'LSI', year: 2015 }
        ]
      },
      matchScore: 85,
      recommendedFor: ['Regulatory Compliance', 'Legal Structure Optimization'],
      aiReasoning: 'James specializes in Zambian regulatory compliance and legal structures. His extensive experience will help ensure your business meets all regulatory requirements while optimizing your legal framework for growth.'
    }
  ]
};

interface DemoAssessmentData {
  assessment: any;
  recommendations: any[];
}

export const SMEAssessmentDemo = () => {
  const [currentView, setCurrentView] = useState<'intro' | 'assessment' | 'results'>('intro');
  const [demoData, setDemoData] = useState<DemoAssessmentData | null>(null);
  const navigate = useNavigate();

  const handleAssessmentComplete = (results: DemoAssessmentData) => {
    // In demo mode, use mock results instead of actual API calls
    setDemoData(mockAssessmentResults);
    setCurrentView('results');
  };

  const handleRetakeAssessment = () => {
    setCurrentView('assessment');
    setDemoData(null);
  };

  const handleContactProfessional = (professionalId: string) => {
    alert(`Demo Mode: In the real app, this would navigate to contact ${professionalId}`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleStartDemo = () => {
    setCurrentView('assessment');
  };

  // Introduction/Welcome View
  if (currentView === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
        <div className="max-w-4xl mx-auto p-6 pt-12">
          <Button 
            variant="ghost" 
            onClick={handleBackToHome}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <Alert className="mb-8 border-blue-200 bg-blue-50">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Mode:</strong> This is a demonstration of the SME Needs Assessment feature. 
              No data will be saved, and mock results will be shown at the end.
            </AlertDescription>
          </Alert>

          <div className="text-center mb-8">
            <TrendingUp className="w-16 h-16 mx-auto text-orange-600 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              SME Business Needs Assessment
              <span className="text-lg font-normal text-blue-600 ml-2">(Demo)</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience our AI-powered assessment that identifies business gaps and recommends professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
                <CardTitle className="text-lg">Identify Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">
                  Discover areas where your business needs improvement to attract investors and achieve growth
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-blue-600 mb-2" />
                <CardTitle className="text-lg">Get AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">
                  Receive AI-powered suggestions for professionals who can help address your specific needs
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-purple-600 mb-2" />
                <CardTitle className="text-lg">Connect & Grow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">
                  Connect with recommended professionals and track your business improvement over time
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Try the Demo Assessment</CardTitle>
              <CardDescription className="text-center">
                Experience the complete assessment flow - takes about 10-15 minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Demo Assessment Covers:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Financial health and cash flow management</li>
                  <li>• Operational efficiency and technology gaps</li>
                  <li>• Market position and customer acquisition</li>
                  <li>• Regulatory compliance and legal structure</li>
                  <li>• Strategic planning and funding requirements</li>
                  <li>• Professional support needs and priorities</li>
                </ul>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">What You'll See:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Business health score and detailed analysis</li>
                  <li>• Identified gaps and priority improvement areas</li>
                  <li>• AI-matched professional recommendations</li>
                  <li>• Personalized action plan for business growth</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleStartDemo} 
                  className="flex-1"
                  size="lg"
                >
                  Start Demo Assessment
                </Button>
                
                <Button 
                  onClick={() => {
                    setDemoData(mockAssessmentResults);
                    setCurrentView('results');
                  }}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Skip to Results Demo
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Want to create a real account? <Button variant="link" onClick={() => navigate('/get-started')} className="p-0 h-auto">Sign up here</Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Assessment Form View
  if (currentView === 'assessment') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <Alert className="max-w-4xl mx-auto mb-6 mx-6 border-blue-200 bg-blue-50">
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> This assessment is for demonstration purposes. 
            Your responses will not be saved.
          </AlertDescription>
        </Alert>
        
        <SMENeedsAssessment 
          onComplete={handleAssessmentComplete}
          onSkip={() => setCurrentView('intro')}
        />
      </div>
    );
  }

  // Results View
  if (currentView === 'results' && demoData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <Alert className="max-w-6xl mx-auto mb-6 mx-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Results:</strong> These are sample results showing how the AI-powered 
            recommendations work. In the real app, results would be based on your actual responses.
          </AlertDescription>
        </Alert>

        <AssessmentResults
          assessment={demoData.assessment}
          recommendations={demoData.recommendations}
          onContactProfessional={handleContactProfessional}
          onRetakeAssessment={handleRetakeAssessment}
        />
      </div>
    );
  }

  return null;
};