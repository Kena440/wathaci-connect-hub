import { useEffect } from 'react';
import BackToHomeButton from '@/components/BackToHomeButton';

const TestError = () => {
  useEffect(() => {
    // Throw an error to test the ErrorBoundary
    throw new Error('This is a test error to demonstrate ErrorBoundary functionality');
  }, []);

  return (
    <div className="p-6 space-y-4">
      <BackToHomeButton />
      <h1>Test Error Page</h1>
      <p>This page should trigger the ErrorBoundary.</p>
    </div>
  );
};

export default TestError;