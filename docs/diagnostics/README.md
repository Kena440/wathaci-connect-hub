# Wathaci AI SME Auto-Diagnosis & Growth Recommendation Engine

This document describes the architecture, scoring logic, prompts, API design, and experience for the SME auto-diagnosis engine. The goal is to give any SME a structured health check, narrative insights, and tailored partner recommendations that improve as more data is supplied.

## Objectives

- Deliver explainable 360° diagnostics that work with partial or rich data.
- Produce structured JSON for the platform plus human-friendly narratives for reports/PDFs.
- Keep the engine modular so new sectors, metrics, and AI models can be added without breaking existing consumers.
- Capture every run with version metadata for auditability and regression testing.

## Data Model & Schemas

### `diagnostics_runs` (Supabase or relational table)

| column | type | description |
| --- | --- | --- |
| `id` | uuid (pk) | Run identifier. |
| `company_id` | uuid | SME foreign key. |
| `input_hash` | text | SHA-256 hash of normalized input payload for idempotency. |
| `scores` | jsonb | Calculated scores (see `scores` object). |
| `model_version` | text | Semantic version of scoring/prompt pack. |
| `created_at` | timestamptz | Run timestamp. |
| `meta` | jsonb | Includes data coverage, llm prompt, failures. |
| `summary` | jsonb | Cached `overall_summary` block for quick rendering. |

### `diagnostics_outputs`

| column | type | description |
| --- | --- | --- |
| `diagnostic_id` | uuid (pk/fk) | Links to `diagnostics_runs.id`. |
| `payload` | jsonb | Full JSON output returned to clients (SWOT, scores, recommendations, partners, opportunities). |

### Sector Benchmarks (extensible lookup)

`sector_benchmarks` (optional table used by future model versions):
- `sector`, `sub_sector`
- `median_margin`, `payment_terms_days`, `customer_concentration_thresholds`, `license_requirements`

## JSON Output Contract

```json
{
  "overall_summary": {
    "summary_text": "... narrative paragraphs ...",
    "stage": "early|growth|scale",
    "key_strengths": ["..."],
    "top_gaps": ["..."]
  },
  "swot_analysis": {
    "strengths": [],
    "weaknesses": [],
    "opportunities": [],
    "threats": []
  },
  "scores": {
    "funding_readiness": 0,
    "compliance_maturity": 0,
    "governance_maturity": 0,
    "digital_maturity": 0,
    "market_readiness": 0,
    "operational_efficiency": 0
  },
  "bottlenecks": [
    {
      "area": "Financial Management",
      "severity": "high",
      "description": "...",
      "impact": "..."
    }
  ],
  "recommendations": [
    {
      "priority": 1,
      "area": "Compliance",
      "action": "...",
      "why": "...",
      "how": ["..."],
      "estimated_time": "2–4 weeks",
      "difficulty": "medium"
    }
  ],
  "recommended_partners": [
    {
      "partner_type": "Bank",
      "partner_id": "partner_123",
      "name": "XYZ Bank SME Unit",
      "reason": "...",
      "suggested_product": "Working Capital Facility",
      "fit_score": 87
    }
  ],
  "suggested_opportunities": [
    {
      "opportunity_id": "...",
      "title": "...",
      "type": "Grant|Debt|Equity|Market",
      "reason": "..."
    }
  ],
  "meta": {
    "last_updated": "ISO string",
    "data_coverage_level": "minimal|basic|moderate|rich",
    "model_version": "v1.0.0",
    "llm_prompt": "rendered prompt for audit"
  }
}
```

## Scoring Logic (v1.0.0)

Scores are 0–100 based on weighted factors. Missing data is treated as false; providing more data improves accuracy but never breaks the run.

### Funding Readiness
- Registration status (15%)
- Years in business ≥3 (10%)
- Revenue history ≥2 years (15%)
- Positive profit trend (10%)
- Financial statements available (15%)
- Debt repayment on time (10%)
- Tax clearance (10%)
- Industry licenses (5%)
- Cashflow visibility (10%)

Bands: 0–30 Not ready, 31–60 Emerging, 61–80 Bankable with support, 81–100 Strongly bankable.

### Compliance Maturity
- Tax registration (15%)
- Tax clearance (15%)
- Returns on time (10%)
- Industry licenses (10%)
- Governance policies present (10%)
- Board/advisory (10%)
- Insurance cover (10%)
- Registration certificate on file (10%)
- Tax certificate on file (10%)

### Digital Maturity
- Website (20%)
- Social presence (15%)
- Online store (15%)
- Accounting tool (15%)
- POS/ERP (15%)
- Fast response to leads (10%)
- High profile completion (10%)

### Governance Maturity
- Board (20%)
- Advisory board (15%)
- Finance policy (20%)
- HR policy (15%)
- Segregation of roles (10%)
- Risk management practice (10%)
- Audited financials (10%)

