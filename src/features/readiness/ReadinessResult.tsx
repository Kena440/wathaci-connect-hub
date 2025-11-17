import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/AppLayout';
import { CheckCircle2, FileCheck, Receipt, Users, TrendingUp } from 'lucide-react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';

interface ResultMessage {
  title: string;
  description: string;
  color: string;
}

const getResultMessage = (score: number): ResultMessage => {
  if (score >= 0 && score <= 20) {
    return {
      title: "You are just getting started",
      description: "We'll guide you step-by-step to build a strong foundation for your business.",
      color: 'text-red-600',
    };
  } else if (score >= 21 && score <= 50) {
    return {
      title: "Good start",
      description: "Let's work on improving your structure and processes.",
      color: 'text-orange-600',
    };
  } else if (score >= 51 && score <= 80) {
    return {
      title: "You are almost business-ready",
      description: "Here are your next steps to reach full readiness.",
      color: 'text-yellow-600',
    };
  } else {
    return {
      title: "Excellent",
      description: "You're ready for funding and growth opportunities!",
      color: 'text-green-600',
    };
  }
};

const nextSteps = [
  {
    icon: FileCheck,
    title: 'Complete Compliance Checklist',
    description: 'Ensure your business meets all regulatory requirements.',
    action: '/compliance-checklist', // Placeholder
  },
  {
    icon: Receipt,
    title: 'Add Your First Invoice',
    description: 'Start tracking your business transactions professionally.',
    action: '/invoices', // Placeholder
  },
  {
    icon: Users,
    title: 'Create Customer List',
    description: 'Build and manage your customer database effectively.',
    action: '/customers', // Placeholder
  },
  {
    icon: TrendingUp,
    title: 'View Recommended Funding',
    description: 'Explore funding opportunities tailored to your business.',
    action: '/funding-hub', // Existing route
  },
];

export const ReadinessResult = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [score, setScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    // Try to get data from navigation state first
    const stateScore = location.state?.score;
    const stateAnswers = location.state?.answers;

    if (typeof stateScore === 'number') {
      setScore(stateScore);
      setAnswers(stateAnswers || null);
    } else {
      // If no state, fetch from database
      const fetchScore = async () => {
        if (!user?.id) {
          navigate('/readiness');
          return;
        }

        try {
          const { data, error } = await supabaseClient
            .from('sme_readiness_scores')
            .select('score, answers')
            .eq('user_id', user.id)
            .single();

          if (error) throw error;

          if (data) {
            setScore(data.score);
            setAnswers(data.answers as Record<string, string>);
          } else {
            // No score found, redirect to assessment
            navigate('/readiness');
          }
        } catch (error) {
          console.error('Failed to fetch readiness score:', error);
          navigate('/readiness');
        }
      };

      fetchScore();
    }
  }, [location.state, user, navigate]);

  if (score === null) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your results...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const resultMessage = getResultMessage(score);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className={`w-20 h-20 ${resultMessage.color}`} />
            </div>
            <CardTitle className="text-4xl font-bold mb-2">
              Your Readiness Score
            </CardTitle>
            <div className="text-6xl font-bold text-orange-600 my-4">
              {score}/100
            </div>
            <CardDescription className="text-xl">
              <span className={`font-semibold ${resultMessage.color}`}>
                {resultMessage.title}
              </span>
              <br />
              {resultMessage.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={score} className="h-4 mb-6" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-orange-600">
              Your Next Steps
            </CardTitle>
            <CardDescription>
              Take action with these recommended steps to grow your business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {nextSteps.map((step, index) => {
                const Icon = step.icon;
                const isPlaceholder = step.action !== '/funding-hub';
                
                return (
                  <Card
                    key={index}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => {
                      if (!isPlaceholder) {
                        navigate(step.action);
                      }
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <Icon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {step.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {step.description}
                          </p>
                          {isPlaceholder && (
                            <p className="text-xs text-gray-400 mt-2 italic">
                              Coming soon
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/readiness')}
              >
                Retake Assessment
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ReadinessResult;
