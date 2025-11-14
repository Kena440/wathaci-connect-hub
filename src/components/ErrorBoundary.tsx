import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Gather diagnostic context
    const context = this.gatherErrorContext();
    
    // Log to console in development with full context
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] Caught error:", error);
      console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
      console.error("[ErrorBoundary] Context:", context);
    }
    
    void this.logErrorToService(error, errorInfo, context);
  }
  
  private gatherErrorContext() {
    const context: Record<string, any> = {
      timestamp: new Date().toISOString(),
      mode: import.meta.env.MODE,
    };
    
    // Capture current route
    if (typeof window !== "undefined") {
      context.url = window.location.href;
      context.pathname = window.location.pathname;
      context.search = window.location.search;
    }
    
    // Try to get authenticated user ID from localStorage (best effort)
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const supabaseAuthKey = Object.keys(window.localStorage).find(
          key => key.startsWith("sb-") && key.endsWith("-auth-token")
        );
        
        if (supabaseAuthKey) {
          const authData = window.localStorage.getItem(supabaseAuthKey);
          if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed?.user?.id) {
              context.userId = parsed.user.id;
            }
          }
        }
      }
    } catch (e) {
      // Silently fail if we can't get user context
      if (import.meta.env.DEV) {
        console.warn("[ErrorBoundary] Failed to extract user context", e);
      }
    }
    
    return context;
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo, context: Record<string, any>) {
    if (typeof fetch !== "function") {
      if (import.meta.env.DEV) {
        console.warn("[ErrorBoundary] Fetch API unavailable – skipping remote error logging.");
      }
      return Promise.resolve();
    }

    return fetch("/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        ...context,
      }),
    }).catch((loggingError) => {
      if (import.meta.env.DEV) {
        console.warn("[ErrorBoundary] Failed to forward error to logging endpoint", loggingError);
      }
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-6 text-center"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">Something went wrong.</h2>
            <p className="max-w-md text-sm text-gray-600">
              An unexpected error occurred while rendering WATHACI CONNECT. Try reloading the page or contact support if the
              problem continues.
            </p>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="max-w-2xl overflow-x-auto rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-left">
              <summary className="cursor-pointer text-sm font-medium text-gray-800">
                Error details (development only)
              </summary>
              <div className="mt-2 space-y-2 text-sm text-gray-700">
                <p className="font-semibold">{this.state.error.message}</p>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                  {this.state.error.stack}
                  {"\n"}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </details>
          )}
          <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-md bg-orange-600 px-4 py-2 font-semibold text-white shadow hover:bg-orange-700"
            >
              Reload page
            </button>
            <p>
              Need help?{" "}
              <a className="text-blue-600 underline" href="mailto:support@wathaci.org">
                Contact support
              </a>{" "}
              or visit our{" "}
              <a className="text-blue-600 underline" href="https://wathaci.org/help" target="_blank" rel="noreferrer">
                help center
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
