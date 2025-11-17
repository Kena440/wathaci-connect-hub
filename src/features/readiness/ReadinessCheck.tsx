import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabaseClient } from '@/lib/supabaseClient';
import { useAppContext } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { AppLayout } from '@/components/AppLayout';

interface Question {
  id: string;
  text: string;
  points: number;
}

const questions: Question[] = [
  {
    id: 'q1',
    text: 'Are you formally registered with PACRA or any official body?',
    points: 20,
  },
  {
    id: 'q2',
    text: 'Do you currently issue any form of receipts/invoices?',
    points: 20,
  },
  {
    id: 'q3',
    text: 'Do you track monthly business expenses?',
    points: 20,
  },
  {
    id: 'q4',
    text: 'Do you store customer details anywhere?',
    points: 20,
  },
  {
    id: 'q5',
    text: 'Do you have a bank/mobile money account used only for business?',
    points: 20,
  },
];

export const ReadinessCheck = () => {
  const [answers, setAnswers] = useState<Record<string, 'yes' | 'no'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAppContext();

  const handleAnswerChange = (questionId: string, value: 'yes' | 'no') => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const calculateScore = () => {
    return questions.reduce((total, question) => {
      return total + (answers[question.id] === 'yes' ? question.points : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all questions are answered
    const unansweredQuestions = questions.filter(
      (question) => !answers[question.id]
    );

    if (unansweredQuestions.length > 0) {
      toast.error('Please answer all questions before submitting.');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to submit the readiness check.');
      return;
    }

    setIsSubmitting(true);

    try {
      const score = calculateScore();

      // Log analytics
      logger.info('readiness_submitted', {
        userId: user.id,
        score,
        answers,
      });

      // Check if a record already exists
      const { data: existingRecord } = await supabaseClient
        .from('sme_readiness_scores')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingRecord) {
        // Update existing record
        const { error } = await supabaseClient
          .from('sme_readiness_scores')
          .update({
            score,
            answers,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabaseClient
          .from('sme_readiness_scores')
          .insert({
            user_id: user.id,
            score,
            answers,
          });

        if (error) throw error;
      }

      // Navigate to results page with score
      navigate('/readiness/result', { state: { score, answers } });
      toast.success('Readiness assessment completed!');
    } catch (error) {
      logger.error('Failed to submit readiness check', error, {
        userId: user?.id,
      });
      toast.error('Failed to submit readiness check. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allQuestionsAnswered = questions.every(
    (question) => answers[question.id]
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-orange-600">
              SME Readiness Check
            </CardTitle>
            <CardDescription className="text-lg">
              Answer these 5 questions to assess your business readiness and
              discover next steps to grow your SME.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="space-y-4 p-4 border rounded-lg bg-gray-50"
                >
                  <Label className="text-lg font-semibold">
                    {index + 1}. {question.text}
                  </Label>
                  <RadioGroup
                    value={answers[question.id] || ''}
                    onValueChange={(value) =>
                      handleAnswerChange(question.id, value as 'yes' | 'no')
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                      <Label
                        htmlFor={`${question.id}-yes`}
                        className="cursor-pointer"
                      >
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id={`${question.id}-no`} />
                      <Label
                        htmlFor={`${question.id}-no`}
                        className="cursor-pointer"
                      >
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!allQuestionsAnswered || isSubmitting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ReadinessCheck;
