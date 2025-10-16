import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SMENeedsAssessment } from '@/components/SMENeedsAssessment';
import { AssessmentResults } from '@/components/AssessmentResults';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase-enhanced';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, TrendingUp } from 'lucide-react';

interface AssessmentData {
  assessment: any;
  recommendations: any[];
}

export const SMEAssessment = () => {
  const [currentView, setCurrentView] = useState<'intro' | 'assessment' | 'results'>('intro');
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [existingAssessment, setExistingAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const loadAssessmentResults = useCallback(async (assessment: any) => {
    try {
      const { data: recommendations, error } = await supabase.functions.invoke(
        'sme-assessment-recommendations',
        {
          body: {
            assessmentId: assessment.id,
            gaps: assessment.identified_gaps,
            supportAreas: assessment.immediate_support_areas,
            budget: assessment.budget_for_professional_services,
          },
        }
      );

      if (error) {
        console.error('Failed to load recommendations:', error);
      }

      setAssessmentData({
        assessment,
        recommendations: recommendations?.recommendations || [],
      });
      setCurrentView('results');
    } catch (error) {
      console.error('Error loading assessment results:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment results.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const checkExistingAssessment = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Check if user has completed an assessment
      const { data: assessment, error } = await supabase
        .from('sme_needs_assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (assessment) {
        setExistingAssessment(assessment);
        
        // Check if we should show results directly
        if (searchParams.get('view') === 'results') {
          await loadAssessmentResults(assessment);
        }
      }
    } catch (error: any) {
      console.error('Error checking existing assessment:', error);
    } finally {
      setLoading(false);
    }
  }, [loadAssessmentResults, searchParams, user]);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    void checkExistingAssessment();
  }, [user, navigate, checkExistingAssessment]);

  const handleAssessmentComplete = (results: AssessmentData) => {
    setAssessmentData(results);
    setCurrentView('results');
  };

  const handleRetakeAssessment = () => {
    setCurrentView('assessment');
    setAssessmentData(null);
  };

  const handleSkipAssessment = () => {
    navigate('/');
    toast({
      title: "Assessment Skipped",
      description: "You can take the assessment anytime from your profile.",
    });
  };

  const handleContactProfessional = (professionalId: string) => {
    // Navigate to messages or contact page
    navigate(`/messages?contact=${professionalId}`);
  };

  const handleStartAssessment = () => {
    setCurrentView('assessment');
  };

  const handleViewExistingResults = () => {
    if (existingAssessment) {
      void loadAssessmentResults(existingAssessment);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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

          <div className="text-center mb-8">
            <TrendingUp className="w-16 h-16 mx-auto text-orange-600 mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              SME Business Needs Assessment
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get personalized insights and professional recommendations to grow your business
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
                <CardTitle className="text-lg">Get Recommendations</CardTitle>
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
                <CardTitle className="text-lg">Track Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 text-center">
                  Monitor your business health score over time and see improvement in key areas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Ready to Get Started?</CardTitle>
              <CardDescription className="text-center">
                The assessment takes about 10-15 minutes and covers key areas that investors care about most
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">What we'll assess:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Financial health and cash flow management</li>
                  <li>• Operational efficiency and technology gaps</li>
                  <li>• Market position and customer acquisition</li>
                  <li>• Regulatory compliance and legal structure</li>
                  <li>• Strategic planning and funding requirements</li>
                  <li>• Professional support needs and priorities</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={handleStartAssessment} 
                  className="flex-1"
                  size="lg"
                >
                  Start Assessment
                </Button>
                
                {existingAssessment && (
                  <Button 
                    onClick={handleViewExistingResults}
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    View Previous Results
                  </Button>
                )}
              </div>

              <div className="text-center">
                <Button 
                  variant="ghost" 
                  onClick={handleSkipAssessment}
                  className="text-gray-500"
                >
                  Skip for now
                </Button>
              </div>
            </CardContent>
          </Card>

          {existingAssessment && (
            <div className="max-w-2xl mx-auto mt-6">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Previous Assessment Completed
                      </p>
                      <p className="text-sm text-green-700">
                        Completed on {new Date(existingAssessment.completed_at).toLocaleDateString()} 
                        - Score: {existingAssessment.overall_score}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assessment Form View
  if (currentView === 'assessment') {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <SMENeedsAssessment 
          onComplete={handleAssessmentComplete}
          onSkip={handleSkipAssessment}
        />
      </div>
    );
  }

  // Results View
  if (currentView === 'results' && assessmentData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <AssessmentResults
          assessment={assessmentData.assessment}
          recommendations={assessmentData.recommendations}
          onContactProfessional={handleContactProfessional}
          onRetakeAssessment={handleRetakeAssessment}
        />
      </div>
    );
  }

  return null;
};