import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useAppContext } from '@/contexts/AppContext';
import { Loader2, Sparkles } from 'lucide-react';
import OnboardingGraceBanner from '@/components/OnboardingGraceBanner';
import { SUBSCRIPTION_GRACE_LABEL } from '@/lib/subscriptionWindow';
import SeoMeta from '@/components/SeoMeta';

const accountTypeRoutes: Record<string, string> = {
  sme: '/onboarding/sme',
  professional: '/onboarding/professional',
  investor: '/onboarding/investor',
  donor: '/onboarding/investor',
  government: '/onboarding/government/needs-assessment',
};

export const OnboardingLanding = () => {
  const navigate = useNavigate();
  const { user: supabaseUser, loading } = useSupabaseAuth();
  const { profile } = useAppContext();

  const accountType = profile?.account_type || (supabaseUser?.user_metadata as any)?.account_type;

  useEffect(() => {
    if (loading) return;
    if (!supabaseUser) return;

    if (accountType && accountTypeRoutes[accountType]) {
      navigate(accountTypeRoutes[accountType], { replace: true });
      return;
    }

    navigate('/get-started', { replace: true });
  }, [accountType, loading, navigate, supabaseUser]);

  if (loading) {
    return (
      <AppLayout showFooter={false}>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (supabaseUser) {
    return null;
  }

  return (
    <AppLayout showFooter={false}>
      <SeoMeta
        title="SME, investor, and professional onboarding | Wathaci Connect"
        description="Join Wathaci Connect to access SME ecosystem Zambia tools: business formalisation, investor engagement portal, strategic partnerships, and capacity-building resources."
        keywords={[
          'SME onboarding Zambia',
          'Investor engagement portal',
          'Professional services marketplace',
          'Opportunity matching engine',
          'Business formalisation tools',
          'Digital services for SMEs'
        ]}
        canonicalPath="/onboarding"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Wathaci Connect Onboarding',
            description:
              'Onboard SMEs, investors, donors, and professionals into the Zambian business platform for advisory services, compliance tools, and opportunity matching.',
            url: 'https://wathaci.com/onboarding'
          }
        ]}
      />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-emerald-50" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Founding cohort free access
              </div>
              <h1 className="mt-6 text-4xl font-bold text-gray-900 md:text-5xl">
                Start your Wathaci Connect onboarding for SME growth
              </h1>
              <p className="mt-4 text-lg text-gray-700">
                Create your account and profile without a subscription until {SUBSCRIPTION_GRACE_LABEL}. Whether you are looking for SME compliance support, investor engagement, business advisory services, or a professional services marketplace, this is the fastest route into Zambia's opportunity matching engine.
              </p>
              <div className="mt-6">
                <OnboardingGraceBanner className="mb-0" />
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg">
                  <Link to="/signup">Create your free account</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-2">
                  <Link to="/signin">Already have an account? Sign in</Link>
                </Button>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Sharing this page will guide new users to sign up and go directly into the onboarding flow.
              </p>
            </div>

            <Card className="w-full max-w-md border-emerald-100 shadow-lg shadow-emerald-100">
              <CardHeader>
                <CardTitle>What to expect</CardTitle>
                <CardDescription>
                  Complete your profile now while subscription requirements are paused.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-gray-700">
                <div>
                  <p className="font-semibold text-gray-900">1. Create your account</p>
                  <p className="text-sm">Sign up with your work email to save your progress.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">2. Tell us about yourself</p>
                  <p className="text-sm">Share your role, expertise, or organisation details.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">3. Launch your profile</p>
                  <p className="text-sm">Get matched to opportunities without any paywall until {SUBSCRIPTION_GRACE_LABEL}.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default OnboardingLanding;
