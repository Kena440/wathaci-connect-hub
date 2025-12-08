import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useProfile } from '@/hooks/useProfile';
import type { AccountType } from '@/types/profile';

export function AccountTypeSelectionPage() {
  const { loading, profile, error, refresh } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile?.account_type) {
      navigate(`/onboarding/${profile.account_type}`, { replace: true });
    }
  }, [loading, profile, navigate]);

  const handleSelect = async (accountType: AccountType) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate('/signin');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ account_type: accountType })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error setting account_type', updateError);
      alert('Failed to set account type. Please try again.');
      return;
    }

    await refresh();
    navigate(`/onboarding/${accountType}`);
  };

  if (loading) return <div>Loading your profile…</div>;
  if (error) return <div>Could not load profile. Please refresh.</div>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome to Wathaci Connect</h1>
      <p className="mb-6">
        Choose the type of account that best describes how you want to use the platform.
      </p>

      <div className="space-y-4">
        <button
          onClick={() => handleSelect('sme')}
          className="w-full border rounded-lg p-4 text-left hover:bg-gray-50"
        >
          <h2 className="font-semibold">SME / Business Owner</h2>
          <p className="text-sm text-gray-600">
            Create a business profile, showcase your products/services, and connect with experts.
          </p>
        </button>

        <button
          onClick={() => handleSelect('professional')}
          className="w-full border rounded-lg p-4 text-left hover:bg-gray-50"
        >
          <h2 className="font-semibold">Professional / Freelancer</h2>
          <p className="text-sm text-gray-600">
            Offer consulting, professional services, and support SMEs in your areas of expertise.
          </p>
        </button>

        <button
          onClick={() => handleSelect('investor')}
          className="w-full border rounded-lg p-4 text-left hover:bg-gray-50"
        >
          <h2 className="font-semibold">Investor / Support Partner</h2>
          <p className="text-sm text-gray-600">
            Discover SMEs, explore opportunities, and support high-potential businesses.
          </p>
        </button>
      </div>
    </div>
  );
}

export default AccountTypeSelectionPage;
