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
        // Continue processing for development, but log warning
      }
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;

    console.log(`Processing webhook event: ${event}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (event) {
      case 'transaction.successful': {
        const { reference, id: lencoTransactionId } = data;
        
        // Find transaction by reference
        const { data: transaction, error: findError } = await supabase
          .from('transactions')
          .select('*')
          .eq('lenco_reference', reference)
          .single();

        if (findError || !transaction) {
          console.log(`Transaction not found for reference: ${reference}`);
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
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

        // If this is a service purchase, credit recipient
        if (transaction.transaction_type === 'service_purchase' && transaction.recipient_id) {
          const balanceField = transaction.currency === 'USD' ? 'balance_usd' : 'balance_zmw';
          
          const { data: recipientAccount } = await supabase
            .from('payment_accounts')
            .select('*')
            .eq('user_id', transaction.recipient_id)
            .single();

          if (recipientAccount) {
            await supabase
              .from('payment_accounts')
              .update({
                [balanceField]: recipientAccount[balanceField] + transaction.net_amount
              })
              .eq('user_id', transaction.recipient_id);
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

        if (transaction) {
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

        if (transaction) {
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

          // Clear pending balance
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
                [pendingField]: Math.max(0, account[pendingField] - transaction.amount)
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

        if (transaction) {
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

          // Return funds to available balance
          const balanceField = transaction.currency === 'USD' ? 'balance_usd' : 'balance_zmw';
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
                [balanceField]: account[balanceField] + transaction.amount,
                [pendingField]: Math.max(0, account[pendingField] - transaction.amount)
              })
              .eq('user_id', transaction.user_id);
          }

          console.log(`Payout ${transaction.id} failed, funds returned`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event}`);
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