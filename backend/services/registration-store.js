const { randomUUID } = require('crypto');
const sanitizeHtml = require('sanitize-html');
const { isSupabaseConfigured, insert } = require('../lib/supabaseClient');

class DuplicateRegistrationError extends Error {
  constructor(message = 'User already registered') {
    super(message);
    this.name = 'DuplicateRegistrationError';
    this.status = 409;
  }
}

class RegistrationStoreError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'RegistrationStoreError';
    this.status = options.status ?? 500;
  }
}

const fallbackRegistrations = new Map();

const sanitizeString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const sanitized = sanitizeHtml(trimmed, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return sanitized.replace(/\s+/g, ' ').trim();
};

const normalizeRegistrationPayload = (payload) => {
  const firstName = sanitizeString(payload.firstName);
  const lastName = sanitizeString(payload.lastName);
  const email = sanitizeString(payload.email)?.toLowerCase();
  const company = sanitizeString(payload.company);
  const mobileNumber = sanitizeString(payload.mobileNumber);
  const accountType = sanitizeString(payload.accountType);

  return {
    id: randomUUID(),
    first_name: firstName,
    last_name: lastName,
    email,
    account_type: accountType,
    company,
    mobile_number: mobileNumber,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

const mapRecordToResponse = (record) => ({
  id: record.id,
  firstName: record.first_name,
  lastName: record.last_name,
  email: record.email,
  accountType: record.account_type,
  company: record.company ?? null,
  mobileNumber: record.mobile_number ?? null,
  registeredAt: record.created_at ?? record.registered_at ?? new Date().toISOString(),
});

const isDuplicateSupabaseError = (error) => {
  if (!error) return false;
  return error.code === '23505' || error.status === 409;
};

const storeInMemory = (record) => {
  if (fallbackRegistrations.has(record.email)) {
    throw new DuplicateRegistrationError();
  }

  fallbackRegistrations.set(record.email, record);
  return mapRecordToResponse(record);
};

const storeInSupabase = async (record) => {
  try {
    const [inserted] = await insert('registrations', record);
    return mapRecordToResponse(inserted || record);
  } catch (error) {
    if (isDuplicateSupabaseError(error)) {
      throw new DuplicateRegistrationError();
    }

    throw new RegistrationStoreError('Failed to persist registration to Supabase', {
      cause: error,
      status: error?.status ?? 503,
    });
  }
};

const isFallbackAllowed = () =>
  process.env.ALLOW_IN_MEMORY_REGISTRATION === 'true' || process.env.NODE_ENV === 'test';


const registerUser = async (payload) => {
  const record = normalizeRegistrationPayload(payload);

  if (!record.email) {
    throw new RegistrationStoreError('Registration email is required after sanitization');
  }

  if (!isSupabaseConfigured()) {
    if (isFallbackAllowed()) {
      console.warn('[registration-store] Supabase not configured. Using in-memory registration store for testing.');
      return storeInMemory(record);
    }

    throw new RegistrationStoreError(
      'Supabase configuration is required to register users. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      { status: 503 },
    );
  }

  try {
    return await storeInSupabase(record);
  } catch (error) {
    if (error instanceof DuplicateRegistrationError) {
      throw error;
    }

    if (isFallbackAllowed()) {
      console.warn('[registration-store] Supabase insert failed, using in-memory store for testing fallback.', error);
      return storeInMemory(record);
    }

    throw error;
  }
};

const getFallbackRegistrations = () => {
  return Array.from(fallbackRegistrations.values()).map(mapRecordToResponse);
};

module.exports = {
  registerUser,
  DuplicateRegistrationError,
  RegistrationStoreError,
  getFallbackRegistrations,
};
