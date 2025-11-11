import { Link } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';

export const SignIn = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-orange-100/60 backdrop-blur">
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

        <AuthForm mode="signin" redirectTo="/" />

        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-red-600 hover:text-red-700">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
