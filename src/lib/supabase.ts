/**
 * Legacy Supabase client export for backward compatibility
 * 
 * All imports should resolve to the SAME singleton client.
 */

import { supabase } from '@/integrations/supabase/client';

// Re-export the singleton client
export { supabase };
export default supabase;
