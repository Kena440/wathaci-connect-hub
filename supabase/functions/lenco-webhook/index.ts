import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lenco-signature',
};

async function verifySignature(secret: string, payload: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === computedSignature;
  } catch {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('LENCO_WEBHOOK_SECRET')!;

    // Get signature from header
    const signature = req.headers.get('x-lenco-signature');
    const rawBody = await req.text();

    console.log('Webhook received:', rawBody.substring(0, 200));

    // Verify webhook signature
    if (signature && webhookSecret) {
      const isValid = await verifySignature(webhookSecret, rawBody, signature);
      if (!isValid) {
        console.warn('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;
    const eventId = data?.id || data?.reference || `${event}-${Date.now()}`;

    console.log(`Processing webhook event: ${event}, eventId: ${eventId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // IDEMPOTENCY CHECK: Store webhook event to prevent duplicate processing
    const { data: existingEvent, error: checkError } = await supabase
      .from('webhook_events')
      .select('id, processed')
      .eq('provider', 'lenco')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      console.log(`Webhook event ${eventId} already processed, skipping`);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert webhook event for idempotency tracking
    const { error: insertEventError } = await supabase
      .from('webhook_events')
      .insert({
        provider: 'lenco',
        event_id: eventId,
        event_type: event,
        payload: payload,
        processed: false
      });

    if (insertEventError) {
      // If insert fails due to unique constraint, another request already handled it
      if (insertEventError.code === '23505') {
        console.log(`Concurrent webhook event ${eventId} detected, skipping`);
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.error('Error inserting webhook event:', insertEventError);
    }

    try {
      switch (event) {
        case 'transaction.successful': {
          const { reference, id: lencoTransactionId, amount, currency } = data;
          
          // Find transaction by reference
          const { data: transaction, error: findError } = await supabase
            .from('transactions')
            .select('*')
            .eq('lenco_reference', reference)
            .single();

          if (findError || !transaction) {
            console.log(`Transaction not found for reference: ${reference}`);
            break;
          }

          // Check if already processed (idempotency at transaction level)
          if (transaction.status === 'successful') {
            console.log(`Transaction ${transaction.id} already successful, skipping`);
            break;
          }

          // Update transaction status
          await supabase
            .from('transactions')
            .update({
              status: 'successful',
              lenco_transaction_id: lencoTransactionId,
              metadata: {
                ...transaction.metadata,
                completed_at: new Date().toISOString(),
                lenco_data: data
              }
            })
            .eq('id', transaction.id);

          // Use atomic wallet transaction function for deposits
          if (transaction.transaction_type === 'deposit') {
            const { data: walletResult, error: walletError } = await supabase.rpc(
              'apply_wallet_transaction',
              {
                p_user_id: transaction.user_id,
                p_amount: transaction.amount,
                p_currency: transaction.currency,
                p_transaction_type: 'deposit',
                p_description: 'Wallet top-up via Lenco',
                p_idempotency_key: `lenco-${eventId}`,
                p_provider: 'lenco',
                p_provider_reference: reference,
                p_metadata: { lenco_transaction_id: lencoTransactionId }
              }
            );

            if (walletError) {
              console.error('Wallet transaction error:', walletError);
            } else {
              console.log('Wallet transaction result:', walletResult);
            }
          }

          // If this is a service purchase, credit recipient atomically
          if (transaction.transaction_type === 'service_purchase' && transaction.recipient_id) {
            const { error: creditError } = await supabase.rpc(
              'apply_wallet_transaction',
              {
                p_user_id: transaction.recipient_id,
                p_amount: transaction.net_amount,
                p_currency: transaction.currency,
                p_transaction_type: 'service_payment',
                p_description: 'Service payment received',
                p_idempotency_key: `lenco-service-${eventId}`,
                p_provider: 'lenco',
                p_provider_reference: reference
              }
            );

            if (creditError) {
              console.error('Service credit error:', creditError);
            }
          }

          // If this is a subscription payment, activate subscription
          if (transaction.transaction_type === 'subscription' && transaction.subscription_id) {
            await supabase
              .from('subscriptions')
              .update({ status: 'active' })
              .eq('id', transaction.subscription_id);
          }

          console.log(`Transaction ${transaction.id} marked as successful`);
          break;
        }

        case 'transaction.failed': {
          const { reference, reason } = data;
          
          const { data: transaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('lenco_reference', reference)
            .single();

          if (transaction && transaction.status !== 'failed') {
            await supabase
              .from('transactions')
              .update({
                status: 'failed',
                metadata: {
                  ...transaction.metadata,
                  failed_at: new Date().toISOString(),
                  failure_reason: reason
                }
              })
              .eq('id', transaction.id);

            console.log(`Transaction ${transaction.id} marked as failed: ${reason}`);
          }
          break;
        }

        case 'payout.successful': {
          const { reference, id: lencoTransactionId } = data;
          
          const { data: transaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('lenco_reference', reference)
            .single();

          if (transaction && transaction.status !== 'successful') {
            await supabase
              .from('transactions')
              .update({
                status: 'successful',
                lenco_transaction_id: lencoTransactionId,
                metadata: {
                  ...transaction.metadata,
                  payout_completed_at: new Date().toISOString()
                }
              })
              .eq('id', transaction.id);

            // Clear pending balance atomically
            const pendingField = transaction.currency === 'USD' ? 'pending_balance_usd' : 'pending_balance_zmw';
            
            const { data: account } = await supabase
              .from('payment_accounts')
              .select('*')
              .eq('user_id', transaction.user_id)
              .single();

            if (account) {
              await supabase
                .from('payment_accounts')
                .update({
                  [pendingField]: Math.max(0, (account as any)[pendingField] - transaction.amount)
                })
                .eq('user_id', transaction.user_id);
            }

            console.log(`Payout ${transaction.id} completed`);
          }
          break;
        }

        case 'payout.failed': {
          const { reference, reason } = data;
          
          const { data: transaction } = await supabase
            .from('transactions')
            .select('*')
            .eq('lenco_reference', reference)
            .single();

          if (transaction && transaction.status !== 'failed') {
            await supabase
              .from('transactions')
              .update({
                status: 'failed',
                metadata: {
                  ...transaction.metadata,
                  payout_failed_at: new Date().toISOString(),
                  failure_reason: reason
                }
              })
              .eq('id', transaction.id);

            // Return funds to available balance atomically using RPC
            const { error: refundError } = await supabase.rpc(
              'apply_wallet_transaction',
              {
                p_user_id: transaction.user_id,
                p_amount: transaction.amount,
                p_currency: transaction.currency,
                p_transaction_type: 'refund',
                p_description: 'Payout failed - funds returned',
                p_idempotency_key: `lenco-payout-failed-${eventId}`,
                p_provider: 'lenco',
                p_provider_reference: reference
              }
            );

            if (refundError) {
              console.error('Refund error:', refundError);
            }

            console.log(`Payout ${transaction.id} failed, funds returned`);
          }
          break;
        }

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      // Mark webhook event as processed
      await supabase
        .from('webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('provider', 'lenco')
        .eq('event_id', eventId);

    } catch (processingError) {
      console.error('Error processing webhook:', processingError);
      
      // Update webhook event with error
      await supabase
        .from('webhook_events')
        .update({ 
          error: processingError instanceof Error ? processingError.message : 'Unknown error'
        })
        .eq('provider', 'lenco')
        .eq('event_id', eventId);
    }

    return new Response(
      JSON.stringify({ received: true, event }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Return 200 to acknowledge receipt even on error
    return new Response(
      JSON.stringify({ received: true, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
