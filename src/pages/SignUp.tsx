import { Link } from 'react-router-dom';
import AuthForm from '@/components/AuthForm';

export const SignUp = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white via-orange-50 to-green-100 p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white/90 p-8 shadow-xl ring-1 ring-orange-100/60 backdrop-blur">
        <div className="mb-6 text-center">
          <img
            src="https://d64gsuwffb70l.cloudfront.net/686a39ec793daf0c658a746a_1753699300137_a4fb9790.png"
            alt="Wathaci Connect"
            className="mx-auto h-16 w-auto"
            loading="lazy"
            decoding="async"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Join Wathaci Connect</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create an account to start donating, supporting SMEs, and tracking your contributions.
          </p>
        </div>

        <AuthForm mode="signup" redirectTo="/" />

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/signin" className="font-semibold text-red-600 hover:text-red-700">
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
