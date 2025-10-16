import { getPaymentConfig, getPaymentEnvValue, PaymentConfig } from './payment-config';

export type PaymentIssueSeverity = 'error' | 'warning';

export interface PaymentReadinessIssue {
  severity: PaymentIssueSeverity;
  message: string;
}

export interface PaymentReadiness {
  status: 'ready' | 'warning' | 'error';
  issues: PaymentReadinessIssue[];
  config: PaymentConfig;
}

const LIVE_PUBLIC_KEY_PREFIX = 'pk_live_';
const TEST_PUBLIC_KEY_PREFIX = 'pk_test_';

const resolveWebhookUrl = (): string | undefined => {
  return getPaymentEnvValue('VITE_LENCO_WEBHOOK_URL') || getPaymentEnvValue('LENCO_WEBHOOK_URL');
};

export const evaluatePaymentReadiness = (): PaymentReadiness => {
  const config = getPaymentConfig();
  const issues: PaymentReadinessIssue[] = [];

  if (!config.publicKey) {
    issues.push({ severity: 'error', message: 'Lenco public key is not configured.' });
  } else if (config.environment === 'production' && config.publicKey.startsWith(TEST_PUBLIC_KEY_PREFIX)) {
    issues.push({
      severity: 'error',
      message: 'Production environment is using a test public key (pk_test_). Switch to your live pk_live_ key.',
    });
  } else if (!config.publicKey.startsWith(LIVE_PUBLIC_KEY_PREFIX)) {
    issues.push({
      severity: 'warning',
      message: 'Lenco public key does not start with pk_live_. Ensure the correct key is provided before going live.',
    });
  }

  if (!config.webhookUrl) {
    const configuredWebhook = resolveWebhookUrl();
    if (!configuredWebhook) {
      issues.push({
        severity: config.environment === 'production' ? 'error' : 'warning',
        message: 'Lenco webhook URL is not configured. Configure LENCO_WEBHOOK_URL to receive payment events.',
      });
    }
  } else if (!/^https:\/\//i.test(config.webhookUrl)) {
    issues.push({
      severity: 'error',
      message: 'Lenco webhook URL must be an HTTPS endpoint.',
    });
  }

  const status = issues.some(issue => issue.severity === 'error')
    ? 'error'
    : issues.length > 0
      ? 'warning'
      : 'ready';

  return {
    status,
    issues,
    config,
  };
};
