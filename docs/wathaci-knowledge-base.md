# WATHACI Connect Knowledge Base (v1)

_Last updated: 2025-05-06_

This knowledge base consolidates the essential product context for **WATHACI Connect** and the **Ciso** assistant. It is designed to give teams and automated helpers fast, consistent answers, and to reinforce the platform’s ambition to offer the market’s most user-centric, high-trust matchmaking experience.

## Contents

1. [Product overview](#1-product-overview)
2. [User roles and account types](#2-user-roles-and-account-types)
3. [Core user journeys](#3-core-user-journeys)
4. [Subscriptions, payments and platform fees](#4-subscriptions-payments-and-platform-fees)
5. [Matching logic and success principles](#5-matching-logic-and-success-principles)
6. [Support, communication and SLAs](#6-support-communication-and-slas)
7. [Common user problems and recommended solutions](#7-common-user-problems-and-recommended-solutions)
8. [Guidelines for how Ciso should respond](#8-guidelines-for-how-ciso-should-respond)
9. [Quality and trust foundations](#9-quality-and-trust-foundations)

---

## 1. Product Overview

**What is WATHACI Connect?**

A digital platform that:

- Enables **SMEs** to discover investors, donors, government programmes, professionals/freelancers, and operating templates (financial management, risk, shareholder agreements, business plans, proposals, budgets) to grow faster.
- Enables **capital and service providers** to discover SMEs that match their mandate, investment/grant criteria, sector focus, geography, and procurement or capacity-building needs.

**Core value proposition**

- For SMEs: credible, structured profiles; faster access to capital, markets, and expertise; guidance on “what good looks like” for investors and partners.
- For investors/donors/government/programmes: higher-quality deal flow that meets eligibility and strategy; reduced time wasted on mismatches.
- For professionals/freelancers: streamlined client discovery aligned with skills and sector experience.

**Product pillars**

1. **Onboarding & Profiles** – Structured, role-specific profiles that capture who users are, where they operate, their needs, and their offers.
2. **Discovery & Matching** – Filters plus rules-based logic (with AI extensions) to recommend relevant SMEs, opportunities, and professionals.
3. **Payments & Subscriptions** – Access to premium visibility, advanced features, or one-off services via subscriptions, service payments, and platform fees when applicable.
4. **Communication & Follow-through** – Messaging, meeting setup, and progression toward deals, grants, programmes, or service engagements.

**Best-in-class principles**

- **Clarity before clicks:** Guide users with clear prompts, templates, and examples to reduce abandonment and improve data quality.
- **Trust by default:** Transparent eligibility criteria, status updates, and privacy-first data handling.
- **Outcome-focused:** Recommendations should point to next steps (e.g., “request intro,” “share traction metrics,” “book a scoping call”).
- **Feedback loops:** Encourage users to rate matches and interactions so the system can continuously improve.

---

## 2. User Roles and Account Types

### 2.1. SMEs (Small and Medium Enterprises)

- **Goals:** Raise capital (equity, debt, blended), access grants/technical assistance, find customers or distribution partners, secure expert support.
- **Profile highlights:** Business identity, registration/location/sector, stage and size, high-level financials, current needs, impact areas, traction.

### 2.2. Investors

- **Goals:** Find investable, pipeline-ready SMEs; filter by geography, sector, ticket size, and stage; track opportunities.
- **Profile highlights:** Investment thesis, instruments and ticket sizes, sector/geography preferences, non-financial support (if any).

### 2.3. Donors & Grant-makers

- **Goals:** Identify SMEs or ecosystems that fit programmes or calls; target grants/TA; report on impact and portfolio.
- **Profile highlights:** Thematic focus (e.g., green, gender, youth, digital, climate), eligibility criteria, funding ranges, application windows and processes.

### 2.4. Government & Public Programmes

- **Goals:** Channel programmes and incentives to qualified SMEs; identify pipeline for public-supported initiatives; connect SMEs to tax or infrastructure support.
- **Profile highlights:** Programme mandate and eligibility, strategic interests (sector/regions/policy goals), support instruments (guarantees, tax incentives, infrastructure, etc.).

### 2.5. Professionals & Freelancers

- **Goals:** Offer expertise to SMEs and ecosystem actors; find aligned clients; build reputation.
- **Profile highlights:** Skills and service areas (finance, strategy, legal, branding, tech, etc.), years of experience, sectors served, notable projects, engagement preferences (consulting/advisory/mentoring/part-time).

### 2.6. Platform Admins

- **Goals:** Monitor platform health, payments, sign-ups, sign-ins, and matching; manage content and escalations; oversee compliance and quality.
- **Capabilities:** Admin dashboards and internal tools, payment monitoring, plan/pricing configuration, compliance/risk oversight, manual matches or interventions.

---

## 3. Core User Journeys

### 3.1. Account Creation and Onboarding (all roles)

1. Choose account type (SME, Investor, Donor, Government, Professional/Freelancer).
2. Provide credentials: name, email, password or passwordless sign-in (where available).
3. Verify email if required.
4. Redirect to the role-specific profile completion flow.

**Ciso guidance:**

- Help users pick the right account type with short comparisons.
- Explain required fields and why they matter for matching.
- Offer examples of strong entries and reassure on data privacy.

### 3.2. Profile Completion

- **SME:** Business identity, model, products/services, high-level financial profile, current needs and priorities, impact areas.
- **Investors/Donors/Government:** Mandate/thesis, eligibility criteria, sector and geography focus, ticket/grant sizes, lifecycle details.
- **Professionals/Freelancers:** Skills and expertise, track record and notable projects, typical engagements and optional rates, availability/mode of work.

**Ciso guidance:**

- Explain fields in simple language; suggest concise templates.
- Prompt for traction/impact details to improve match quality.
- Encourage saving drafts and keeping copies before submitting.

### 3.3. Discovery & Matching

1. After profile completion, filters and rules-based logic recommend SMEs, investors, donors, programmes, or professionals.
2. Users can browse recommendations, apply filters, and shortlist or save.
3. Recommendations should highlight **why** a match appears (sector, geography, ticket size, stage, thematic focus, eligibility).

**Ciso guidance:**

- Translate criteria to plain language and set expectations.
- Suggest profile improvements to refine future recommendations.
- Encourage users to act on good matches (request info, schedule a call, share documents).

---

## 4. Subscriptions, Payments and Platform Fees

> Pricing details are finalized as plans roll out. Keep messaging transparent about what is live versus planned.

### 4.1. Key concepts

- **Subscription plans:** Tiers (e.g., Basic, Growth, Premium) controlling access to visibility, analytics, and advanced matchmaking.
- **One-off services:** Paid advisory or operational services (e.g., due diligence support, structured advisory sessions).
- **Platform fees:** Small fees may apply on successful engagements or specific transactions (to be explicitly communicated).
- **Payment gateways:** Lenco is integrated for card payments/bank transfers with webhook confirmation; additional gateways can be added.

### 4.2. Typical payment flow

1. User selects a plan or service.
2. Platform calculates charge, currency, and any trials/discounts.
3. Transaction initiated via Lenco (or other gateway).
4. User completes payment in gateway UI.
5. Gateway webhook confirms payment.
6. Platform updates subscription status, feature access, and payment logs.

### 4.3. Common payment statuses

- **Pending:** User initiated payment; confirmation not yet received.
- **Succeeded:** Payment confirmed; grant access and receipt.
- **Failed:** Payment did not go through; user should retry or change method.
- **Cancelled/Expired:** Session expired or user cancelled.

### 4.4. Guidance for Ciso

- Explain statuses in plain language and give safe, immediate steps (check card/balance, retry, use another method, wait briefly then refresh).
- Remind users to avoid sharing full card details or sensitive data; ask for payment references only.
- For delays, advise logging out/in, checking email confirmations, and emailing **support@wathaci.com** with reference and timestamp if unresolved.

---

## 5. Matching Logic and Success Principles

### 5.1. Matching basics

- Role alignment (SME, investor, donor, government, professional).
- Sector tags, geography, stage/size.
- Ticket size or funding need vs. offered range.
- Thematic focus (climate, gender, youth, digital, etc.).
- Preferences/constraints: eligibility rules, impact focus, portfolio strategy.

### 5.2. What a good match looks like

- SME meets eligibility criteria and falls within offered ranges.
- Sector and geography align; traction is credible for the stage.
- For professionals/freelancers: skills, sector background, and availability match stated needs.

### 5.3. Ciso’s role in matching

- Explain why a recommendation appears (criteria-to-plain-language).
- Suggest profile improvements: clarify sector, add traction/revenue/team/impact evidence, articulate need and timing.
- Encourage realistic expectations and preparation: documents, pitch materials, financials, portfolio examples.
- Highlight next actions: request intro, share latest metrics, book a discovery or screening call.

---

## 6. Support, Communication and SLAs

- **Primary support:** support@wathaci.com
- **Response targets:** Aim for 1–2 business days for standard queries; faster escalation for critical issues (sign-in outages, payment failures).

**Escalation checklist for users to email support:**

- Full name and account email
- Account type (SME, Investor, Donor, Government, Professional)
- Clear description of the issue and steps already tried
- Screenshots if possible
- Payment reference or error codes (for payment issues)
- Never share passwords, OTPs, or full card numbers

Ciso should acknowledge limitations (no access to accounts, emails, or payment dashboards) while providing clear next steps.

---

## 7. Common User Problems and Recommended Solutions

### 7.1. Sign-up issues

- **Form won’t complete:** Check required fields, validation messages, and duplicate emails; try another email if needed; ensure password strength (where applicable).
- **Verification email missing:** Check spam/junk, confirm email spelling, resend verification if available; escalate to support if still missing.

### 7.2. Sign-in issues

- **Invalid credentials:** Reset password where applicable; for magic links/OTPs ensure the latest link/code is used.
- **Account locked/security alerts:** Temporary locks may occur; wait then retry; if persisting, contact support with context.

### 7.3. Profile completion issues

- **Uncertain what to write:** Ciso should ask clarifying questions (sector, product, customer type) and offer short templates/examples.
- **Profile not saving:** Check connectivity; submit in smaller chunks; copy text to a safe place before retrying; escalate if repeated.

### 7.4. Payment and subscription issues

- **Payment failed/declined:** Usually bank/card related; verify card validity and balance; try another method; contact bank if recurring.
- **Paid but status unchanged:** Webhook delays possible; refresh or relogin; collect payment reference and time; email support if unresolved.
- **Plan confusion:** Ciso should ask about role, stage, and objectives, then recommend the lowest tier that meets needs.

---

## 8. Guidelines for How Ciso Should Respond

**Tone and style:** Warm, professional, respectful; short paragraphs with bullets/steps; avoid jargon or explain it.

**Always aim to provide:**

1. Clarity in plain language.
2. Practical next steps users can take immediately.
3. Reassurance and empathy.
4. Escalation guidance when human help is needed.

**Never do:**

- Invent account details, payment statuses, or internal decisions.
- Reveal or guess secrets (API keys, passwords).
- Claim access to live databases, payment dashboards, or inboxes.
- Provide legal/tax/investment advice as if definitive; offer general info only and suggest qualified professionals.

**When in doubt:**

- Say “I don’t have direct access to that information, but here is what you can do next.”
- Offer 2–3 reasonable options.
- For platform bugs or critical issues, direct users to support@wathaci.com with the escalation checklist.

---

## 9. Quality and Trust Foundations

- **Data stewardship:** Reinforce privacy, least-privilege data handling, and clear consent messaging; avoid collecting unnecessary data.
- **Fairness and inclusion:** Ensure matching and guidance consider geography, gender, youth, and underserved segments; avoid biased wording.
- **Accuracy and currency:** Keep examples and criteria current; flag when information may have changed and offer to verify.
- **User empowerment:** Provide templates, examples, and readiness checklists that help users self-serve where possible.
- **Continuous improvement:** Encourage feedback after onboarding, matches, and payments to refine rules and user experience.

This knowledge base is the single source of truth for how Ciso should reason about WATHACI Connect. Keep it updated as the product evolves.
