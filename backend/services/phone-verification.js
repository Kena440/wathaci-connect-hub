const { isSupabaseConfigured, supabaseRequest } = require('../lib/supabaseClient');

const normalizePhone = (phone) => (phone || '').trim();

const markPhoneVerified = async (phone) => {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return { updated: false, reason: 'missing_phone' };
  }

  if (!isSupabaseConfigured()) {
    console.info('[phone-verification] Supabase not configured; skipping profile update');
    return { updated: false, reason: 'supabase_not_configured' };
  }

  try {
    const response = await supabaseRequest('profiles', {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      searchParams: { phone: `eq.${normalized}` },
      body: {
        phone: normalized,
        phone_verified_at: new Date().toISOString(),
      },
    });

    const updated = Array.isArray(response) && response.length > 0;
    return { updated, reason: updated ? 'updated' : 'not_found' };
  } catch (error) {
    console.error('[phone-verification] Failed to mark phone verified', {
      message: error?.message,
      status: error?.status,
      code: error?.code,
    });
    return { updated: false, reason: 'error' };
  }
};

module.exports = {
  markPhoneVerified,
  normalizePhone,
};
