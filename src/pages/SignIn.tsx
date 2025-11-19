import { Link } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getMaintenanceConfig } from '@/config/featureFlags';
// TEMPORARY BYPASS MODE: remove after auth errors are fixed
import { BypassModeBanner } from '@/components/BypassModeBanner';

export const SignIn = () => {
  const maintenance = getMaintenanceConfig();
  const maintenanceActive = maintenance.enabled;
  const signInDisabled = maintenanceActive && !maintenance.allowSignIn;
  const signUpAvailable = !maintenanceActive || maintenance.allowSignUp;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-orange-100/60 backdrop-blur">
        {/* TEMPORARY BYPASS MODE: remove after auth errors are fixed */}
        <BypassModeBanner className="mb-6" />
        
        {maintenanceActive && (
          <Alert variant="warning" className="mb-6">
            <AlertTitle>{maintenance.bannerTitle}</AlertTitle>
            <AlertDescription>{maintenance.bannerMessage}</AlertDescription>
          </Alert>
        )}
        <div className="mb-6 text-center">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
            alt="Wathaci Connect"
            className="mx-auto h-16 w-auto"
            loading="lazy"
            decoding="async"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign in to support SMEs and track your impact on Wathaci Connect.
          </p>
        </div>

        <AuthForm
          mode="signin"
          redirectTo="/"
          disabled={signInDisabled}
          disabledReason={maintenance.bannerMessage}
        />

        {signUpAvailable ? (
          <p className="mt-6 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-red-600 hover:text-red-700">
              Create one now
            </Link>
          </p>
        ) : (
          <p className="mt-6 text-center text-sm text-gray-600">
            New registrations are temporarily paused while we complete scheduled maintenance.
          </p>
        )}
      </div>
    </div>
  );
};

export default SignIn;
