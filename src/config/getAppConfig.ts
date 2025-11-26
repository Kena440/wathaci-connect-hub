/**
 * Application Environment Configuration and Validation
 * 
 * This module provides comprehensive validation of all required environment variables
 * for WATHACI CONNECT. It checks Supabase, Lenco, API configuration, and production flags.
 * 
 * Use this during app initialization to ensure all required config is present before
 * the app starts, preventing runtime failures due to missing configuration.
 */

export type AppEnvStatus = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiBaseUrl?: string;
  lencoApiUrl?: string;
  lencoPublicKey?: string;
  lencoWebhookUrl?: string;
  isProduction: boolean;
  blockingErrors: string[];
  warnings: string[];
};

/**
 * Get comprehensive environment status for the application
 * 
 * This function validates all critical environment variables and returns
 * a status object with any blocking errors or warnings.
 * 
 * Blocking errors indicate missing critical configuration that will prevent
 * the app from functioning. Warnings indicate missing optional configuration
 * that may limit functionality.
 * 
 * @returns AppEnvStatus object with validation results
 * 
 * @example
 * ```typescript
 * const status = getAppEnvStatus();
 * 
 * if (status.blockingErrors.length > 0) {
 *   console.error('Configuration errors:', status.blockingErrors);
 *   throw new Error('App cannot start - missing required configuration');
 * }
 * 
 * if (status.warnings.length > 0) {
 *   console.warn('Configuration warnings:', status.warnings);
 * }
 * ```
 */
