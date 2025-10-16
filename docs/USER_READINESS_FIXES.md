# Profile Setup Launch Readiness

The remaining launch blockers identified during profile setup QA have been addressed and verified.

## ✅ Account-type upserts respect server-managed timestamps
- `ProfileSetup.handleAccountTypeSelect` now only includes `created_at` when inserting a brand-new profile record, preventing conflicts with Supabase's immutable timestamp columns.
- Subsequent updates simply persist the selected account type without attempting to overwrite server-generated fields.

## ✅ Card payments collect the required details
- `ProfileForm` surfaces masked inputs for card number and expiry when the card option is selected, along with inline validation messaging.
- Submitted payloads now include sanitized card details so Supabase validation succeeds when card payments are required.

With these fixes deployed, users can complete profile setup end-to-end using either mobile money or card-based payment preferences.
