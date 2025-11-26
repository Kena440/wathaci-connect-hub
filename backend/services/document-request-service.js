const crypto = require('node:crypto');
const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');

const TABLE = 'paid_document_requests';
const SUPPORTED_TYPES = ['business_plan', 'pitch_deck', 'bundle'];
const DEFAULT_PRICE = 150;
const BUNDLE_PRICE = 300;

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

const resolveAmount = documentType => {
  if (documentType === 'bundle') return BUNDLE_PRICE;
  return DEFAULT_PRICE;
};

const normalizeDocumentType = documentType => {
  if (SUPPORTED_TYPES.includes(documentType)) return documentType;
  return null;
};

const createReceiptDetails = (request, amount) => {
  return {
    receipt_number: `REC-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
    issued_at: new Date().toISOString(),
    amount,
    currency: request.currency || 'ZMW',
    document_type: request.document_type,
    payment_reference: request.payment_reference,
  };
};

const generateSignedUrl = (path, expiresInSeconds = 1800) => {
  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const token = crypto.createHash('sha256').update(`${path}:${expiry}:${crypto.randomUUID()}`).digest('hex');
  return {
    path,
    signed_url: `https://storage.wathaci-connect.local/${path}?token=${token}&expires=${expiry}`,
    expires_at: new Date(expiresInSeconds * 1000 + Date.now()).toISOString(),
  };
};

const buildOutputFiles = (userId, requestId, documentType, modelVersion) => {
  const basePath = `storage/private/documents/${userId}/${requestId}/${documentType}`;
  return {
    pdf: generateSignedUrl(`${basePath}.pdf`),
    docx: generateSignedUrl(`${basePath}.docx`),
    pptx: generateSignedUrl(`${basePath}.pptx`),
    model_version: modelVersion,
    generated_at: new Date().toISOString(),
  };
};

async function createPaymentRequest(payload) {
  const supabase = getSupabaseOrThrow();
  const normalizedType = normalizeDocumentType(payload.document_type);
  if (!normalizedType) {
    throw new Error('Unsupported document type');
  }

  const amount = payload.amount || resolveAmount(normalizedType);
  const paymentReference = payload.payment_reference || `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: payload.user_id,
      company_id: payload.company_id || payload.user_id,
      document_type: normalizedType,
      input_data: payload.input_data || {},
      payment_status: payload.payment_status || 'pending',
      amount,
      currency: payload.currency || 'ZMW',
      payment_reference: paymentReference,
      payment_gateway: payload.payment_gateway || payload.payment_method || 'manual',
      generation_status: 'not_started',
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function markPaymentStatus(id, status, metadata = {}) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      payment_status: status,
      payment_gateway: metadata.gateway || undefined,
      payment_reference: metadata.reference || undefined,
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

async function getRequestById(id, userId) {
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

async function getRequestByPaymentReference(paymentReference) {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('payment_reference', paymentReference)
    .single();
  if (error) {
    const notFoundError = new Error(`Document request not found for payment reference: ${paymentReference}`);
    notFoundError.status = 404;
    throw notFoundError;
  }
  return data;
}

async function markPaymentStatusByReference(paymentReference, status, metadata = {}) {
  const supabase = getSupabaseOrThrow();
  
  // Build update object - store transaction_id in payment_gateway metadata, not in payment_reference
  const updateData = {
    payment_status: status,
    updated_at: new Date().toISOString(),
  };
  
  // Store transaction_id in a metadata-friendly way without overwriting payment_reference
  if (metadata.transaction_id) {
    updateData.payment_gateway = `${metadata.payment_gateway || 'webhook'}:${metadata.transaction_id}`;
  }
  
  const { data, error } = await supabase
    .from(TABLE)
    .update(updateData)
    .eq('payment_reference', paymentReference)
    .select()
    .single();

  if (error) {
    const notFoundError = new Error(`Document request not found for payment reference: ${paymentReference}`);
    notFoundError.status = 404;
    throw notFoundError;
  }
  return data;
}

async function listRequestsForUser(userId) {
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

async function generateDocument(id, userId) {
  const supabase = getSupabaseOrThrow();
  const request = await getRequestById(id, userId);

  if (request.payment_status !== 'success') {
    const error = new Error('Payment not completed for this document');
    error.status = 403;
    throw error;
  }

  const modelVersion = 'gpt-5.1-business-docs';
  const outputFiles = buildOutputFiles(request.user_id, request.id, request.document_type, modelVersion);
  const receipt = createReceiptDetails(request, request.amount);

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      generation_status: 'completed',
      output_files: { ...outputFiles, receipt },
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

module.exports = {
  SUPPORTED_TYPES,
  createPaymentRequest,
  markPaymentStatus,
  markPaymentStatusByReference,
  getRequestById,
  getRequestByPaymentReference,
  listRequestsForUser,
  generateDocument,
  resolveAmount,
};
