# Supabase Database and Integration Readiness Prompt

You are a senior full-stack engineer and data reliability expert tasked with validating that the Supabase stack is production-ready. Perform an exhaustive review of every Supabase project, database, and table so the platform can safely store user profiles, authentication state, billing data, and any sensitive metadata. Follow the steps below meticulously and do not proceed until each checkpoint is satisfied.

## 1. Inventory and Access
1. Enumerate every Supabase project, environment (dev/stage/prod), and associated database instances.
2. Confirm valid credentials/API keys exist for each environment and are stored securely (Supabase secrets, CI/CD, `.env`, etc.).
3. Document the CLI/SQL access method you will use for inspection (Supabase Studio, SQL editor, CLI, psql).

## 2. Schema and Table Audit
1. List every schema (including `public`, `auth`, `storage`, custom domains) and capture all tables, views, and materialized views.
2. For each table:
   - Describe its purpose and relationship to user data (profiles, sessions, payments, etc.).
   - Validate column definitions, data types, nullable flags, defaults, and comments.
   - Confirm primary keys, foreign keys, unique constraints, and indexes exist where expected.
   - Identify cascade rules on relationships and ensure they match business logic.
   - Ensure timestamps (`created_at`, `updated_at`, soft-delete flags) exist and have proper defaults (`now()` + trigger where needed).
   - Check for partitioning or sharding needs for large datasets.
3. Compare the live schema with the latest migrations (SQL, Prisma, Drizzle, etc.) and flag any drift.
4. Verify all stored procedures, triggers, and functions compile without errors and include retry/error handling logic.

## 3. Data Quality and Seed State
1. Inspect seed data for completeness (admin accounts, default roles, feature flags).
2. Ensure no PII/test fixtures remain in production.
3. Validate migration history ordering, rollback scripts, and repeatability.
4. Run integrity checks (row counts, orphan detection, FK validation) and record results.

## 4. Security and Compliance
1. Confirm Row Level Security (RLS) is enabled on every user-facing table.
2. Review all RLS policies for least-privilege access; test positive and negative cases.
3. Audit database roles, service keys, and JWT claims to ensure correct scopes.
4. Validate data encryption at rest/in transit (TLS settings, column-level encryption if required).
5. Document compliance posture (GDPR/CCPA-ready data retention policies, auditing tables, access logs).

## 5. Performance and Reliability
1. Analyze query plans for the most critical endpoints; add/adjust indexes as needed.
2. Confirm connection pooling (pgbouncer) limits, timeouts, and Supabase compute sizes align with traffic projections.
3. Set up monitoring dashboards (Supabase Insights, Logflare, APM) with alerts on errors, latency, and saturation.
4. Verify backup/restore strategy, PITR settings, and disaster recovery runbooks.

## 6. Frontend ↔ Backend Integration Readiness
1. Enumerate all frontend data flows (auth, profile editing, onboarding, payments) and map them to Supabase tables/functions.
2. Confirm TypeScript/SDK types are generated from the current schema (e.g., `supabase gen types typescript --project-ref ...`).
3. Validate API routes/server functions enforce the same constraints as the database (input validation, schema parsing, zod/io-ts, etc.).
4. Test end-to-end flows:
   - Signup/login/logout including magic links/OTP if applicable.
   - Profile creation, update, avatar storage, and retrieval.
   - Any premium/billing workflow touching Supabase tables or webhooks.
5. Ensure realtime subscriptions, storage buckets, and edge functions are configured and versioned alongside the frontend/backends.

## 7. Final Sign-off Checklist
1. Produce a matrix listing every table and its readiness status (Schema ✔, RLS ✔, Indexes ✔, Seed ✔, Monitoring ✔).
2. Capture screenshots/logs proving tests succeeded (SQL output, CLI transcripts, frontend E2E runs).
3. Open issues/tasks for any gaps and block launch until resolved.
4. Share a final readiness summary covering:
   - Outstanding risks and mitigations.
   - Required runbooks or SOPs handed to Support/SRE teams.
   - Confirmation that both frontend and backend consume the verified schema without breaking changes.

Deliverables: a single comprehensive report (Markdown/Notion/Confluence) plus supporting evidence (SQL scripts, CLI output, test logs) demonstrating the Supabase databases and integration layer are 100% ready for production user data.
