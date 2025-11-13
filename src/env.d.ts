/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MAINTENANCE_MODE?: string;
  readonly VITE_MAINTENANCE_ALLOW_SIGNIN?: string;
  readonly VITE_MAINTENANCE_ALLOW_SIGNUP?: string;
  readonly VITE_MAINTENANCE_BANNER_TITLE?: string;
  readonly VITE_MAINTENANCE_BANNER_MESSAGE?: string;
  readonly VITE_MAINTENANCE_ALLOWED_EMAIL_DOMAINS?: string;
}
