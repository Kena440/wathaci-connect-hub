import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { activateSubscriptionForTransaction } from "../_shared/subscription-activation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LENCO_API_URL = 'https://api.lenco.co/access/v1';

interface PaymentRequest {
  action: 'initiate' | 'verify' | 'get_fee' | 'request_payout' | 'submit_otp';
  amount?: number;
  currency?: string;
  description?: string;
  recipient_id?: string;
  transaction_type?: string;
  reference?: string;
  transaction_id?: string;
  bank_code?: string;
  account_number?: string;
  phone?: string;
  operator?: 'mtn' | 'airtel' | 'zamtel';
  otp?: string;
  collection_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lencoApiToken = Deno.env.get('LENCO_API_TOKEN')!;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PaymentRequest = await req.json();
    const { action } = body;

    console.log(`Processing payment action: ${action} for user: ${user.id}`);

    switch (action) {
      case 'initiate': {
        const {
          amount, currency = 'ZMW', description, recipient_id,
          transaction_type = 'service_purchase', phone, operator
        } = body;

        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!phone || !operator) {
          return new Response(
            JSON.stringify({ error: 'Mobile money phone number and operator (mtn/airtel/zamtel) are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate platform fee using the database function
        const { data: feeData } = await supabase
          .rpc('calculate_platform_fee', { p_amount: amount, p_currency: currency });

        const platformFee = transaction_type === 'deposit' ? 0 : (feeData || (amount * 0.05));
        const netAmount = amount - platformFee;

        // Generate unique reference
        const reference = `WATHACI-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Create transaction record
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            recipient_id: recipient_id || null,
            transaction_type,
            amount,
            currency,
            platform_fee: platformFee,
            net_amount: netAmount,
            status: 'pending',
            lenco_reference: reference,
            description,
            metadata: {
              initiated_at: new Date().toISOString(),
              ip_address: req.headers.get('x-forwarded-for') || 'unknown',
              phone,
              operator,
            }
          })
          .select()
          .single();

        if (txError) {
          console.error('Error creating transaction:', txError);
          return new Response(
            JSON.stringify({ error: 'Failed to create transaction record' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Real Lenco mobile money collection call.
        // NOTE: amount format (major units vs subunits) is assumed to match
        // Lenco's documented example (e.g. "50" = K50) — verify against a
        // real sandbox response before trusting this with live money.
        const lencoResponse = await fetch(`${LENCO_API_URL}/collections/mobile-money`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lencoApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount.toString(),
            reference,
            phone,
            operator,
            country: 'zm',
            bearer: 'merchant',
          }),
        });

        const lencoData = await lencoResponse.json().catch(() => null);

        if (!lencoResponse.ok || !lencoData) {
          console.error('Lenco collection error:', lencoData);
          await supabase
            .from('transactions')
            .update({ status: 'failed', metadata: { ...transaction.metadata, lenco_error: lencoData } })
            .eq('id', transaction.id);

          return new Response(
            JSON.stringify({ error: 'Payment could not be initiated with the mobile money provider' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const collectionStatus = lencoData.data?.status; // 'otp-required' | 'pay-offline' | 'pending' | 'successful' | 'failed'
        const collectionId = lencoData.data?.id;

        await supabase
          .from('transactions')
          .update({
            lenco_transaction_id: collectionId,
            status: collectionStatus === 'successful' ? 'successful' : collectionStatus === 'failed' ? 'failed' : 'pending',
            metadata: { ...transaction.metadata, lenco_status: collectionStatus },
          })
          .eq('id', transaction.id);

        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: transaction.id,
            reference,
            amount,
            currency,
            platform_fee: platformFee,
            net_amount: netAmount,
            status: collectionStatus,
            collection_id: collectionId,
            message:
              collectionStatus === 'otp-required'
                ? 'Enter the OTP sent to your phone to complete payment.'
                : collectionStatus === 'pay-offline'
                ? 'Authorize this payment on your phone to complete it.'
                : 'Payment initiated.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'verify': {
        const { reference, transaction_id } = body;
        
        if (!reference && !transaction_id) {
          return new Response(
            JSON.stringify({ error: 'Reference or transaction_id required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get transaction from database
        let query = supabase.from('transactions').select('*');
        
        if (reference) {
          query = query.eq('lenco_reference', reference);
        } else if (transaction_id) {
          query = query.eq('id', transaction_id);
        }
        
        const { data: transaction, error: txError } = await query.single();

        if (txError || !transaction) {
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify user owns this transaction
        if (transaction.user_id !== user.id && transaction.recipient_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If transaction has Lenco transaction ID, verify with Lenco
        if (transaction.lenco_transaction_id) {
          const lencoVerify = await fetch(
            `${LENCO_API_URL}/transactions/${transaction.lenco_transaction_id}`,
            {
              headers: {
                'Authorization': `Bearer ${lencoApiToken}`,
              },
            }
          );

          if (lencoVerify.ok) {
            const lencoData = await lencoVerify.json();
            
            // Update transaction status based on Lenco response
            if (lencoData.data?.status === 'successful' && transaction.status !== 'successful') {
              await supabase
                .from('transactions')
                .update({ 
                  status: 'successful',
                  metadata: { ...transaction.metadata, lenco_verified_at: new Date().toISOString() }
                })
                .eq('id', transaction.id);
              
              transaction.status = 'successful';
            }
          }
        }

        // Safety net: the lenco-webhook is the primary path that activates a
        // subscription, but it can be delayed or never fire. If the payment is
        // confirmed successful, make sure the linked subscription is active.
        // This is idempotent — a no-op when the webhook already handled it.
        let subscriptionActivated = false;
        if (transaction.status === 'successful') {
          const activation = await activateSubscriptionForTransaction(supabase, transaction);
          subscriptionActivated = activation.activated;
        }

        return new Response(
          JSON.stringify({
            success: true,
            subscription_activated: subscriptionActivated,
            transaction: {
              id: transaction.id,
              reference: transaction.lenco_reference,
              amount: transaction.amount,
              currency: transaction.currency,
              status: transaction.status,
              platform_fee: transaction.platform_fee,
              net_amount: transaction.net_amount,
              created_at: transaction.created_at
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // NOTE: exact Submit-OTP endpoint path is my best reading of Lenco's docs,
      // not confirmed against a live sandbox response — verify before relying
      // on this in production, or dispatch me to verify it with real testing.
      case 'submit_otp': {
        const { collection_id, otp, transaction_id } = body;

        if (!collection_id || !otp) {
          return new Response(
            JSON.stringify({ error: 'collection_id and otp are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const otpResponse = await fetch(`${LENCO_API_URL}/collections/mobile-money/${collection_id}/otp`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lencoApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp }),
        });

        const otpData = await otpResponse.json().catch(() => null);

        if (!otpResponse.ok || !otpData) {
          return new Response(
            JSON.stringify({ error: 'OTP verification failed', details: otpData }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const finalStatus = otpData.data?.status;

        if (transaction_id) {
          await supabase
            .from('transactions')
            .update({ status: finalStatus === 'successful' ? 'successful' : 'pending' })
            .eq('id', transaction_id);
        }

        return new Response(
          JSON.stringify({ success: true, status: finalStatus }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_fee': {
        const { amount, currency = 'ZMW' } = body;
        
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: feeData } = await supabase
          .rpc('calculate_platform_fee', { p_amount: amount, p_currency: currency });

        const fee = feeData || (amount * 0.05);

        // Get fee tier for transparency
        const { data: tier } = await supabase
          .from('platform_fee_tiers')
          .select('fee_percentage')
          .eq('currency', currency)
          .eq('is_active', true)
          .gte('min_amount', amount)
          .order('min_amount', { ascending: true })
          .limit(1)
          .single();

        return new Response(
          JSON.stringify({
            success: true,
            amount,
            currency,
            platform_fee: fee,
            fee_percentage: tier?.fee_percentage || 5,
            net_amount: amount - fee
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'request_payout': {
        const { amount, currency = 'ZMW', bank_code, account_number } = body;
        
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check user's balance
        const { data: account, error: accountError } = await supabase
          .from('payment_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (accountError || !account) {
          return new Response(
            JSON.stringify({ error: 'Payment account not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const balanceField = currency === 'USD' ? 'balance_usd' : 'balance_zmw';
        if (account[balanceField] < amount) {
          return new Response(
            JSON.stringify({ error: 'Insufficient balance' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create payout transaction
        const reference =