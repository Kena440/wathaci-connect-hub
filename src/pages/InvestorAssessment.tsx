import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InvestorNeedsAssessment } from '@/components/InvestorNeedsAssessment';
import { AssessmentResults } from '@/components/AssessmentResults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase-enhanced';
import BackToHomeButton from '@/components/BackToHomeButton';

interface AssessmentData {
  assessment: any;
  profile: any;
  strategy?: any;
}

export const InvestorAssessment = () => {
  const [currentView, setCurrentView] = useState<'intro' | 'assessment' | 'results'>('intro');
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [existingAssessment, setExistingAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { user } = useAppContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const checkExistingAssessment = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Check if user has completed an assessment
      const { data: assessment, error } = await supabase
        .from('investor_needs_assessments')
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
        const showResults = searchParams.get('view') === 'results';
        if (showResults) {
          setAssessmentData({
            assessment,
            profile: assessment.investor_profile || {},
            strategy: assessment.investment_strategy || []
          });
          setCurrentView('results');
        }
      }
    } catch (error: any) {
      console.error('Error checking existing assessment:', error);
      toast({
        title: "Error",
        description: "Failed to load assessment data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, toast, user]);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    void checkExistingAssessment();
  }, [user, navigate, checkExistingAssessment]);

  const handleStartAssessment = () => {
    setCurrentView('assessment');
  };

  const handleAssessmentComplete = (data: AssessmentData) => {
    setAssessmentData(data);
    setCurrentView('results');
    
    toast({
      title: "Assessment completed!",
      description: "Your investor profile has been created successfully.",
    });
  };

  const handleSkipAssessment = () => {
    navigate('/dashboard');
  };

  const handleRetakeAssessment = () => {
    setCurrentView('assessment');
    setAssessmentData(null);
  };

  const handleViewExistingResults = () => {
    if (existingAssessment) {
      setAssessmentData({
        assessment: existingAssessment,
        profile: existingAssessment.investor_profile || {},
        strategy: existingAssessment.investment_strategy || []
      });
      setCurrentView('results');
    }
  };

  const handleContactProfessional = (professionalId: string) => {
    // Navigate to messaging or contact functionality
    navigate(`/messages?contact=${professionalId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your investor assessment...</p>
        </div>
      </div>
    );
  }

  // Intro View
  if (currentView === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <BackToHomeButton />
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-blue-900">Investor Needs Assessment</CardTitle>
              <CardDescription className="text-lg">
                Help us understand your investment preferences and criteria to connect you with the right opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">What we'll assess:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Investment capacity and risk tolerance</li>
                  <li>• Types of support you can provide (financial, technical, mentorship)</li>
                  <li>• Business preferences (industries, stages, geographic focus)</li>
                  <li>• Investment structure and due diligence requirements</li>
                  <li>• Impact focus and co-investment interests</li>
                  <li>• Decision-making process and timeline</li>
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
                  onClick={handleSkipAssessment}
                  variant="ghost"
                  size="sm"
                >
                  Skip for now
                </Button>
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
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <BackToHomeButton />
          <InvestorNeedsAssessment
            onComplete={handleAssessmentComplete}
            onSkip={handleSkipAssessment}
          />
        </div>
      </div>
    );
  }

  // Results View
  if (currentView === 'results' && assessmentData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          <BackToHomeButton />
          <AssessmentResults
            assessment={assessmentData.assessment}
            recommendations={assessmentData.strategy || []}
            onContactProfessional={handleContactProfessional}
            onRetakeAssessment={handleRetakeAssessment}
          />
        </div>
      </div>
    );
  }

  return null;
};