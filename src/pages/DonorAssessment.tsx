import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DonorNeedsAssessment } from '@/components/DonorNeedsAssessment';
import { AssessmentResults } from '@/components/AssessmentResults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase-enhanced';
import AppLayout from '@/components/AppLayout';

interface AssessmentData {
  assessment: any;
  profile: any;
  strategy?: any;
}

export const DonorAssessment = () => {
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
        .from('donor_needs_assessments')
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
            profile: assessment.donor_profile || {},
            strategy: assessment.donor_strategy || []
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
      description: "Your donor profile has been created successfully.",
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
        profile: existingAssessment.donor_profile || {},
        strategy: existingAssessment.donor_strategy || []
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
      <AppLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your donor assessment...</p>
        </div>
      </div>
      </AppLayout>
    );
  }

  // Intro View
  if (currentView === 'intro') {
    return (
      <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-red-900">Donor Needs Assessment</CardTitle>
              <CardDescription className="text-lg">
                Help us understand your donation preferences and impact goals to connect you with meaningful opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-semibold text-red-900 mb-2">What we'll assess:</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Donation capacity and frequency preferences</li>
                  <li>• Focus areas and target beneficiaries</li>
                  <li>• Types of support you provide (financial, capacity building, mentorship)</li>
                  <li>• Impact measurement and reporting requirements</li>
                  <li>• Organization preferences and selection criteria</li>
                  <li>• Collaboration interests and application processes</li>
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
      </AppLayout>
    );
  }

  // Assessment Form View
  if (currentView === 'assessment') {
    return (
      <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <DonorNeedsAssessment 
          onComplete={handleAssessmentComplete}
          onSkip={handleSkipAssessment}
        />
      </div>
      </AppLayout>
    );
  }

  // Results View
  if (currentView === 'results' && assessmentData) {
    return (
      <AppLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <AssessmentResults
          assessment={assessmentData.assessment}
          recommendations={assessmentData.strategy || []}
          onContactProfessional={handleContactProfessional}
          onRetakeAssessment={handleRetakeAssessment}
        />
      </div>
      </AppLayout>
    );
  }

  return null;
};