export function getAppEnvStatus(): AppEnvStatus {
  const env = import.meta.env;
  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  // ============================================================
  // SUPABASE CONFIGURATION
  // ============================================================

  const supabaseUrl =
    env.VITE_SUPABASE_URL ??
    env.VITE_SUPABASE_PROJECT_URL ??
    env.SUPABASE_URL ??
    env.SUPABASE_PROJECT_URL;

  if (!supabaseUrl) {
    blockingErrors.push(
      'Missing Supabase URL. Set VITE_SUPABASE_URL (or VITE_SUPABASE_PROJECT_URL) in your environment variables.'
    );
  } else if (!supabaseUrl.startsWith('https://')) {
    blockingErrors.push(
      `Invalid Supabase URL format: "${supabaseUrl}". Must start with https://`
    );
  }

  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ??
    env.VITE_SUPABASE_KEY ??
    env.SUPABASE_ANON_KEY ??
    env.SUPABASE_KEY;

  if (!supabaseAnonKey) {
    blockingErrors.push(
      'Missing Supabase anon/public key. Set VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_KEY) in your environment variables.'
    );
  } else if (!supabaseAnonKey.startsWith('eyJ')) {
    warnings.push(
      'Supabase anon key does not appear to be a valid JWT token (should start with "eyJ"). Please verify the key.'
    );
  }

  // ============================================================
  // API CONFIGURATION
  // ============================================================

  // Support both Vite and Create React App environment variable prefixes
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim() ?? env.REACT_APP_API_BASE_URL?.trim();
  
  if (!apiBaseUrl) {
    blockingErrors.push(
      'Missing API base URL. Set VITE_API_BASE_URL (or REACT_APP_API_BASE_URL) to your backend API base URL (e.g., https://wathaci-connect-platform2.vercel.app).'
    );
  } else {
    // Check for common development values in production
    const isProduction = env.MODE === 'production' || env.VITE_APP_ENV === 'production';
    const isDevelopmentUrl = 
      apiBaseUrl.includes('localhost') || 
      apiBaseUrl.includes('127.0.0.1') ||
      apiBaseUrl.includes(':3000');
    
    if (isProduction && isDevelopmentUrl) {
      blockingErrors.push(
        `API base URL is set to a development value ("${apiBaseUrl}") but app is in production mode. ` +
        'Update VITE_API_BASE_URL (or REACT_APP_API_BASE_URL) to your live backend API URL before deploying to production.'
      );
    }
  }

  // ============================================================
  // LENCO PAYMENT GATEWAY CONFIGURATION
  // ============================================================

  const lencoApiUrl = env.VITE_LENCO_API_URL;
  const lencoPublicKey = env.VITE_LENCO_PUBLIC_KEY;
  const lencoWebhookUrl = env.VITE_LENCO_WEBHOOK_URL ?? env.LENCO_WEBHOOK_URL;

  if (!lencoApiUrl) {
    warnings.push(
      'VITE_LENCO_API_URL not set. Lenco payment integration will not function. ' +
      'Set to https://api.lenco.co/access/v2 for production.'
    );
  } else if (lencoApiUrl !== 'https://api.lenco.co/access/v2') {
    warnings.push(
      `VITE_LENCO_API_URL is set to "${lencoApiUrl}" but expected value is "https://api.lenco.co/access/v2". ` +
      'Please verify this is correct.'
    );
  }

  if (!lencoPublicKey) {
    warnings.push(
      'VITE_LENCO_PUBLIC_KEY not set. Payment processing will not function. ' +
      'Obtain live keys from Lenco dashboard for production.'
    );
  } else {
    // Check for test keys in production
    const isProduction = env.MODE === 'production' || env.VITE_APP_ENV === 'production';
    const isTestKey = lencoPublicKey.includes('test') || lencoPublicKey.startsWith('pk_test_');
    
    if (isProduction && isTestKey) {
      blockingErrors.push(
        'VITE_LENCO_PUBLIC_KEY appears to be a test key but app is in production mode. ' +
        'Switch to live keys (pub-[64-char-hex] or pk_live_*) before production deployment.'
      );
    }
    
    // Check for valid format
    const isValidFormat = 
      lencoPublicKey.startsWith('pub-') || 
      lencoPublicKey.startsWith('pk_live_') ||
      lencoPublicKey.startsWith('pk_test_');
    
    if (!isValidFormat) {
      warnings.push(
        `VITE_LENCO_PUBLIC_KEY format is unexpected: "${lencoPublicKey.substring(0, 10)}...". ` +
        'Expected format: pub-[64-char-hex] or pk_live_* or pk_test_*'
      );
    }
  }

  if (!lencoWebhookUrl) {
    warnings.push(
      'VITE_LENCO_WEBHOOK_URL not configured. Webhook events will not be received. ' +
      'Set to your Supabase edge function URL: https://[project].supabase.co/functions/v1/lenco-payments-validator'
    );
  } else if (!lencoWebhookUrl.includes('supabase.co')) {
    warnings.push(
      `VITE_LENCO_WEBHOOK_URL ("${lencoWebhookUrl}") does not appear to be a Supabase URL. ` +
      'Expected format: https://[project].supabase.co/functions/v1/lenco-payments-validator'
    );
  }

  // ============================================================
  // PRODUCTION ENVIRONMENT FLAG
  // ============================================================

  const isProduction = env.MODE === 'production' || env.VITE_APP_ENV === 'production';

  if (isProduction) {
    // Additional production checks
    if (env.VITE_APP_ENV !== 'production') {
      warnings.push(
        'App is in production MODE but VITE_APP_ENV is not set to "production". ' +
        'Set VITE_APP_ENV=production for consistency.'
      );
    }
  }

  // ============================================================
  // PAYMENT CONFIGURATION
  // ============================================================

  const paymentCurrency = env.VITE_PAYMENT_CURRENCY;
  const paymentCountry = env.VITE_PAYMENT_COUNTRY;
  const minPaymentAmount = env.VITE_MIN_PAYMENT_AMOUNT;
  const maxPaymentAmount = env.VITE_MAX_PAYMENT_AMOUNT;
  const platformFeePercentage = env.VITE_PLATFORM_FEE_PERCENTAGE;

  if (!paymentCurrency) {
    warnings.push(
      'VITE_PAYMENT_CURRENCY not set. Defaults may be used but this should be explicitly configured (e.g., ZMW).'
    );
  }

  if (!paymentCountry) {
    warnings.push(
      'VITE_PAYMENT_COUNTRY not set. Defaults may be used but this should be explicitly configured (e.g., ZM).'
    );
  }

  if (!minPaymentAmount) {
    warnings.push('VITE_MIN_PAYMENT_AMOUNT not set. Using default minimum.');
  }

  if (!maxPaymentAmount) {
    warnings.push('VITE_MAX_PAYMENT_AMOUNT not set. Using default maximum.');
  }

  if (!platformFeePercentage) {
    warnings.push('VITE_PLATFORM_FEE_PERCENTAGE not set. Using default fee percentage.');
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    apiBaseUrl,
    lencoApiUrl,
    lencoPublicKey,
    lencoWebhookUrl,
    isProduction,
    blockingErrors,
    warnings,
  };
}

