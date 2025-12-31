import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LENCO_API_URL = 'https://api.lenco.co/access/v1';

interface PaymentRequest {
  action: 'initiate' | 'verify' | 'get_fee' | 'request_payout';
  amount?: number;
  currency?: string;
  description?: string;
  recipient_id?: string;
  transaction_type?: string;
  reference?: string;
  transaction_id?: string;
  bank_code?: string;
  account_number?: string;
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
        const { amount, currency = 'ZMW', description, recipient_id, transaction_type = 'service_purchase' } = body;
        
        if (!amount || amount <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate platform fee using the database function
        const { data: feeData } = await supabase
          .rpc('calculate_platform_fee', { p_amount: amount, p_currency: currency });
        
        const platformFee = feeData || (amount * 0.05);
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
              ip_address: req.headers.get('x-forwarded-for') || 'unknown'
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

        // Initialize payment with Lenco
        // Note: This is a simplified version - actual Lenco API may differ
        const lencoResponse = await fetch(`${LENCO_API_URL}/virtual-accounts`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${lencoApiToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!lencoResponse.ok) {
          console.error('Lenco API error:', await lencoResponse.text());
          // Still return success with pending status for manual processing
        }

        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: transaction.id,
            reference,
            amount,
            currency,
            platform_fee: platformFee,
            net_amount: netAmount,
            status: 'pending',
            message: 'Payment initiated. Please complete payment to the provided account.',
            payment_details: {
              bank_name: 'Lenco Bank',
              account_number: 'Payment link will be provided',
              reference,
            }
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

        return new Response(
          JSON.stringify({
            success: true,
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
        const reference = `PAYOUT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'payout',
            amount,
            currency,
            status: 'processing',
            lenco_reference: reference,
            description: 'Withdrawal request',
            metadata: {
              bank_code,
              account_number,
              requested_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (txError) {
          console.error('Error creating payout transaction:', txError);
          return new Response(
            JSON.stringify({ error: 'Failed to initiate payout' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update pending balance
        const pendingField = currency === 'USD' ? 'pending_balance_usd' : 'pending_balance_zmw';
        await supabase
          .from('payment_accounts')
          .update({
            [balanceField]: account[balanceField] - amount,
            [pendingField]: account[pendingField] + amount
          })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payout request submitted. Processing may take 1-3 business days.',
            transaction_id: transaction.id,
            reference,
            amount,
            currency,
            status: 'processing'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});