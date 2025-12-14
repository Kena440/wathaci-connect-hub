import { supabaseConfigStatus } from "@/config/appConfig";
import { supabaseClient } from "./supabaseClient";

export type CisoMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CisoContext = {
  role?:
    | "sme"
    | "investor"
    | "donor"
    | "government"
    | "professional"
    | "admin"
    | "guest"
    | "other";
  flow?: string;
  step?: string;
  lastError?: string;
  extra?: Record<string, unknown>;
};

export type CisoMode = "user" | "admin";

type CallOptions = {
  accessToken?: string | null;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
};

export class CisoAgentError extends Error {
  status?: number;
  type?: string;
  traceId?: string;
  userMessage: string;

  constructor(
    userMessage: string,
    options?: { status?: number; type?: string; traceId?: string; cause?: any },
  ) {
    super(userMessage);
    this.name = "CisoAgentError";
    this.status = options?.status;
    this.type = options?.type;
    this.traceId = options?.traceId;
    this.userMessage = userMessage;
    if (options?.cause) {
      (this as any).cause = options.cause;
    }
  }
}

const resolveRuntimeEnv = () => {
  try {
    return new Function("return import.meta.env")();
  } catch (err) {
    return undefined;
  }
};

const sanitizeEnvValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined" || trimmed.toLowerCase() === "null") {
    return undefined;
  }

  return trimmed.replace(/^['"`]+|['"`]+$/g, "").trim();
};

const env =
  (typeof globalThis !== "undefined" && (globalThis as any).__VITE_ENV__) ||
  resolveRuntimeEnv() ||
  ((typeof process !== "undefined" ? (process.env as any) : {}) ?? {});

const AGENT_URL =
  env.VITE_CISO_AGENT_URL?.trim() ||
  env.REACT_APP_CISO_AGENT_URL?.trim() ||
  env.VITE_WATHACI_CISO_AGENT_URL?.trim() ||
  env.REACT_APP_WATHACI_CISO_AGENT_URL?.trim() ||
  "https://nrjcbdrzaxqvomeogptf.functions.supabase.co/agent";

const SUPABASE_ANON_KEY = (() => {
  const resolvedAnonKey = sanitizeEnvValue(supabaseConfigStatus.resolvedAnonKey);
  if (resolvedAnonKey) {
    return resolvedAnonKey;
  }

  const runtimeConfig =
    (typeof globalThis !== "undefined" ? (globalThis as any)?.__APP_CONFIG__ : undefined) ?? {};

  const candidates = [
    env?.VITE_SUPABASE_ANON_KEY,
    env?.VITE_SUPABASE_KEY,
    env?.SUPABASE_ANON_KEY,
    env?.SUPABASE_KEY,
    env?.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env?.PUBLIC_SUPABASE_ANON_KEY,
    env?.REACT_APP_SUPABASE_ANON_KEY,
    env?.REACT_APP_SUPABASE_KEY,
    (runtimeConfig as any)?.VITE_SUPABASE_ANON_KEY,
    (runtimeConfig as any)?.VITE_SUPABASE_KEY,
    (runtimeConfig as any)?.SUPABASE_ANON_KEY,
    (runtimeConfig as any)?.SUPABASE_KEY,
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizeEnvValue(candidate);
    if (sanitized) {
      return sanitized;
    }
  }

  return undefined;
})();

const deriveUserQuery = (messages: CisoMessage[]): string => {
  if (!messages || messages.length === 0) return "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") {
      return messages[i].content.trim();
    }
  }
  return messages[messages.length - 1]?.content?.trim() ?? "";
};

const buildUserFacingMessage = (type?: string, traceId?: string) => {
  const reference = traceId ? ` (ref: ${traceId})` : "";

  switch (type) {
    case "validation_error":
      return "We could not process that question. Please refine it and try again.";
    case "config_error":
      return `Ciso is unavailable because of a configuration issue. Please try again in a few minutes or email support@wathaci.com${reference}.`;
    case "auth_error":
      return `We could not securely connect to Ciso right now. Please try again or email support@wathaci.com${reference}.`;
    case "rate_limit":
      return "Ciso is handling many requests at once. Please wait a few seconds and try again.";
    case "timeout":
      return `Ciso took too long to reply. Please try again shortly${reference}.`;
    case "network_error":
      return "We could not reach Ciso. Please check your connection and try again.";
    default:
      return `Ciso is having trouble replying right now. Please try again or email support@wathaci.com${reference}.`;
  }
};

