import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionRequest {
  action: 'subscribe' | 'cancel' | 'change_plan' | 'get_plans' | 'get_subscription';
  plan_id?: string;
  currency?: string;
  new_plan_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const body: SubscriptionRequest = await req.json();
    const { action } = body;

    console.log(`Processing subscription action: ${action} for user: ${user.id}`);

    switch (action) {
      case 'get_plans': {
        const { data: plans, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price_zmw', { ascending: true });

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch plans' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, plans }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_subscription': {
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select(`
            *,
            plan:subscription_plans(*)
          `)
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Failed to fetch subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            subscription: subscription || null,
            has_active_subscription: !!subscription 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'subscribe': {
        const { plan_id, currency = 'ZMW' } = body;
        
        if (!plan_id) {
          return new Response(
            JSON.stringify({ error: 'Plan ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get plan details
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', plan_id)
          .eq('is_active', true)
          .single();

        if (planError || !plan) {
          return new Response(
            JSON.stringify({ error: 'Plan not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check for existing active subscription
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .single();

        if (existingSub) {
          return new Response(
            JSON.stringify({ error: 'User already has an active subscription. Please cancel first or change plan.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate period end (1 month from now for monthly, 1 year for yearly)
        const now = new Date();
        const periodEnd = new Date(now);
        if (plan.billing_interval === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Create subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            plan_id: plan.id,
            status: 'trialing',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            trial_end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 day trial
            currency
          })
          .select()
          .single();

        if (subError) {
          console.error('Error creating subscription:', subError);
          return new Response(
            JSON.stringify({ error: 'Failed to create subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get price for payment
        const price = currency === 'USD' ? plan.price_usd : plan.price_zmw;

        // If plan is free, activate immediately
        if (price === 0) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('id', subscription.id);
          
          subscription.status = 'active';
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              subscription,
              message: 'Subscription activated successfully (free plan)'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create payment transaction
        const reference = `SUB-${subscription.id.substring(0, 8)}-${Date.now()}`;
        
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'subscription',
            amount: price,
            currency,
            platform_fee: 0, // No platform fee on subscriptions
            net_amount: price,
            status: 'pending',
            lenco_reference: reference,
            subscription_id: subscription.id,
            description: `Subscription: ${plan.name}`
          })
          .select()
          .single();

        return new Response(
          JSON.stringify({ 
            success: true, 
            subscription,
            payment: {
              transaction_id: transaction?.id,
              reference,
              amount: price,
              currency,
              status: 'pending'
            },
            message: 'Subscription created. Please complete payment to activate.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancel': {
        // Get current subscription
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing', 'past_due'])
          .single();

        if (subError || !subscription) {
          return new Response(
            JSON.stringify({ error: 'No active subscription found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark subscription for cancellation at period end
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            cancel_at_period_end: true,
            cancelled_at: new Date().toISOString()
          })
          .eq('id', subscription.id);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to cancel subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Subscription will be cancelled at the end of the current period (${subscription.current_period_end})`,
            cancel_date: subscription.current_period_end
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'change_plan': {
        const { new_plan_id, currency = 'ZMW' } = body;
        
        if (!new_plan_id) {
          return new Response(
            JSON.stringify({ error: 'New plan ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get current subscription
        const { data: currentSub, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .single();

        if (subError || !currentSub) {
          return new Response(
            JSON.stringify({ error: 'No active subscription found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get new plan
        const { data: newPlan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', new_plan_id)
          .eq('is_active', true)
          .single();

        if (planError || !newPlan) {
          return new Response(
            JSON.stringify({ error: 'New plan not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update subscription with new plan
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_id: new_plan_id,
            currency
          })
          .eq('id', currentSub.id);

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'Failed to change plan' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If upgrading, may need to process payment difference
        // For now, plan change takes effect at next billing cycle
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Plan changed to ${newPlan.name}. Changes take effect on next billing cycle.`,
            new_plan: newPlan
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
    console.error('Subscription processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});