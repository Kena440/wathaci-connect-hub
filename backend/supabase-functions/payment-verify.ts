/**
 * Payment Verification Edge Function
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../../src/lib/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reference } = await req.json();

    if (!reference) {
      throw new Error('Payment reference is required');
    }

    // Verify payment with Lenco
    const lencoApiKey = Deno.env.get('LENCO_SECRET_KEY');
    const verifyResponse = await fetch(`https://api.lenco.co/access/v2/payments/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${lencoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      throw new Error('Payment verification failed');
    }

    // Update payment status in database
    const paymentStatus = verifyData.data.status === 'success' ? 'completed' : 'failed';
    
    const { error: updateError } = await supabaseClient
      .from('payments')
      .update({
        status: paymentStatus,
        lenco_transaction_id: verifyData.data.id,
        gateway_response: verifyData.data.gateway_response,
        paid_at: verifyData.data.paid_at,
        updated_at: new Date().toISOString()
      })
      .eq('reference', reference);

    if (updateError) {
      logger.error('Database update error', updateError, {
        paymentReference: reference,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        reference,
        status: paymentStatus,
        amount: verifyData.data.amount / 100,
        currency: verifyData.data.currency,
        transaction_id: verifyData.data.id,
        paid_at: verifyData.data.paid_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});