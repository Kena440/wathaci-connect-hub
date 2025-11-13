type EnvSource = Record<string, string | undefined>;

const getRuntimeEnv = (): EnvSource => {
  if (typeof import.meta !== 'undefined' && typeof import.meta.env === 'object') {
    return import.meta.env as EnvSource;
  }

  if (typeof process !== 'undefined' && typeof process.env === 'object') {
    return process.env as EnvSource;
  }

  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).__APP_ENV__ === 'object') {
    return (globalThis as any).__APP_ENV__ as EnvSource;
  }

  return {};
};

const toBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const sanitizeText = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export type MaintenanceConfig = {
  enabled: boolean;
  allowSignIn: boolean;
  allowSignUp: boolean;
  bannerTitle: string;
  bannerMessage: string;
  allowedEmailDomains: string[];
};

const DEFAULT_BANNER_TITLE = 'Scheduled maintenance in progress';
const DEFAULT_BANNER_MESSAGE =
  'We are preparing Wathaci Connect for production launch. Sign-ups are temporarily disabled while we migrate real user data.';

export const getMaintenanceConfig = (): MaintenanceConfig => {
  const env = getRuntimeEnv();

  const enabled = toBoolean(env.VITE_MAINTENANCE_MODE ?? env.MAINTENANCE_MODE, false);
  const allowSignIn = toBoolean(env.VITE_MAINTENANCE_ALLOW_SIGNIN ?? env.MAINTENANCE_ALLOW_SIGNIN, true);
  const allowSignUp = toBoolean(env.VITE_MAINTENANCE_ALLOW_SIGNUP ?? env.MAINTENANCE_ALLOW_SIGNUP, !enabled);

  const bannerTitle = sanitizeText(env.VITE_MAINTENANCE_BANNER_TITLE ?? env.MAINTENANCE_BANNER_TITLE) ?? DEFAULT_BANNER_TITLE;
  const bannerMessage =
    sanitizeText(env.VITE_MAINTENANCE_BANNER_MESSAGE ?? env.MAINTENANCE_BANNER_MESSAGE) ?? DEFAULT_BANNER_MESSAGE;

  const rawAllowlist =
    sanitizeText(env.VITE_MAINTENANCE_ALLOWED_EMAIL_DOMAINS ?? env.MAINTENANCE_ALLOWED_EMAIL_DOMAINS) ?? '';

  const allowedEmailDomains = rawAllowlist
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(Boolean);

  return {
    enabled,
    allowSignIn,
    allowSignUp,
    bannerTitle,
    bannerMessage,
    allowedEmailDomains,
  };
};
