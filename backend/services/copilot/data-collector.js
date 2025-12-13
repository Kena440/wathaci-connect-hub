const { getSupabaseClient, isSupabaseConfigured } = require('../../lib/supabaseAdmin');
const { getLatestByCompany } = require('../diagnostics-store');

const getSupabase = () => {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseClient();
};

async function fetchProfile(profileId) {
  const supabase = getSupabase();
  if (!supabase) return { id: profileId, profile_type: 'sme' };
  const tables = ['sme_profiles', 'profiles', 'professional_profiles'];
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*').eq('id', profileId).maybeSingle();
    if (data) return data;
  }
  return { id: profileId };
}

async function fetchDocuments(profileId) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('paid_document_requests')
    .select('id, document_type, payment_status, generation_status, created_at')
    .eq('company_id', profileId)
    .order('created_at', { ascending: false });
  return data || [];
}

async function fetchCreditPassports(profileId) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('credit_passports')
    .select('id, status, created_at')
    .eq('company_id', profileId)
    .order('created_at', { ascending: false });
  return data || [];
}

async function fetchPaymentReadiness(profileId) {
  const supabase = getSupabase();
  if (!supabase) return { configured: false };
  const { data } = await supabase
    .from('payment_intents')
    .select('id, status, created_at')
    .eq('company_id', profileId)
    .limit(1)
    .maybeSingle();
  return { configured: Boolean(data), last_status: data?.status };
}

async function fetchActivity(profileId) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from('audit_logs')
    .select('id, event_type, created_at')
    .eq('actor_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

async function collect(profileId, profileType = 'sme') {
  const profile = await fetchProfile(profileId);
  const diagnostics = getLatestByCompany(profileId) || null;
  const documents = await fetchDocuments(profileId);
  const creditPassports = await fetchCreditPassports(profileId);
  const paymentReadiness = await fetchPaymentReadiness(profileId);
  const activity = await fetchActivity(profileId);

  return {
    profile: { ...profile, profile_type: profileType },
    diagnostics,
    documents,
    credit_passports: creditPassports,
    payment_readiness: paymentReadiness,
    activity_summary: activity,
  };
}

module.exports = { collect };
