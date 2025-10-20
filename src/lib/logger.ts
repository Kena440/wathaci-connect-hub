export interface LogContext {
  userId?: string;
  paymentReference?: string;
  [key: string]: any;
}

function sendToMonitoringService(log: any) {
  try {
    fetch('/api/logs', {
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
