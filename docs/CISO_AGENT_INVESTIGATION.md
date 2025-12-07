# Ciso Agent investigation (2025-03)

## Where Ciso lives
- **Frontend components:** `src/components/CisoWidget.tsx`, inline helpers in `SmeSignupForm` and `PaymentCheckout` all call the shared client in `src/lib/cisoClient.ts`.
- **Backend:** Supabase Edge Function `supabase/functions/agent` handles chat completions and optional tool calls; knowledge lookup goes through `supabase/functions/ciso-knowledge` when configured.

## API contract
- **Endpoint:** `VITE_WATHACI_CISO_AGENT_URL` → defaults to `https://nrjcbdrzaxqvomeogptf.functions.supabase.co/agent`.
- **Request payload:** `{ model?: string, messages: ChatMessage[], admin?: boolean, mode?: 'user'|'admin', context?: { role?, flow?, step?, lastError?, extra? } }`.
- **Response (success):** OpenAI-style body plus `traceId` for correlation.
- **Response (error):** `{ error: true, type, message, traceId }` with CORS headers; `type` can be `validation_error`, `config_error`, `auth_error`, `rate_limit`, `timeout`, `upstream_error`, or `unknown_error`.

## Root cause of the generic error
- The frontend caught any failure from `callCisoAgent` and displayed a single fallback string. Backend errors (missing API key, upstream failures, timeouts) were collapsed into that message.

## Fixes implemented
- **Backend hardening:**
  - Added `traceId` per request, consistent CORS/json headers, and structured error responses with clear types and timeout handling.
  - Added OpenAI timeout and richer logging without exposing user content.
- **Frontend resilience:**
  - `callCisoAgent` now maps backend error types and network failures to user-friendly messages and surfaces traceIds.
  - Widgets and inline helpers show the derived message instead of the generic fallback.
- **Testing:** Added Jest coverage for success, structured error, and network failure paths of `callCisoAgent`.

## Required configuration
- Frontend: `VITE_WATHACI_CISO_AGENT_URL`, `VITE_WATHACI_CISO_KNOWLEDGE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Backend: `WATHACI_CONNECT_OPENAI` (user) and `WATHACI_CONNECT_ADMIN_KEY_OPENAI` (admin, optional fallback to user key).
