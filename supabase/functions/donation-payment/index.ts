import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DonationRequest {
  amount: number;
  currency?: string;
  donor_name?: string;
  donor_email?: string;
  message?: string;
  payment_method: string;
  payment_provider?: string;
  phone_number?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header (optional for donations)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: DonationRequest = await req.json();
    const { 
      amount, 
      currency = 'ZMW', 
      donor_name, 
      donor_email, 
      message, 
      payment_method,
      payment_provider,
      phone_number 
    } = body;

    console.log(`Processing donation: K${amount} via ${payment_method}`);

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique reference
    const reference = `DON-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create donation record
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert({
        user_id: userId,
        amount,
        currency,
        donor_name,
        donor_email,
        message,
        payment_method,
        payment_provider,
        phone_number,
        payment_reference: reference,
        status: 'pending'
      })
      .select()
      .single();

    if (donationError) {
      console.error('Error creating donation:', donationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create donation record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For mobile money payments, we simulate sending a payment request
    // In production, this would integrate with MTN MoMo, Airtel Money, or Zamtel APIs
    if (payment_method === 'mobile_money' && phone_number && payment_provider) {
      console.log(`Sending ${payment_provider} payment request to ${phone_number}`);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update status to processing (in production, this would be 'pending' until webhook confirms)
      await supabase
        .from('donations')
        .update({ status: 'processing' })
        .eq('id', donation.id);

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: donation.id,
          reference,
          status: 'processing',
          message: `Payment request sent to ${phone_number}. Please approve the payment on your phone.`,
          payment_instructions: {
            provider: payment_provider,
            phone: phone_number,
            amount: `K${amount}`,
            reference
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For card payments, we would redirect to a payment gateway
    if (payment_method === 'card') {
      // In production, integrate with a card payment provider like PayChangu, DPO, or Stripe
      await supabase
        .from('donations')
        .update({ status: 'processing' })
        .eq('id', donation.id);

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: donation.id,
          reference,
          status: 'processing',
          message: 'Card payment processing. You will receive a confirmation shortly.',
          payment_instructions: {
            method: 'card',
            amount: `K${amount}`,
            reference
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as successful for demo purposes
    await supabase
      .from('donations')
      .update({ status: 'successful' })
      .eq('id', donation.id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: donation.id,
        reference,
        status: 'successful',
        message: 'Thank you for your donation! Your contribution will help Zambian SMEs grow.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Donation processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: 'Payment processing failed', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});