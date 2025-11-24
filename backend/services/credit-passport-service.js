const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');
const { generatePassportOutputs } = require('./credit-passport-scoring');

const TABLE = 'credit_passport_runs';
const PRICING = {
  generate: 100,
  share: 50,
  pdf: 50,
  currency: 'ZMW',
};

const getSupabaseOrThrow = () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client unavailable');
  }
  return client;
};

const resolveAmount = action => {
  if (action === 'share') return PRICING.share;
  if (action === 'pdf') return PRICING.pdf;
  return PRICING.generate;
};

async function createPassportRun(payload) {
  const supabase = getSupabaseOrThrow();
  if (!payload.user_id || !payload.company_id) {
    throw new Error('user_id and company_id are required');
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: payload.user_id,
      company_id: payload.company_id,
      input_data: payload.input_data || {},
      payment_status: payload.payment_status || 'pending',
      amount: payload.amount || PRICING.generate,
      currency: payload.currency || PRICING.currency,
      payment_reference: payload.payment_reference,
      payment_gateway: payload.payment_gateway || payload.payment_method || 'manual',
      share_count: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function updatePaymentStatus(id, status, metadata = {}) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      payment_status: status,
      payment_reference: metadata.reference || undefined,
      payment_gateway: metadata.gateway || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function getPassportRun(id, userId) {
  const supabase = getSupabaseOrThrow();
  let query = supabase.from(TABLE).select('*').eq('id', id);
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query.single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

async function listPassportRuns(userId) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

async function generatePassport(id, userId) {
  const supabase = getSupabaseOrThrow();
  const record = await getPassportRun(id, userId);

  if (record.payment_status !== 'success') {
    const error = new Error('Payment not completed for this passport run');
    error.status = 403;
    throw error;
  }

  const output = generatePassportOutputs(record.input_data || {});

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      output_data: output,
      fundability_score: output.fundabilityScore,
      risk_profile: output.riskProfile,
      resilience_score: output.resilienceScore,
      liquidity_index: output.liquidityIndex,
      repayment_capacity: output.repaymentCapacity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function recordShare(id, { userId, paymentStatus, gateway, reference }) {
  const supabase = getSupabaseOrThrow();
  const record = await getPassportRun(id, userId);

  if (paymentStatus !== 'success') {
    const error = new Error('Share payment must be completed before sharing');
    error.status = 402;
    throw error;
  }

  if (record.payment_status !== 'success') {
    const error = new Error('Passport generation payment missing. Pay for generation first.');
    error.status = 402;
    throw error;
  }

  const newShareCount = (record.share_count || 0) + 1;
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      share_count: newShareCount,
      updated_at: new Date().toISOString(),
      last_share_reference: reference,
      last_share_gateway: gateway,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function markPdfPayment(id, { userId, paymentStatus, gateway, reference }) {
  const supabase = getSupabaseOrThrow();
  const record = await getPassportRun(id, userId);

  if (paymentStatus !== 'success') {
    const error = new Error('PDF payment must be completed before download');
    error.status = 402;
    throw error;
  }

  if (record.payment_status !== 'success') {
    const error = new Error('Pay for generation before downloading the PDF');
    error.status = 402;
    throw error;
  }

  const pdfUrl = record.pdf_url || `https://storage.wathaci-connect.local/passports/${record.id}/passport.pdf`;

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      pdf_url: pdfUrl,
      updated_at: new Date().toISOString(),
      last_pdf_reference: reference,
      last_pdf_gateway: gateway,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

module.exports = {
  PRICING,
  resolveAmount,
  createPassportRun,
  updatePaymentStatus,
  getPassportRun,
  listPassportRuns,
  generatePassport,
  recordShare,
  markPdfPayment,
};
