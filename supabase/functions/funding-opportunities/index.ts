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

    const { action, opportunityId, filters } = await req.json();
    console.log('Funding opportunities action:', action);

    switch (action) {
      case 'fetch_opportunities': {
        let query = supabase
          .from('funding_opportunities')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('deadline', { ascending: true });

        if (filters?.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }
        if (filters?.fundingType) {
          query = query.eq('funding_type', filters.fundingType);
        }

        const { data, error } = await query;
        if (error) throw error;

        const opportunities = (data || []).map(opp => ({
          id: opp.id,
          title: opp.title,
          organization: opp.organization,
          amount: opp.amount_display || `$${opp.amount_min?.toLocaleString()} - $${opp.amount_max?.toLocaleString()}`,
          deadline: opp.deadline ? new Date(opp.deadline).toLocaleDateString() : 'Rolling',
          location: opp.location || 'Africa',
          category: opp.category,
          description: opp.description,
          eligibility: opp.eligibility_criteria || [],
          fundingType: opp.funding_type,
          applicationUrl: opp.application_url
        }));

        return new Response(JSON.stringify({ success: true, opportunities }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_opportunity': {
        const { data, error } = await supabase
          .from('funding_opportunities')
          .select('*')
          .eq('id', opportunityId)
          .single();

        if (error) throw error;

        // Increment views
        await supabase
          .from('funding_opportunities')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', opportunityId);

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'submit_application': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { applicationData } = await req.json();

        const { data, error } = await supabase
          .from('funding_applications')
          .insert({
            user_id: user.id,
            opportunity_id: opportunityId,
            ...applicationData,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Increment applications count
        await supabase.rpc('increment_applications_count', { opp_id: opportunityId });

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_user_applications': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { data, error } = await supabase
          .from('funding_applications')
          .select(`
            *,
            opportunity:funding_opportunities(id, title, organization, deadline)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Funding opportunities error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
