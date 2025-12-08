export interface LogContext {
  userId?: string;
  paymentReference?: string;
  [key: string]: any;
}

const DEFAULT_SITE_ORIGIN = 'https://wathaci.com';
const ORIGIN_ENV_KEYS = ['VITE_APP_BASE_URL', 'VITE_SITE_URL', 'VITE_PUBLIC_SITE_URL'];

const resolveBaseOrigin = (): string => {
  for (const key of ORIGIN_ENV_KEYS) {
    const value = typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.[key] : undefined;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_SITE_ORIGIN;
};

function sendToMonitoringService(log: any) {
  try {
    const isBrowserEnvironment =
      typeof window !== 'undefined' && typeof document !== 'undefined';

    if (!isBrowserEnvironment || typeof fetch !== 'function') {
      return;
    }

    const endpoint = new URL('/api/logs', resolveBaseOrigin());

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    }).catch(() => {
      /* ignore network errors */
    });
  } catch {
    // ignore
  }
}

const buildLogEntry = (level: 'error' | 'warn' | 'info', message: string, context: LogContext = {}, error?: unknown) => ({
  level,
  message,
  ...context,
  ...(error
    ? {
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error,
      }
    : {}),
  timestamp: new Date().toISOString(),
});

export const logger = {
  error(message: string, error?: unknown, context: LogContext = {}) {
    const logEntry = buildLogEntry('error', message, context, error);
    sendToMonitoringService(logEntry);
    console.error(message, logEntry);
  },

  warn(message: string, context: LogContext = {}) {
    const logEntry = buildLogEntry('warn', message, context);
    sendToMonitoringService(logEntry);
    console.warn(message, logEntry);
  },

  info(message: string, context: LogContext = {}) {
    const logEntry = buildLogEntry('info', message, context);
    sendToMonitoringService(logEntry);
    console.info(message, logEntry);
  },
};
