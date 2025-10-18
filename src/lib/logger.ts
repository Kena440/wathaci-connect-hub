export interface LogContext {
  userId?: string;
  paymentReference?: string;
  tags?: string[];
  [key: string]: any;
}

declare const Deno: {
  env?: {
    get?(key: string): string | undefined;
  };
};

const readEnvValue = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      return (import.meta as any).env[key];
    }
  } catch {
    // import.meta is not available in all runtimes
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any)?.__APP_CONFIG__?.[key]) {
    return String((globalThis as any).__APP_CONFIG__[key]);
  }

  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }

  if (typeof Deno !== 'undefined' && typeof (Deno as any).env?.get === 'function') {
    try {
      const value = (Deno as any).env.get(key);
      if (value) {
        return value as string;
      }
    } catch {
      // Access to Deno.env may be blocked; ignore gracefully.
    }
  }

  return undefined;
};

const postJson = (endpoint: string, body: any) => {
  if (typeof fetch !== 'function') {
    return;
  }

  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      /* ignore network errors */
    });
  } catch {
    // ignore
  }
};

const sendToMonitoringService = (log: any) => {
  const logEndpoint = readEnvValue('MONITORING_LOG_ENDPOINT') || '/api/logs';
  const isAbsoluteLogEndpoint = /^https?:\/\//i.test(logEndpoint);
  const isRelativeLogEndpoint = logEndpoint.startsWith('/');

  if (isAbsoluteLogEndpoint || isRelativeLogEndpoint) {
    postJson(logEndpoint, log);
  }

  const paymentAlertWebhook = readEnvValue('PAYMENT_ALERT_WEBHOOK_URL');
  const hasPaymentContext = Boolean(
    log?.paymentReference ||
    log?.context?.paymentReference ||
    log?.context?.payment_reference ||
    (Array.isArray(log?.tags) && log.tags.some((tag: string) => tag?.toLowerCase().includes('payment')))
  );

  if (
    paymentAlertWebhook &&
    /^https:\/\//i.test(paymentAlertWebhook) &&
    log?.level === 'error' &&
    hasPaymentContext
  ) {
    const alertPayload = {
      type: 'payment_alert',
      message: log?.message,
      paymentReference:
        log?.paymentReference || log?.context?.paymentReference || log?.context?.payment_reference,
      userId: log?.userId || log?.context?.userId,
      timestamp: log?.timestamp,
      error: log?.error,
      context: log?.context,
    };

    postJson(paymentAlertWebhook, alertPayload);
  }
};

export const logger = {
  error(message: string, error: unknown, context: LogContext = {}) {
    const logEntry = {
      level: 'error',
      message,
      ...context,
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      timestamp: new Date().toISOString(),
    };

    sendToMonitoringService(logEntry);
    console.error(message, logEntry);
  },
};
