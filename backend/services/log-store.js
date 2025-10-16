const { randomUUID } = require('crypto');
const { isSupabaseConfigured, insert } = require('../lib/supabaseClient');

class LogStoreError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'LogStoreError';
  }
}

const persistLog = async (log) => {
  if (!isSupabaseConfigured()) {
    return;
  }

  const payload = {
    id: randomUUID(),
    level: log.level,
    message: log.message,
    context: log.context ?? null,
    stack: log.stack ?? null,
    component_stack: log.componentStack ?? null,
    received_at: log.receivedAt,
    created_at: log.receivedAt,
  };

  try {
    await insert('frontend_logs', payload);
  } catch (error) {
    throw new LogStoreError('Failed to persist log entry to Supabase', { cause: error });
  }
};

module.exports = {
  persistLog,
  LogStoreError,
};
