const { getSupabaseClient, isSupabaseConfigured } = require('../lib/supabaseAdmin');

class AuditEntriesError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'AuditEntriesError';
    this.status = options.status ?? 500;
  }
}

const deriveEventType = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return null;

  return (
    payload.event ||
    payload.event_type ||
    payload.action ||
    payload.eventType ||
    payload?.metadata?.action ||
    payload?.metadata?.event ||
    payload?.metadata?.event_type ||
    payload?.event_metadata?.event_type ||
    null
  );
};

const SIGNUP_KEYWORDS = ['signup', 'sign_up', 'sign-up', 'sign up', 'signed_up', 'signedup'];

const isSignupEvent = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return false;

  const eventType = String(deriveEventType(payload) || '').toLowerCase();
  const eventMessage = String(payload.event_message || payload.message || '').toLowerCase();

  return SIGNUP_KEYWORDS.some((keyword) =>
    eventType.includes(keyword) || eventMessage.includes(keyword),
  );
};

const extractUserId = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return null;

  const directKeys = ['user_id', 'userId', 'userID'];
  for (const key of directKeys) {
    if (payload[key]) return payload[key];
  }

  const nestedCandidates = [payload.user, payload.record, payload.data, payload.metadata, payload.event_metadata];
  for (const candidate of nestedCandidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    for (const key of ['id', 'user_id', 'userId']) {
      if (candidate[key]) return candidate[key];
    }
  }

  if (typeof payload.target === 'object' && payload.target?.id) {
    return payload.target.id;
  }

  return null;
};

const fetchSignupAuditEntries = async ({ limit = 200 } = {}) => {
  if (!isSupabaseConfigured()) {
    throw new AuditEntriesError('Supabase admin client is not configured', { status: 503 });
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new AuditEntriesError('Supabase admin client is unavailable', { status: 503 });
  }

  const safeLimit = Math.max(1, Math.min(limit, 500));

  const { data, error } = await supabase
    .schema('auth')
    .from('audit_log_entries')
    .select('id, instance_id, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new AuditEntriesError('Failed to fetch audit log entries', { cause: error, status: error.status || 500 });
  }

  const signupEntries = (data || []).filter(({ payload }) => isSignupEvent(payload));

  const userIds = Array.from(
    new Set(
      signupEntries
        .map(({ payload }) => extractUserId(payload))
        .filter(Boolean),
    ),
  );

  let profilesById = new Map();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone_number, account_type, created_at')
      .in('id', userIds);

    if (profilesError) {
      throw new AuditEntriesError('Failed to fetch profiles for audit entries', {
        cause: profilesError,
        status: profilesError.status || 500,
      });
    }

    profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  }

  return signupEntries.map((entry) => {
    const userId = extractUserId(entry.payload);

    return {
      id: entry.id,
      instance_id: entry.instance_id,
      created_at: entry.created_at,
      event_type: deriveEventType(entry.payload),
      payload: entry.payload,
      profile: userId ? profilesById.get(userId) || null : null,
    };
  });
};

module.exports = {
  fetchSignupAuditEntries,
  AuditEntriesError,
};
