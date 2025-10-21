export interface LogContext {
  userId?: string;
  paymentReference?: string;
  [key: string]: any;
}

function sendToMonitoringService(log: any) {
  try {
    const isBrowserEnvironment =
      typeof window !== 'undefined' && typeof document !== 'undefined';

    if (!isBrowserEnvironment || typeof fetch !== 'function') {
      return;
    }

    const endpoint = new URL('/api/logs', window.location.origin);

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
