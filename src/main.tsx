import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from '@/providers/AuthProvider';

// Validate critical environment variables
const validateEnv = () => {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
  const missing = requiredVars.filter((v) => !import.meta.env[v]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    return false;
  }
  return true;
};

// Show loading timeout fallback
const showLoadingFallback = () => {
  const fallback = document.createElement('div');
  fallback.id = 'loading-fallback';
  fallback.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      text-align: center;
    ">
      <div style="
        width: 48px;
        height: 48px;
        border: 4px solid #e5e7eb;
        border-top-color: #006B3F;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      <p style="margin-top: 16px; color: #6b7280;">Loading Wathaci Connect...</p>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </div>
  `;
  document.body.appendChild(fallback);
};

// Show error fallback
const showErrorFallback = (message: string) => {
  const existing = document.getElementById('loading-fallback');
  if (existing) existing.remove();

  const fallback = document.createElement('div');
  fallback.id = 'error-fallback';
  fallback.innerHTML = `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      text-align: center;
      max-width: 400px;
      margin: 0 auto;
    ">
      <div style="
        width: 64px;
        height: 64px;
        background: #fef2f2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      ">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h2 style="margin: 0 0 8px; color: #111827; font-size: 20px;">Wathaci Connect couldn't load</h2>
      <p style="color: #6b7280;">${'{message}'}</p>
    </div>
  `;
  document.body.appendChild(fallback);
};

// Only proceed to render the app root after env validation
if (validateEnv()) {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
  } else {
    showErrorFallback('Root container not found');
  }
} else {
  showErrorFallback('Invalid environment configuration');
}
