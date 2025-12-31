import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, applicationData, partnerId, referralCode } = await req.json();
    console.log('Partnership manager action:', action);

    switch (action) {
      case 'submit_application': {
        const { data, error } = await supabase
          .from('partnership_applications')
          .insert({
            company_name: applicationData.companyName,
            contact_name: applicationData.contactName,
            email: applicationData.email,
            phone: applicationData.phone,
            partnership_type: applicationData.partnershipType,
            description: applicationData.description,
            website: applicationData.website,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_partners': {
        const { data, error } = await supabase
          .from('partners')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_partner_dashboard': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        // Get partner info
        const { data: partner, error: partnerError } = await supabase
          .from('partners')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (partnerError) throw new Error('Partner not found');

        // Get referrals
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*')
          .eq('partner_id', partner.id)
          .order('created_at', { ascending: false });

        // Calculate stats
        const totalReferrals = referrals?.length || 0;
        const convertedReferrals = referrals?.filter(r => r.status === 'converted').length || 0;
        const totalEarnings = referrals?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;
        const pendingEarnings = referrals?.filter(r => !r.commission_paid).reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

        return new Response(JSON.stringify({
          success: true,
          data: {
            partner,
            referrals,
            stats: {
              totalReferrals,
              convertedReferrals,
              conversionRate: totalReferrals > 0 ? (convertedReferrals / totalReferrals * 100).toFixed(1) : 0,
              totalEarnings,
              pendingEarnings
            }
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_referral_code': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { data: partner } = await supabase
          .from('partners')
          .select('id, company_name')
          .eq('user_id', user.id)
          .single();

        if (!partner) throw new Error('Partner not found');

        // Generate unique referral code
        const code = `${partner.company_name.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        return new Response(JSON.stringify({ success: true, referralCode: code }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'track_referral': {
        // Find partner by referral code
        const { data: referral } = await supabase
          .from('referrals')
          .select('*, partner:partners(*)')
          .eq('referral_code', referralCode)
          .single();

        if (referral) {
          // Update referral status
          await supabase
            .from('referrals')
            .update({ status: 'registered' })
            .eq('id', referral.id);

          return new Response(JSON.stringify({ 
            success: true, 
            partner: referral.partner?.company_name 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: false, error: 'Invalid referral code' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create_referral': {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Authorization required');

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        if (authError || !user) throw new Error('Unauthorized');

        const { data: partner } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!partner) throw new Error('Partner not found');

        const { referredEmail } = await req.json();
        const code = `REF-${Date.now().toString(36).toUpperCase()}`;

        const { data, error } = await supabase
          .from('referrals')
          .insert({
            partner_id: partner.id,
            referred_email: referredEmail,
            referral_code: code,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    console.error('Partnership manager error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
