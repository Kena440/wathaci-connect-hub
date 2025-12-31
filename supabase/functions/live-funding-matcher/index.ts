import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, sector, opportunityId } = await req.json();
    console.log('Live funding matcher action:', action);

    switch (action) {
      case 'fetch_live_opportunities': {
        let query = supabase
          .from('funding_opportunities')
          .select('*')
          .eq('is_active', true)
          .gt('deadline', new Date().toISOString())
          .order('deadline', { ascending: true })
          .limit(20);

        if (sector && sector !== 'all') {
          query = query.contains('sectors', [sector]);
        }

        const { data, error } = await query;
        if (error) throw error;

        const opportunities = (data || []).map(opp => ({
          id: opp.id,
          title: opp.title,
          organization: opp.organization,
          amount: opp.amount_display || `$${opp.amount_min?.toLocaleString()} - $${opp.amount_max?.toLocaleString()}`,
          deadline: opp.deadline,
          daysLeft: Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          category: opp.category,
          fundingType: opp.funding_type,
          sectors: opp.sectors || [],
          location: opp.location,
          description: opp.description,
          eligibility: opp.eligibility_criteria || [],
          isFeatured: opp.is_featured
        }));

        return new Response(JSON.stringify({ success: true, opportunities }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_matched_professionals': {
        // Get professionals who specialize in funding applications
        const { data: professionals, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('account_type', 'professional')
          .eq('availability_status', 'available')
          .or('specialization.ilike.%funding%,specialization.ilike.%grant%,services_offered.cs.{funding application}')
          .order('rating', { ascending: false })
          .limit(10);

        if (error) throw error;

        const matchedProfessionals = (professionals || []).map(p => ({
          id: p.id,
          name: p.full_name || p.business_name,
          title: p.title || p.specialization,
          avatar: p.avatar_url,
          rating: p.rating || 4.5,
          reviews: p.reviews_count || 0,
          hourlyRate: p.hourly_rate || 150,
          skills: p.skills || [],
          successRate: 85 + Math.random() * 10, // Placeholder
          completedApplications: Math.floor(Math.random() * 50) + 10
        }));

        return new Response(JSON.stringify({ success: true, professionals: matchedProfessionals }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'request_professional_help': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { professionalId } = await req.json();

        // Create a negotiation for funding assistance service
        const { data: negotiation, error } = await supabase
          .from('negotiations')
          .insert({
            provider_id: professionalId,
            client_id: user.id,
            service_title: 'Funding Application Assistance',
            initial_price: 500,
            current_price: 500,
            status: 'pending',
            notes: `Assistance for opportunity: ${opportunityId}`
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ success: true, negotiation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Live funding matcher error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
