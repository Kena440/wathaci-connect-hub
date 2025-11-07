# Payment Threshold Compliance Validation

## Compliance Baseline
Stakeholder-approved transaction limits documented in the environment quick reference specify:
- Platform fee percentage: `10`
- Minimum payment amount: `0`
- Maximum payment amount: `50000`

These values represent the mandated compliance guardrails for all environments.

## Configuration Review
The current configuration matches the compliance baseline:
- `.env.example` seeds the frontend environment with:
  - `VITE_PLATFORM_FEE_PERCENTAGE="10"`
  - `VITE_MIN_PAYMENT_AMOUNT="0"`
  - `VITE_MAX_PAYMENT_AMOUNT="50000"`
- `src/lib/payment-config.ts` falls back to the same values at runtime if environment variables are missing.
- `LencoPayment` UI validation enforces the ZMW 0.00 minimum and ZMW 50,000.00 maximum at form submission.

## Observations
- The values published in `docs/PAYMENT_INTEGRATION_GUIDE.md` have been refreshed to match the compliance baseline so that engineers receive consistent guidance across references.
- No discrepancies were detected between the configured thresholds and the compliance limits.

## Conclusion
All configured payment thresholds (platform fee, minimum amount, maximum amount) currently align with the stakeholder-approved compliance limits. Keep the documentation in sync to prevent regressions during future key rotations or environment updates.
