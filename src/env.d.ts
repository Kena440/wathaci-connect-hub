/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly REACT_APP_API_BASE_URL?: string;
  readonly VITE_CISO_AGENT_URL?: string;
  readonly REACT_APP_CISO_AGENT_URL?: string;
  readonly VITE_WATHACI_CISO_AGENT_URL?: string;
  readonly REACT_APP_WATHACI_CISO_AGENT_URL?: string;
  readonly VITE_WATHACI_CISO_KNOWLEDGE_URL?: string;
  readonly REACT_APP_WATHACI_CISO_KNOWLEDGE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly REACT_APP_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_MAINTENANCE_MODE?: string;
  readonly VITE_MAINTENANCE_ALLOW_SIGNIN?: string;
  readonly VITE_MAINTENANCE_ALLOW_SIGNUP?: string;
  readonly VITE_MAINTENANCE_BANNER_TITLE?: string;
  readonly VITE_MAINTENANCE_BANNER_MESSAGE?: string;
  readonly VITE_MAINTENANCE_ALLOWED_EMAIL_DOMAINS?: string;
  readonly NEXT_PUBLIC_CHATBOT_ID?: string;
  readonly VITE_NEXT_PUBLIC_CHATBOT_ID?: string;
  readonly VITE_CHATBOT_ID?: string;
}
