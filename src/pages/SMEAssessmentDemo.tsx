import { SMEAssessment } from './SMEAssessment';

/**
 * Legacy route kept for backward compatibility. Redirects users to the live
 * SME assessment experience that stores data in Supabase and returns
 * personalized recommendations.
 */
export const SMEAssessmentDemo = () => {
  return <SMEAssessment />;
};

export default SMEAssessmentDemo;
