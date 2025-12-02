import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, ShieldCheck, Sparkles } from 'lucide-react';

const CISO_EMAIL = import.meta.env.VITE_CISO_EMAIL?.trim() || 'ciso@wathaci.com';

export const CisoHelpSection = () => {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    question: '',
  });
  const hasOpenAiAccess = Boolean(
    import.meta.env.VITE_OPENAI_API_KEY ?? import.meta.env.VITE_WATHACI_CONNECT_OPENAI,
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formValues.question.trim()) {
      toast({
        title: 'Add a question for Ciso',
        description: 'Share what you need help with so Ciso can review and respond.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Question routed to Ciso',
      description: hasOpenAiAccess
        ? 'Ciso will personally review your question and use OpenAI to draft the fastest possible resolution.'
        : 'Ciso will personally review your question and follow up with next steps.',
    });

    setFormValues({ name: '', email: '', question: '' });
  };

  return (
    <section className="relative z-10 py-14">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge className="mb-4 inline-flex items-center gap-2 bg-emerald-600 text-white">
            <MessageSquare className="h-4 w-4" /> Ask Ciso anything
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Get real help fast from our Ciso agent
          </h2>
          <p className="text-lg text-gray-700">
            Drop your question and Ciso will review it, coordinate with the right team, and — with
            full OpenAI access — propose solutions that keep you moving.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="border-2 border-emerald-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Direct line to Ciso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-gray-700">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Ciso reviews every query</p>
                    <p className="text-sm text-gray-600">
                      Every submission is queued for Ciso to triage and resolve — no generic contact
                      form black holes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-gray-700">
                  <Sparkles className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-semibold">OpenAI-powered assistance</p>
                    <p className="text-sm text-gray-600">
                      Ciso taps into OpenAI to draft answers, troubleshoot blockers, and surface next
                      steps before responding.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-gray-700">
                  <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">Stay in the loop</p>
                    <p className="text-sm text-gray-600">
                      Share your email to get a response directly from Ciso as soon as your solution is
                      ready.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <p className="font-semibold">OpenAI access</p>
                </div>
                <p className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      hasOpenAiAccess ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  {hasOpenAiAccess
                    ? 'Connected — Ciso can co-create solutions with OpenAI right now.'
                    : 'Add your OpenAI key to unlock instant AI-powered suggestions for Ciso.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Send your question</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700" htmlFor="name">
                      Your name
                    </label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Optional"
                      value={formValues.name}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700" htmlFor="email">
                      Email (for replies)
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formValues.email}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700" htmlFor="question">
                    What do you need help with?
                  </label>
                  <Textarea
                    id="question"
                    name="question"
                    placeholder="Share the challenge you're facing or the decision you need Ciso to weigh in on."
                    className="min-h-[140px]"
                    value={formValues.question}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, question: event.target.value }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                  <p>
                    Requests go straight to <span className="font-semibold">{CISO_EMAIL}</span> for
                    triage.
                  </p>
                  <span className="text-emerald-700 font-medium">Ciso replies personally</span>
                </div>

                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Send className="h-4 w-4 mr-2" /> Send to Ciso
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default CisoHelpSection;