export async function callCisoAgent(
  userMessages: CisoMessage[],
  mode: CisoMode = "user",
  context?: CisoContext,
  options?: CallOptions,
) {
  const session = await supabaseClient.auth.getSession().catch(() => null);
  const authToken = options?.accessToken ?? session?.data.session?.access_token;
  const userId = session?.data.session?.user.id ?? "anonymous";
  const query = deriveUserQuery(userMessages);

  if (!authToken && !SUPABASE_ANON_KEY) {
    throw new CisoAgentError(
      "Ciso is unavailable because required Supabase credentials are missing. Please set VITE_SUPABASE_ANON_KEY (or its aliases) and try again.",
      { type: "config_error" },
    );
  }

  const wantsStream = typeof options?.onToken === "function";

  try {
    const res = await fetch(wantsStream ? `${AGENT_URL}?stream=1` : AGENT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: wantsStream ? "text/event-stream,application/json" : "application/json",
        Authorization:
          authToken?.trim()
            ? `Bearer ${authToken}`
            : SUPABASE_ANON_KEY
              ? `Bearer ${SUPABASE_ANON_KEY}`
              : "",
      },
      body: JSON.stringify({
        query,
        messages: userMessages,
        user_id: userId,
        mode,
        context,
      }),
      signal: options?.signal,
    });

    const contentType = res.headers.get("content-type") ?? "";

    if (wantsStream && res.ok && contentType.includes("text/event-stream")) {
      if (!res.body) {
        throw new CisoAgentError("Ciso sent an empty response stream.", { type: "network_error" });
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalAnswer = "";
      let traceId: string | undefined;
      let isDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const lines = event.split("\n");
          let eventName = "message";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              data += line.replace("data:", "").trim();
            }
          }

          if (!data) continue;

          if (eventName === "meta") {
            try {
              const parsed = JSON.parse(data);
              traceId = parsed.traceId;
            } catch (err) {
              console.warn("[callCisoAgent] Failed to parse meta event", err);
            }
            continue;
          }

          if (eventName === "token") {
            try {
              const parsed = JSON.parse(data);
              const token = typeof parsed === "string" ? parsed : parsed.token;
              if (token) {
                finalAnswer += token;
                options?.onToken?.(token);
              }
            } catch (err) {
              console.warn("[callCisoAgent] Failed to parse token event", err);
            }
            continue;
          }

          if (eventName === "done") {
            try {
              const parsed = JSON.parse(data);
              if (parsed?.answer) {
                finalAnswer = parsed.answer;
              }
              traceId = parsed?.traceId ?? traceId;
            } catch (err) {
              console.warn("[callCisoAgent] Failed to parse done event", err);
            }
            isDone = true;
            break;
          }

          if (eventName === "error") {
            const trace = (() => {
              try {
                const parsed = JSON.parse(data);
                return parsed?.traceId;
              } catch {
                return undefined;
              }
            })();
            throw new CisoAgentError(buildUserFacingMessage("upstream_error", trace), {
              type: "upstream_error",
              traceId: trace,
            });
          }
        }

        if (isDone) break;
      }

      if (!finalAnswer) {
        throw new CisoAgentError(buildUserFacingMessage("upstream_error", traceId), {
          traceId,
          type: "upstream_error",
        });
      }

      return finalAnswer;
    }

    const payload = await res.json().catch(async () => ({ raw: await res.text() }));

    if (!res.ok || (payload as any)?.error) {
      const status = res.status || 500;
      const errorType =
        (payload as any)?.type ||
        (status === 400
          ? "validation_error"
          : status === 401 || status === 403
            ? "auth_error"
            : status === 429
              ? "rate_limit"
              : status >= 500
                ? "upstream_error"
                : "unknown_error");

      const traceId = (payload as any)?.traceId;
      const userMessage = buildUserFacingMessage(errorType, traceId);

      throw new CisoAgentError(userMessage, {
        status,
        type: errorType,
        traceId,
      });
    }

    const answer =
      (payload as any)?.answer ??
      (payload as any)?.choices?.[0]?.message?.content ??
      (payload as any)?.message;

    if (!answer || typeof answer !== "string") {
      return "Ciso is experiencing a connection issue. Please try again.";
    }

    return answer;
  } catch (error) {
    if (error instanceof CisoAgentError) {
      throw error;
    }

    const networkMessage = buildUserFacingMessage(
      (error as any)?.name === "AbortError" ? "timeout" : "network_error",
    );

    throw new CisoAgentError(networkMessage, {
      cause: error,
      type: (error as any)?.name === "AbortError" ? "timeout" : "network_error",
    });
  }
}
