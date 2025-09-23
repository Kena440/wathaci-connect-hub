/**
 * Supabase Edge Function for Lenco Payment Processing
 * This function should be deployed to Supabase as an edge function
 */

// This would typically be in supabase/functions/lenco-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logger } from '../../src/lib/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface PaymentRequest {
  amount: number;
  paymentMethod: 'mobile_money' | 'card';
  phoneNumber?: string;
  provider?: 'mtn' | 'airtel' | 'zamtel';
  description: string;
  email: string;
  name: string;
  metadata?: Record<string, any>;
}

interface LencoApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let reference: string | undefined;
  let userId: string | undefined;

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    userId = user?.id;

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    const action = typeof requestBody.action === 'string'
      ? requestBody.action.toLowerCase()
      : 'initialize';

    if (action === 'verify') {
      const { reference: verifyReference } = requestBody;

      if (!verifyReference) {
        throw new Error('Payment reference is required');
      }

      const lencoApiKey = Deno.env.get('LENCO_SECRET_KEY');
      if (!lencoApiKey) {
        throw new Error('Payment gateway not configured');
      }

      const verifyResponse = await fetch(`https://api.lenco.co/access/v2/payments/verify/${verifyReference}`, {
        headers: {
          'Authorization': `Bearer ${lencoApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        logger.error('Payment verification failed', verifyData, {
          userId,
          paymentReference: verifyReference,
        });
        throw new Error(verifyData.message || 'Payment verification failed');
      }

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
        .eq('reference', verifyReference);

      if (updateError) {
        logger.error('Database update error', updateError, {
          userId,
          paymentReference: verifyReference,
        });
      }

      const response: LencoApiResponse = {
        success: true,
        data: {
          reference: verifyReference,
          status: paymentStatus,
          amount: verifyData.data.amount,
          currency: verifyData.data.currency,
          id: verifyData.data.id,
          gateway_response: verifyData.data.gateway_response,
          paid_at: verifyData.data.paid_at,
          metadata: verifyData.data.metadata
        }
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Default to payment initialization
    const {
      amount,
      paymentMethod,
      phoneNumber,
      provider,
      description,
      email,
      name,
      metadata
    }: PaymentRequest & { metadata?: Record<string, any> } = requestBody;

    // Validate payment request
    if (!amount || amount < 5) {
      throw new Error('Invalid payment amount');
    }

    if (!email || !name || !description) {
      throw new Error('Missing required payment information');
    }

    if (paymentMethod === 'mobile_money' && (!phoneNumber || !provider)) {
      throw new Error('Mobile money payments require phone number and provider');
    }

    // Generate payment reference
    reference = `WC_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Prepare Lenco payment request
    const lencoRequest = {
      amount: typeof amount === 'number' && amount > 10000 ? amount : Math.round(amount * 100), // Handle pre-converted amounts
      currency: 'ZMK',
      email,
      name,
      phone: phoneNumber || '',
      reference,
      callback_url: `${req.headers.get('origin')}/payment/callback`,
      metadata: {
        user_id: user.id,
        payment_method: paymentMethod,
        provider: provider || null,
        platform: 'WATHACI_CONNECT',
        ...metadata
      }
    };

    // Call Lenco API
    const lencoApiKey = Deno.env.get('LENCO_SECRET_KEY');
    if (!lencoApiKey) {
      throw new Error('Payment gateway not configured');
    }

    const lencoResponse = await fetch('https://api.lenco.co/access/v2/payments/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lencoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lencoRequest),
    });

    const lencoData = await lencoResponse.json();

    if (!lencoResponse.ok) {
      logger.error('Lenco API Error', lencoData, {
        userId,
        paymentReference: reference,
      });
      throw new Error(lencoData.message || 'Payment gateway error');
    }

    // Store payment record in database
    const { error: dbError } = await supabaseClient
      .from('payments')
      .insert({
        reference,
        user_id: user.id,
        amount: typeof amount === 'number' && amount > 10000 ? amount / 100 : amount, // Store in base currency units
        currency: 'ZMK',
        status: 'pending',
        payment_method: paymentMethod,
        provider: provider || null,
        description,
        email,
        name,
        phone: phoneNumber || null,
        lenco_access_code: lencoData.data?.access_code,
        lenco_authorization_url: lencoData.data?.authorization_url,
        metadata: lencoRequest.metadata,
        created_at: new Date().toISOString()
      });

    if (dbError) {
      logger.error('Database Error', dbError, {
        userId,
        paymentReference: reference,
      });
      throw new Error('Failed to store payment record');
    }

    // Return success response
    const response: LencoApiResponse = {
      success: true,
      data: {
        reference,
        payment_url: lencoData.data?.authorization_url,
        access_code: lencoData.data?.access_code,
        amount: typeof amount === 'number' && amount > 10000 ? amount / 100 : amount,
        currency: 'ZMK'
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    logger.error('Payment Function Error', error, {
      userId,
      paymentReference: reference,
    });

    const errorResponse: LencoApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    };

    const message = error instanceof Error ? error.message : '';

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: ['Unauthorized', 'Missing authorization header'].includes(message) ? 401 : 500,
    });
  }
});
