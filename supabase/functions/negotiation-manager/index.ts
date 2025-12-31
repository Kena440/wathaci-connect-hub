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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { action, negotiationId, serviceId, providerId, initialPrice, serviceTitle, proposedPrice, message } = await req.json();
    console.log('Negotiation action:', action, 'user:', user.id);

    switch (action) {
      case 'create': {
        // Create new negotiation
        const { data: negotiation, error } = await supabase
          .from('negotiations')
          .insert({
            service_id: serviceId,
            provider_id: providerId,
            client_id: user.id,
            service_title: serviceTitle,
            initial_price: initialPrice,
            current_price: initialPrice,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          })
          .select()
          .single();

        if (error) throw error;

        // Add initial message
        await supabase.from('negotiation_messages').insert({
          negotiation_id: negotiation.id,
          sender_id: user.id,
          message: message || 'Started negotiation',
          proposed_price: initialPrice,
          message_type: 'message'
        });

        return new Response(JSON.stringify({ success: true, data: negotiation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'counter_offer': {
        // Update negotiation with counter offer
        const { data: negotiation, error: fetchError } = await supabase
          .from('negotiations')
          .select('*')
          .eq('id', negotiationId)
          .single();

        if (fetchError) throw fetchError;

        // Verify user is participant
        if (negotiation.provider_id !== user.id && negotiation.client_id !== user.id) {
          throw new Error('Not authorized for this negotiation');
        }

        // Update negotiation
        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            current_price: proposedPrice,
            status: 'countered'
          })
          .eq('id', negotiationId);

        if (updateError) throw updateError;

        // Add message
        await supabase.from('negotiation_messages').insert({
          negotiation_id: negotiationId,
          sender_id: user.id,
          message: message || `Counter offer: K${proposedPrice}`,
          proposed_price: proposedPrice,
          message_type: 'counter_offer'
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'accept': {
        const { data: negotiation, error: fetchError } = await supabase
          .from('negotiations')
          .select('*')
          .eq('id', negotiationId)
          .single();

        if (fetchError) throw fetchError;

        if (negotiation.provider_id !== user.id && negotiation.client_id !== user.id) {
          throw new Error('Not authorized');
        }

        const platformFee = negotiation.current_price * 0.03;

        const { error: updateError } = await supabase
          .from('negotiations')
          .update({
            status: 'accepted',
            final_price: negotiation.current_price,
            platform_fee: platformFee
          })
          .eq('id', negotiationId);

        if (updateError) throw updateError;

        // Add acceptance message
        await supabase.from('negotiation_messages').insert({
          negotiation_id: negotiationId,
          sender_id: user.id,
          message: `Price accepted at K${negotiation.current_price}`,
          proposed_price: negotiation.current_price,
          message_type: 'acceptance'
        });

        return new Response(JSON.stringify({ 
          success: true, 
          finalPrice: negotiation.current_price,
          platformFee 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'reject': {
        const { error } = await supabase
          .from('negotiations')
          .update({ status: 'rejected' })
          .eq('id', negotiationId);

        if (error) throw error;

        await supabase.from('negotiation_messages').insert({
          negotiation_id: negotiationId,
          sender_id: user.id,
          message: message || 'Negotiation rejected',
          message_type: 'rejection'
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_messages': {
        const { data, error } = await supabase
          .from('negotiation_messages')
          .select(`
            *,
            sender:profiles!negotiation_messages_sender_id_fkey(id, full_name, avatar_url)
          `)
          .eq('negotiation_id', negotiationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_user_negotiations': {
        const { data, error } = await supabase
          .from('negotiations')
          .select(`
            *,
            provider:profiles!negotiations_provider_id_fkey(id, full_name, business_name, avatar_url),
            client:profiles!negotiations_client_id_fkey(id, full_name, business_name, avatar_url),
            service:services(id, title, images)
          `)
          .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_order': {
        const { data: negotiation, error: fetchError } = await supabase
          .from('negotiations')
          .select('*')
          .eq('id', negotiationId)
          .eq('status', 'accepted')
          .single();

        if (fetchError) throw fetchError;

        const platformFee = negotiation.final_price * 0.03;
        const totalAmount = negotiation.final_price + platformFee;

        const { data: order, error } = await supabase
          .from('orders')
          .insert({
            service_id: negotiation.service_id,
            negotiation_id: negotiationId,
            client_id: negotiation.client_id,
            provider_id: negotiation.provider_id,
            service_title: negotiation.service_title,
            agreed_price: negotiation.final_price,
            platform_fee: platformFee,
            total_amount: totalAmount,
            currency: 'ZMW',
            status: 'pending',
            delivery_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data: order }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Negotiation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