/**
 * Validate environment configuration and throw if there are blocking errors
 * 
 * Call this during app initialization to fail fast if configuration is invalid.
 * 
 * @throws Error if there are blocking configuration errors
 * 
 * @example
 * ```typescript
 * // In your main.tsx or App.tsx
 * import { validateAppConfig } from './config/getAppConfig';
 * 
 * validateAppConfig();
 * // App initialization continues only if config is valid
 * ```
 */
export function validateAppConfig(): void {
  const status = getAppEnvStatus();

  if (status.blockingErrors.length > 0) {
    const errorMessage = 
      '❌ Application configuration errors detected:\n\n' +
      status.blockingErrors.map((err, i) => `${i + 1}. ${err}`).join('\n') +
      '\n\nPlease fix these configuration issues before starting the application.';
    
    console.error(errorMessage);
    throw new Error('Invalid application configuration - see console for details');
  }

  if (status.warnings.length > 0) {
    console.warn('⚠️  Application configuration warnings:');
    status.warnings.forEach((warning, i) => {
      console.warn(`${i + 1}. ${warning}`);
    });
  }

  // Log successful validation in production
  if (status.isProduction) {
    console.log('✅ Production configuration validated successfully');
  }
}

/**
 * Get a human-readable summary of the environment configuration status
 * 
 * Useful for debugging and logging configuration state.
 * 
 * @returns A formatted string summarizing the configuration
 */
export function getConfigSummary(): string {
  const status = getAppEnvStatus();
  
  const lines = [
    '=== WATHACI CONNECT Configuration Status ===',
    '',
    `Environment: ${status.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`,
    '',
    'Configuration:',
    `  Supabase URL: ${status.supabaseUrl ? '✓ Set' : '✗ Missing'}`,
    `  Supabase Anon Key: ${status.supabaseAnonKey ? '✓ Set' : '✗ Missing'}`,
    `  API Base URL: ${status.apiBaseUrl || '✗ Missing'}`,
    `  Lenco API URL: ${status.lencoApiUrl || '✗ Missing'}`,
    `  Lenco Public Key: ${status.lencoPublicKey ? '✓ Set' : '✗ Missing'}`,
    `  Lenco Webhook URL: ${status.lencoWebhookUrl || '✗ Missing'}`,
    '',
  ];

  if (status.blockingErrors.length > 0) {
    lines.push('❌ Blocking Errors:');
    status.blockingErrors.forEach((err, i) => {
      lines.push(`  ${i + 1}. ${err}`);
    });
    lines.push('');
  }

  if (status.warnings.length > 0) {
    lines.push('⚠️  Warnings:');
    status.warnings.forEach((warning, i) => {
      lines.push(`  ${i + 1}. ${warning}`);
    });
    lines.push('');
  }

  if (status.blockingErrors.length === 0 && status.warnings.length === 0) {
    lines.push('✅ All configuration checks passed');
  }

  lines.push('==========================================');
  
  return lines.join('\n');
}
