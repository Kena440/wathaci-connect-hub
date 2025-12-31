import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, filters, serviceData, serviceId } = await req.json();
    console.log('Marketplace manager action:', action, 'filters:', filters);

    switch (action) {
      case 'search': {
        let query = supabase
          .from('services')
          .select(`
            *,
            provider:profiles!services_provider_id_fkey(
              id, full_name, business_name, avatar_url, rating, reviews_count
            )
          `)
          .eq('is_active', true);

        if (filters?.category && filters.category !== 'all') {
          query = query.eq('category', filters.category);
        }
        if (filters?.providerType && filters.providerType !== 'all') {
          query = query.eq('provider_type', filters.providerType);
        }
        if (filters?.location && filters.location !== 'all') {
          query = query.ilike('location', `%${filters.location}%`);
        }
        if (filters?.minPrice) {
          query = query.gte('price', filters.minPrice);
        }
        if (filters?.maxPrice) {
          query = query.lte('price', filters.maxPrice);
        }

        const { data, error } = await query.order('is_featured', { ascending: false }).order('rating', { ascending: false });

        if (error) throw error;

        // Transform data for frontend
        const services = (data || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          provider: s.provider?.business_name || s.provider?.full_name || 'Provider',
          providerType: s.provider_type,
          category: s.category,
          skills: s.skills || [],
          location: s.location || 'Zambia',
          deliveryTime: s.delivery_time || '3-5 days',
          rating: s.rating || 4.5,
          reviews: s.reviews_count || 0,
          currency: s.currency || 'K',
          price: s.price,
          image: s.images?.[0] || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400'
        }));

        return new Response(JSON.stringify({ success: true, data: services }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Authorization required');
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { data, error } = await supabase
          .from('services')
          .insert({
            ...serviceData,
            provider_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { data, error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', serviceId)
          .eq('provider_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_provider_services': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('provider_id', user.id)
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
    console.error('Marketplace manager error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
