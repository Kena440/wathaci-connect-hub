import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';

// Redirect to the existing government assessment page
export const GovernmentNeedsAssessmentPage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/signin');
    } else {
      // Redirect to the existing government assessment page
      navigate('/government-assessment');
    }
  }, [user, navigate]);

  return null;
};
