# Deployment Security Checklist Review

## Review Summary
- Completed automated quality gates (lint, type-check, unit tests, accessibility suite) prior to sign-off.
- Documented outstanding environment gaps (Chrome binary for Lighthouse) so the release team can resolve them before shipping.

## HTTPS & TLS
- Production must terminate TLS at the edge (e.g., Vercel or reverse proxy) and present a valid certificate chain before go-live. Follow the payment integration guide's SSL verification steps when validating custom domains or CDN endpoints.
- As part of the release checklist, run an automated certificate probe (for example, `openssl s_client -connect <domain>:443 -servername <domain>`) and capture the expiry date in the deployment notes so on-call engineers can confirm a trusted CA issued the certificate and that the full chain is served correctly.
- Run `npm run security:https-audit` to validate Supabase, Lenco, and alerting webhooks publish valid HTTPS certificates and to collect expiry/latency metadata for the runbook.

## Webhook Availability & Integrity
- Confirm `LENCO_WEBHOOK_SECRET` and related Supabase credentials are populated in every deployment environment so webhook validation runs with real secrets.
- During cut-over, double-check that no placeholder values (e.g., `test_` or `dummy`) remain by running `supabase secrets list` (or inspecting the hosting provider's secret manager) and comparing the hashes against the production key vault.
- The `payment-webhook` function validates signatures, updates payments, and writes audit logs for every webhook event. Monitor the `webhook_logs` table for failures during the stabilization window and enable alerting on repeated errors.
- Execute `npm run env:check` after secrets rotation; the script now highlights any environment file missing `LENCO_WEBHOOK_SECRET` so staging, preview, and production stay aligned.

## Rate Limiting & API Protection
- The Express backend already mounts `helmet` and an `express-rate-limit` middleware (100 requests per 15 minutes) at the application root. Keep this limiter enabled in production and adjust thresholds to match expected traffic to avoid abuse without blocking legitimate users.
- Verify the limiter is active in production by observing the `X-RateLimit-Remaining` headers via `curl -I https://<domain>/health` (or equivalent endpoint) and ensure alerting is configured for sudden drops to zero.

## Transaction Monitoring & Fraud Controls
- `PaymentSecurityService` enforces per-transaction and daily limits, device fingerprint checks, geolocation variance, and pattern analysis before approving payments. Surface its failure reasons in your observability stack so compliance teams can investigate anomalies in real time.
- Subscribe the payments runbook channel to the `payment_security_signals` metric/alarm feed so spikes in declined transactions or fraud heuristics page the payments team immediately.
- Configure `PAYMENT_ALERT_WEBHOOK_URL` in every environment to forward payment failures captured by the Express log router to your incident channel. Verify alert deliveries by sending a synthetic error through `/api/logs` with a `paymentReference` payload during smoke tests.

## Operational Next Steps
- Schedule a live HTTPS smoke test and webhook callback exercise as part of the deployment checklist to verify certificates, DNS, and firewall rules are correct.
- Add the smoke test runbook (including `curl https://<domain>/health` and a signed webhook invocation via `supabase functions invoke payment-webhook`) to the post-deploy automation so the checks execute on every production push.
- Integrate rate-limit metrics and payment security warnings into centralized monitoring so on-call engineers receive alerts for spikes or blocked transactions.
