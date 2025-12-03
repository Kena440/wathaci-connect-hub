# WATHACI Knowledge Operations Playbook

Use this playbook to keep **wathaci_knowledge** complete, structured, and easy for Ciso to query. It covers what to document (coverage matrix), how to document (entry template), how to seed/update knowledge, and how to test that Ciso is using the latest context.

## Coverage matrix (what Ciso must know)

Start by prioritising SME-facing scenarios across **payments**, **matching**, and **support**, then fill the rest of the matrix. Treat each row as a required knowledge entry.

| Category | Audience   | Example entries and focus |
| --- | --- | --- |
| general | all | What is WATHACI, who it serves, and how it works overall |
| signup | sme | SME sign-up steps, fields, examples, and common errors |
| signup | investor | Investor sign-up & profile, what to include in thesis |
| signup | donor | Donor/grant-maker onboarding, programme details |
| signup | government | Government programme or agency onboarding |
| signup | professional | Professional/freelancer profile fields & examples |
| profile | sme | What a strong SME profile looks like (examples) |
| profile | investor | How to write a clear investment thesis |
| profile | professional | How to describe skills, rates, and projects |
| payments | all | How plans & payments work conceptually |
| payments | sme | SME plan examples, typical issues & fixes |
| matching | all | How matching works conceptually |
| matching | sme | How SMEs can become more “matchable” |
| matching | investor | What info investors should provide to get good SME matches |
| support | all | When/how to contact support, what to include |
| support | admin | Internal triage guidelines (sanitised, non-secret) |

## Entry template (repeatable content structure)

Use this structure for every **wathaci_knowledge** row so Ciso’s answers stay consistent and actionable:

```
## Summary
1–3 sentences explaining the main point.

## When this applies
- Situation 1
- Situation 2
- Situation 3

## Key details
- Bullet point 1
- Bullet point 2
- Bullet point 3

## Step-by-step guidance for users
1. Step 1
2. Step 2
3. Step 3

## What to do if problems persist
- Suggest checking X/Y/Z.
- Advise emailing support@wathaci.com with:
  - Info A
  - Info B
  - Info C
- Remind: no passwords or full card details by email.
```

## Seed new, high-value knowledge entries

A migration has been added at `supabase/migrations` to seed six new entries covering SME profiles, investor onboarding, SME payments, SME matching, professional profiles, and admin support triage. Apply migrations (or run the SQL once in Supabase) to load them into `wathaci_knowledge`.

## Update and test routine (keep Ciso sharp)

1. **Detect changes** – Any time you launch a new flow, role, plan, payment rule, error code, or matching rule, update or add a knowledge row using the template above.
2. **Tag and categorise** – Set `category` (general, signup, profile, payments, matching, support, etc.), `audience` (all, sme, investor, donor, government, professional, admin), and 2–5 descriptive tags (error codes, gateway, flow, theme).
3. **Changelog** – Log the slugs and dates in `docs/wathaci-knowledge-changelog.md` so the team can trace updates.
4. **Test via Ciso** – Prompt Ciso with role-specific questions (e.g., “As an SME, how do I resolve a pending payment?” or “As an investor, what steps do I take to refine my thesis?”) and confirm the answers reflect the latest entries.
5. **Iterate** – If answers feel incomplete, add detail to the relevant `wathaci_knowledge` rows and re-test.

Following this routine keeps Ciso reliable without redeploying code.