### Market Readiness
- Sector/sub-sector present (35%)
- Top clients listed (20%)
- Balanced revenue concentration (15%)
- Active contracts (10%)
- Engagement with opportunities (10%)
- Training/course completion (10%)

### Operational Efficiency
- Documented processes (20%)
- Inventory system (15%)
- ERP/POS (15%)
- On-time delivery (15%)
- Quality control (15%)
- Supplier diversity (10%)
- Staff training (10%)

## Backend Service/API

### Endpoints
- `POST /api/diagnostics/run` – accepts `{ companyId?, input }` and returns the full diagnosis JSON. Idempotency is supported by hashing the input for logging.
- `GET /api/diagnostics/:companyId/latest` – fetches the most recent run for an SME.
- `GET /api/diagnostics/:companyId/history` – returns all runs ordered by recency.

> **Access control**: All diagnostics endpoints require a valid Supabase session bearer token **and** an active subscription (`user_subscriptions.status = 'active'` with a non-expired `end_date`). Requests without a token or subscription are rejected with 401/403 so only subscribed accounts can generate or read diagnoses.

### Execution Flow
1. **Normalize input** and compute coverage level (minimal/basic/moderate/rich).
2. **Score** funding, compliance, governance, digital, market, and operations via deterministic weights.
3. **Generate rule-based SWOT, bottlenecks, and recommendations** (guaranteed even with partial data).
4. **Build LLM prompt** with structured context; LLM can refine narratives or extend recommendations.
5. **Log run** with `model_version`, `input_hash`, and `meta` so future reruns can be compared.

### Extensibility Hooks
- Add sector-specific weights or factors by appending to factor arrays in `diagnostics-engine.js`.
- Swap/upgrade LLMs by adjusting the prompt builder and adding a `model_version` bump.
- Persist runs to Supabase by replacing the in-memory store with Supabase client calls that write to `diagnostics_runs` and `diagnostics_outputs`.

## AI Prompt Specs

System guidance (see `backend/lib/diagnostics-prompts.js`):
- Role: *Experienced African SME consultant*.
- Inputs: structured SME object, pre-computed scores, rule-based SWOT, bottlenecks, and recommendations.
- Output: strict JSON with keys `swot_analysis`, `bottlenecks`, `recommendations`, `suggested_opportunities`, `recommended_partners`, plus a 3-paragraph `narrative`.
- Behaviour: If data is missing, clearly flag gaps, never fail. Keep advice practical for Sub-Saharan Africa (forex, load-shedding, import dependencies, etc.).

## Frontend UX Flows

### Business Health Check Dashboard
- **Summary cards:** Overall health stage, Funding Readiness, Compliance Maturity, Digital Maturity with score and colour badges.
- **SWOT quadrants:** Strengths, Weaknesses, Opportunities, Threats as bullet lists.
- **Bottlenecks & Actions timeline:** Grouped into Now (0–3 months), Next (3–12 months), Later (12+ months); each item shows area, action, effort, impact, and a “Find Support” CTA.
- **Find Support:** Surfaces consultants, training, funding, and procurement calls matching each recommendation.
- **Download PDF:** “Wathaci_Business_Health_Report_<SMEName>_<YYYYMMDD>.pdf”.

### PDF Contents
- Cover page: SME name, logo, date, Wathaci branding.
- Executive summary narrative + scorecards.
- SWOT grid.
- Recommendations with how/why, effort, timelines.
- Suggested partners and opportunities.

## Example Outputs

### Micro SME (informal, minimal data)
- Scores: Funding 28, Compliance 22, Digital 30.
- Bottlenecks: Missing tax registration, no financial statements, no website.
- Recommendations: Register for tax, set up simple bookkeeping, launch basic website and WhatsApp ordering.
- Partners: Compliance desk, micro-grant programme.

### Growing SME (formalised, uneven systems)
- Scores: Funding 62, Compliance 68, Digital 55, Operations 58.
- Bottlenecks: Thin management accounts, weak digital presence, incomplete SOPs.
- Recommendations: Prepare 12-month management accounts, digitise invoicing, document core processes, pursue working capital line.
- Partners: SME bank unit, digital sales bootcamp, process improvement consultant.

### Mature SME (seeking scale capital)
- Scores: Funding 82, Compliance 85, Digital 78, Governance 80.
- Bottlenecks: Customer concentration risk, supplier redundancy.
- Recommendations: Diversify customer base, negotiate better payment terms, invest in redundancy for key suppliers, prep for debt/equity raise.
- Partners: Local bank for capex facility, sector anchor buyers, export advisor.

---

✅ Wathaci AI SME Auto-Diagnosis Engine implemented: SMEs can now generate a comprehensive business health report, get scores, identify bottlenecks, and discover relevant support and finance options through a single integrated experience.
