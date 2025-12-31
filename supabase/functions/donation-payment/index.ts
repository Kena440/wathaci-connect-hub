import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LENCO_API_URL = 'https://api.lenco.co/v2';

interface DonationRequest {
  amount: number;
  currency?: string;
  donor_name?: string;
  donor_email?: string;
  message?: string;
  payment_method: string;
  payment_provider?: string;
  phone_number?: string;
  success_url?: string;
  cancel_url?: string;
}

// Map provider names to Lenco operator codes
function mapProviderToOperator(provider: string): string {
  const providerMap: Record<string, string> = {
    'mtn': 'MTN',
    'airtel': 'AIRTEL',
    'zamtel': 'ZAMTEL'
  };
  return providerMap[provider.toLowerCase()] || provider.toUpperCase();
}

// Format phone number to international format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 260
  if (cleaned.startsWith('0')) {
    cleaned = '260' + cleaned.substring(1);
  }
  
  // If doesn't start with 260, add it
  if (!cleaned.startsWith('260')) {
    cleaned = '260' + cleaned;
  }
  
  return cleaned;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lencoApiToken = Deno.env.get('LENCO_API_TOKEN');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!lencoApiToken) {
      console.error('LENCO_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      phone_number,
      success_url,
      cancel_url
    } = body;

    console.log(`Processing donation: ${currency} ${amount} via ${payment_method}`);

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

    // Mobile Money Payment via Lenco
    if (payment_method === 'mobile_money' && phone_number && payment_provider) {
      const formattedPhone = formatPhoneNumber(phone_number);
      const operator = mapProviderToOperator(payment_provider);
      
      console.log(`Initiating Lenco mobile money payment: ${operator} - ${formattedPhone}`);

      try {
        const lencoResponse = await fetch(`${LENCO_API_URL}/collections/mobile-money`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lencoApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount.toFixed(2),
            currency: currency,
            reference: reference,
            customer: {
              name: donor_name || 'Anonymous Donor',
              email: donor_email || 'donor@wathaci.com'
            },
            mobileMoney: {
              phone: formattedPhone,
              country: 'ZM',
              operator: operator
            }
          })
        });

        const lencoData = await lencoResponse.json();
        console.log('Lenco API response:', JSON.stringify(lencoData));

        if (!lencoResponse.ok) {
          console.error('Lenco API error:', lencoData);
          
          // Update donation status to failed
          await supabase
            .from('donations')
            .update({ status: 'failed' })
            .eq('id', donation.id);

          return new Response(
            JSON.stringify({ 
              success: false, 
              error: lencoData.message || 'Payment initiation failed',
              details: lencoData
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const paymentData = lencoData.data;
        const paymentStatus = paymentData?.status;

        // Update donation with Lenco reference
        await supabase
          .from('donations')
          .update({ 
            status: paymentStatus === 'successful' ? 'successful' : 'processing',
            payment_reference: paymentData?.lencoReference || reference
          })
          .eq('id', donation.id);

        // Handle different Lenco statuses
        if (paymentStatus === 'otp-required') {
          return new Response(
            JSON.stringify({
              success: true,
              transaction_id: donation.id,
              reference: paymentData?.lencoReference || reference,
              status: 'otp-required',
              lenco_id: paymentData?.id,
              message: 'An OTP has been sent to your phone. Please enter it to complete the payment.',
              requires_otp: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (paymentStatus === 'pay-offline') {
          return new Response(
            JSON.stringify({
              success: true,
              transaction_id: donation.id,
              reference: paymentData?.lencoReference || reference,
              status: 'pending',
              lenco_id: paymentData?.id,
              message: `Please approve the payment of K${amount} on your ${operator} mobile money. Check your phone for the authorization prompt.`,
              payment_instructions: {
                provider: operator,
                phone: formattedPhone,
                amount: `K${amount}`,
                action: 'Authorize the payment on your phone'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (paymentStatus === 'successful') {
          return new Response(
            JSON.stringify({
              success: true,
              transaction_id: donation.id,
              reference: paymentData?.lencoReference || reference,
              status: 'successful',
              message: 'Payment completed successfully! Thank you for your donation.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Default response for other statuses
        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: donation.id,
            reference: paymentData?.lencoReference || reference,
            status: paymentStatus || 'pending',
            lenco_id: paymentData?.id,
            message: 'Payment is being processed. Please check your phone for any authorization prompts.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (lencoError) {
        console.error('Lenco API request failed:', lencoError);
        
        await supabase
          .from('donations')
          .update({ status: 'failed' })
          .eq('id', donation.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to connect to payment gateway',
            details: lencoError instanceof Error ? lencoError.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Card Payment via Lenco Checkout
    if (payment_method === 'card') {
      console.log('Initiating Lenco card checkout session');

      try {
        const baseUrl = req.headers.get('origin') || 'https://wathaci.com';
        
        const lencoResponse = await fetch(`${LENCO_API_URL}/checkout/sessions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lencoApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount.toFixed(2),
            currency: currency,
            reference: reference,
            customer: {
              name: donor_name || 'Anonymous Donor',
              email: donor_email || 'donor@wathaci.com'
            },
            successUrl: success_url || `${baseUrl}/donate?status=success&ref=${reference}`,
            cancelUrl: cancel_url || `${baseUrl}/donate?status=cancelled&ref=${reference}`
          })
        });

        const lencoData = await lencoResponse.json();
        console.log('Lenco Checkout response:', JSON.stringify(lencoData));

        if (!lencoResponse.ok) {
          console.error('Lenco Checkout error:', lencoData);
          
          await supabase
            .from('donations')
            .update({ status: 'failed' })
            .eq('id', donation.id);

          return new Response(
            JSON.stringify({ 
              success: false, 
              error: lencoData.message || 'Failed to create checkout session',
              details: lencoData
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update donation status
        await supabase
          .from('donations')
          .update({ status: 'processing' })
          .eq('id', donation.id);

        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: donation.id,
            reference: reference,
            status: 'redirect',
            checkout_url: lencoData.data?.checkoutUrl || lencoData.checkoutUrl,
            message: 'Redirecting to secure payment page...'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (checkoutError) {
        console.error('Lenco Checkout request failed:', checkoutError);
        
        await supabase
          .from('donations')
          .update({ status: 'failed' })
          .eq('id', donation.id);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to create checkout session',
            details: checkoutError instanceof Error ? checkoutError.message : 'Unknown error'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback for unknown payment methods
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unsupported payment method',
        transaction_id: donation.id,
        reference
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
