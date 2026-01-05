import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Validate critical environment variables
const validateEnv = () => {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
  const missing = requiredVars.filter(v => !import.meta.env[v]);
  
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
      <p style="margin: 0 0 24px; color: #6b7280;">${message}</p>
      <button onclick="window.location.reload()" style="
        background: #006B3F;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
      ">Refresh Page</button>
    </div>
  `;
  document.body.appendChild(fallback);
};

// Remove loading fallback once app renders
const removeLoadingFallback = () => {
  const fallback = document.getElementById('loading-fallback');
  if (fallback) fallback.remove();
};

// Initialize app
const initApp = async () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    showErrorFallback('Could not find the application root element.');
    return;
  }
  
  // Show loading indicator
  showLoadingFallback();
  
  // Set a timeout for slow loading
  const loadingTimeout = setTimeout(() => {
    console.warn('App taking longer than expected to load...');
  }, 5000);
  
  // Fail-safe timeout (10 seconds)
  const failsafeTimeout = setTimeout(() => {
    const fallback = document.getElementById('loading-fallback');
    if (fallback) {
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
          <p style="color: #6b7280; margin-bottom: 16px;">Taking longer than expected...</p>
          <button onclick="window.location.reload()" style="
            background: #006B3F;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
          ">Reload</button>
        </div>
      `;
    }
  }, 10000);
  
  try {
    // Validate environment
    if (!validateEnv()) {
      clearTimeout(loadingTimeout);
      clearTimeout(failsafeTimeout);
      showErrorFallback('Configuration error. Please contact support.');
      return;
    }
    
    // Render the app
    const root = createRoot(rootElement);
    root.render(<App />);
    
    // Clear timeouts and remove loading fallback
    clearTimeout(loadingTimeout);
    clearTimeout(failsafeTimeout);
    
    // Give React a moment to render before removing fallback
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        removeLoadingFallback();
      });
    });
    
  } catch (error) {
    clearTimeout(loadingTimeout);
    clearTimeout(failsafeTimeout);
    console.error('Failed to initialize app:', error);
    showErrorFallback('Failed to load the application. Please try refreshing.');
  }
};

// Start the app
initApp();
