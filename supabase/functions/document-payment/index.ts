import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

interface DocumentPaymentRequest {
  action: 'initialize' | 'verify';
  documentRequestId?: string;
  paymentReference?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: 'mobile_money' | 'card';
  phoneNumber?: string;
  provider?: 'mtn' | 'airtel' | 'zamtel';
  documentType?: 'business_plan' | 'pitch_deck';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const lencoApiKey = Deno.env.get('LENCO_SECRET_KEY');
    const lencoApiUrl = Deno.env.get('LENCO_API_URL') || 'https://api.lenco.co/access/v2';

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify authentication
    const userClient = createClient(supabaseUrl, supabaseAnonKey || supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: DocumentPaymentRequest = await req.json();
    const { action } = body;

    if (action === 'initialize') {
      return await handleInitialize(body, supabase, user.id, lencoApiUrl, lencoApiKey || '');
    }

    if (action === 'verify') {
      return await handleVerify(body, supabase, lencoApiUrl, lencoApiKey || '');
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Document payment error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleInitialize(
  body: DocumentPaymentRequest,
  supabase: ReturnType<typeof createClient>,
  userId: string,
  lencoApiUrl: string,
  lencoApiKey: string
): Promise<Response> {
  const {
    documentRequestId,
    paymentReference,
    amount,
    currency,
    paymentMethod,
    phoneNumber,
    provider,
    documentType,
  } = body;

  if (!documentRequestId || !paymentReference || !amount) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify the document request belongs to the authenticated user
  const { data: existingDoc, error: checkError } = await supabase
    .from('paid_document_requests')
    .select('user_id')
    .eq('id', documentRequestId)
    .single();

  if (checkError || !existingDoc) {
    return new Response(
      JSON.stringify({ success: false, error: 'Document request not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (existingDoc.user_id !== userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'Access denied' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log the payment initialization
  console.log(`[document-payment] Initializing payment for ${documentType}`, {
    reference: paymentReference,
    amount,
    method: paymentMethod,
    userId,
  });

  // Update the document request with payment reference
  const { error: updateError } = await supabase
    .from('paid_document_requests')
    .update({
      payment_reference: paymentReference,
      payment_gateway: paymentMethod,
    })
    .eq('id', documentRequestId);

  if (updateError) {
    console.error('Failed to update document request:', updateError);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update document request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // In production, integrate with actual payment gateway
  // For now, return mock response
  const documentLabel = documentType === 'business_plan' ? 'AI Business Plan' : 'AI Pitch Deck';

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        payment_url: paymentMethod === 'card' 
          ? `${lencoApiUrl}/checkout?ref=${paymentReference}` 
          : undefined,
        reference: paymentReference,
        message: paymentMethod === 'mobile_money'
          ? `Payment request sent to your ${provider?.toUpperCase()} phone for ${documentLabel}`
          : 'Redirect to complete card payment',
      },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleVerify(
  body: DocumentPaymentRequest,
  supabase: ReturnType<typeof createClient>,
  lencoApiUrl: string,
  lencoApiKey: string
): Promise<Response> {
  const { paymentReference } = body;

  if (!paymentReference) {
    return new Response(
      JSON.stringify({ success: false, error: 'Payment reference required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get document request by payment reference
  const { data: docRequest, error: fetchError } = await supabase
    .from('paid_document_requests')
    .select('*')
    .eq('payment_reference', paymentReference)
    .single();

  if (fetchError || !docRequest) {
    return new Response(
      JSON.stringify({ success: false, error: 'Document request not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        status: docRequest.payment_status,
        generation_status: docRequest.generation_status,
        amount: docRequest.amount,
        currency: docRequest.currency,
      },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
