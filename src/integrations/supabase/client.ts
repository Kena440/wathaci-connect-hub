/**
 * Re-export the singleton supabase client from the canonical location.
 * This file used to create a client; to avoid duplicate GoTrueClient instances
 * we now re-export the single client.
 *
 * Usage:
 * import { supabase } from "@/integrations/supabase/client";
 */
export { supabase } from '@/lib/supabaseClient';
