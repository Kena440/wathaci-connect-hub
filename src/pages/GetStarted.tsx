import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { accountTypes, type AccountTypeValue } from '@/data/accountTypes';
import { useAppContext } from '@/contexts/AppContext';

const accountTypeRoutes: Record<AccountTypeValue, string> = {
  sole_proprietor: '/sme-assessment',
  professional: '/professional-assessment',
  sme: '/sme-assessment',
  investor: '/investor-assessment',
  donor: '/donor-assessment',
  government: '/government-assessment',
};

export const GetStarted = () => {
  const navigate = useNavigate();
  const { user, profile } = useAppContext();

  const availableAccountTypes = accountTypes.map(({ value }) => value);

  const isSupportedAccountType = (value: unknown): value is AccountTypeValue =>
    typeof value === 'string' && (availableAccountTypes as string[]).includes(value);

  const buildProfileSetupPath = (accountType: AccountTypeValue, mode?: 'edit') => {
    const params = new URLSearchParams({ accountType });
    if (mode) {
      params.set('mode', mode);
    }

    return `/profile-setup?${params.toString()}`;
  };

  const handleSelectAccountType = (value: AccountTypeValue) => {
    if (!value) return;

    if (!user) {
      navigate(`/signup?${new URLSearchParams({ accountType: value }).toString()}`);
      return;
    }

    const profileAccountType = profile?.account_type;
    const isProfileCompleted = Boolean(profile?.profile_completed ?? user?.profile_completed);
    const normalizedProfileAccountType = isSupportedAccountType(profileAccountType)
      ? profileAccountType
      : undefined;

    if (!isProfileCompleted || normalizedProfileAccountType !== value) {
      navigate(buildProfileSetupPath(value, isProfileCompleted ? 'edit' : undefined));
      return;
    }

    const target = accountTypeRoutes[value] ?? '/profile-review';
    navigate(target);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div
        className="fixed inset-0 bg-center bg-cover"
        style={{
          backgroundImage: "url('/images/Partnership%20Hub.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50/70 via-white/60 to-green-50/70" />
      <Card className="w-full max-w-5xl relative z-10 border-orange-100/70 shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
            alt="WATHACI CONNECT"
            loading="lazy"
            decoding="async"
            className="h-16 w-auto mx-auto drop-shadow-lg"
          />
          <CardTitle className="text-3xl font-semibold text-gray-900">Choose how you want to get started</CardTitle>
          <CardDescription className="text-base">
            Pick the option that best matches your goals and we&apos;ll take you straight to the right profile experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {accountTypes.map(({ value, label, description, icon: Icon, onboardingFocus }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleSelectAccountType(value)}
                className="group relative flex h-full flex-col rounded-xl border border-orange-100 bg-white/90 p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <div className="flex items-start gap-4">
                  <span className="rounded-full bg-orange-100 p-3 text-orange-600">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
                    <p className="mt-1 text-sm text-gray-600">{description}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">What we&apos;ll guide you through</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {onboardingFocus.map((focus) => (
                      <li key={focus} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                        <span>{focus}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
                  Start as {label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 border-t border-orange-100/70 bg-orange-50/50 py-6">
          <p className="text-sm text-gray-600">
            New to WATHACI CONNECT?{' '}
            <Link to="/signup" className="text-orange-600 font-semibold hover:text-orange-700">
              Create an account
            </Link>
          </p>
          <p className="text-sm text-gray-600">Already have an account?</p>
          <Button asChild variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-100">
            <Link to="/signin">Sign in to continue</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default GetStarted;
