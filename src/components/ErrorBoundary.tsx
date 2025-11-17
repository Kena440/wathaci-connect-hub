import React from "react";
import { SUPPORT_EMAIL } from '@/lib/supportEmail';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  diagnostics?: Record<string, unknown>;
}

const OFFLINE_SESSION_STORAGE_KEY = "wathaci_offline_session";

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const diagnostics = this.collectDiagnostics();
    this.setState({ error, errorInfo, diagnostics });
    void this.logErrorToService(error, errorInfo, diagnostics);

    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary] Caught error:", error);
      console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
      if (Object.keys(diagnostics).length > 0) {
        console.error("[ErrorBoundary] Diagnostics snapshot:", diagnostics);
      }
    }
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  private getAuthDiagnostics(): Record<string, unknown> {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return {};
    }

    const diagnostics: Record<string, unknown> = {};

    try {
      const offlinePayload = window.localStorage.getItem(OFFLINE_SESSION_STORAGE_KEY);
      if (offlinePayload) {
        const parsed = JSON.parse(offlinePayload);
        const offlineUserId = parsed?.user?.id ?? parsed?.user?.user?.id ?? null;
        if (offlineUserId) {
          diagnostics.offlineUserId = offlineUserId;
        }
        const offlineProfileId = parsed?.profile?.id ?? null;
        if (offlineProfileId) {
          diagnostics.offlineProfileId = offlineProfileId;
        }
      }
    } catch (parseError) {
      diagnostics.offlineSessionParseError = parseError instanceof Error ? parseError.message : String(parseError);
    }

    try {
      const supabaseAuthKey = Object.keys(window.localStorage).find((key) =>
        key.startsWith("sb-") && key.endsWith("-auth-token")
      );

      if (supabaseAuthKey) {
        const supabasePayload = window.localStorage.getItem(supabaseAuthKey);
        if (supabasePayload) {
          const parsedSession = JSON.parse(supabasePayload);
          const sessionUser = parsedSession?.currentSession?.user ?? parsedSession?.user;
          if (sessionUser?.id) {
            diagnostics.supabaseUserId = sessionUser.id;
          }
          if (sessionUser?.email) {
            diagnostics.supabaseEmail = sessionUser.email;
          }
        }
      }
    } catch (supabaseError) {
      diagnostics.supabaseSessionParseError =
        supabaseError instanceof Error ? supabaseError.message : String(supabaseError);
    }

    return diagnostics;
  }

  private collectDiagnostics(): Record<string, unknown> {
    const diagnostics: Record<string, unknown> = {
      environment: import.meta.env.MODE ?? (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) ?? "unknown",
    };

    if (typeof window !== "undefined") {
      diagnostics.route = window.location?.pathname;
      diagnostics.fullUrl = window.location?.href;
      diagnostics.userAgent = window.navigator?.userAgent;
      Object.assign(diagnostics, this.getAuthDiagnostics());
    }

    return diagnostics;
  }

  private logErrorToService(
    error: Error,
    errorInfo: React.ErrorInfo,
    diagnostics: Record<string, unknown>,
  ) {
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
        timestamp: new Date().toISOString(),
        diagnostics,
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
              An unexpected error occurred while rendering WATHACI CONNECT. Try reloading the page or contact{' '}
              {SUPPORT_EMAIL} if the problem continues.
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
                  {this.state.diagnostics ? `\nDiagnostics: ${JSON.stringify(this.state.diagnostics, null, 2)}` : ""}
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
              <a className="text-blue-600 underline" href={`mailto:${SUPPORT_EMAIL}`}>
                Contact support
              </a>{" "}
              or visit our{" "}
              <a className="text-blue-600 underline" href="https://wathaci.com/help" target="_blank" rel="noreferrer">
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
