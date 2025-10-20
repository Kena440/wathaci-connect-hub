# Payment Threshold Compliance Validation

## Compliance Baseline
Stakeholder-approved transaction limits documented in the environment quick reference specify:
- Platform fee percentage: `5`
- Minimum payment amount: `5`
- Maximum payment amount: `1000000`

These values represent the mandated compliance guardrails for all environments.

## Configuration Review
The current configuration matches the compliance baseline:
- `.env.example` seeds the frontend environment with:
  - `VITE_PLATFORM_FEE_PERCENTAGE="5"`
  - `VITE_MIN_PAYMENT_AMOUNT="5"`
  - `VITE_MAX_PAYMENT_AMOUNT="1000000"`
- `src/lib/payment-config.ts` falls back to the same values at runtime if environment variables are missing.
- `LencoPayment` UI validation enforces the ZMW 5.00 minimum and ZMW 1,000,000.00 maximum at form submission.

## Observations
- The values published in `docs/PAYMENT_INTEGRATION_GUIDE.md` (`VITE_PLATFORM_FEE_PERCENTAGE="2"`) appear outdated relative to the compliance baseline. Consider updating that guide to avoid conflicting guidance for engineers.
- No discrepancies were detected between the configured thresholds and the compliance limits.

## Conclusion
All configured payment thresholds (platform fee, minimum amount, maximum amount) currently align with the stakeholder-approved compliance limits. Keep the documentation in sync to prevent regressions during future key rotations or environment updates.
