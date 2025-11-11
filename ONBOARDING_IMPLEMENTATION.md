# Onboarding Flow Implementation Guide

## Overview

This document describes the new onboarding flow for WATHACI CONNECT, which allows users to select their account type and complete a needs assessment during profile creation.

## User Flow

1. **Get Started Page** (`/get-started`)
   - User selects their account type:
     - SME (Small & Medium Enterprise)
     - Professional (Advisor/Consultant)
     - Donor
     - Investor
     - Government
   
2. **Needs Assessment** (`/onboarding/{type}/needs-assessment`)
   - User completes a multi-step form specific to their account type
   - All forms require a mobile money number (MSISDN) for payment processing
   - Forms collect structured data for AI matching

3. **Profile Creation**
   - Profile and needs assessment data are saved to the database
   - User is redirected to assessment results or dashboard

## Implementation Details

### Routes

All new onboarding routes are protected (require authentication):

```
/onboarding/sme/needs-assessment          - SME onboarding (4 steps)
/onboarding/professional/needs-assessment - Professional onboarding (3 steps)
/onboarding/donor/needs-assessment        - Donor onboarding (3 steps)
/onboarding/investor/needs-assessment     - Investor onboarding (3 steps)
/onboarding/government/needs-assessment   - Government redirect
```

### Database Schema

#### Profiles Table
Added `msisdn` field:
```sql
msisdn text -- Mobile money number (9-15 digits)
```

Constraint ensures valid format:
```sql
CHECK (msisdn IS NULL OR msisdn ~ '^\+?[0-9]{9,15}$')
```

#### Needs Assessment Tables
Each account type has its own assessment table:
- `sme_needs_assessments`
- `professional_needs_assessments`
- `donor_needs_assessments`
- `investor_needs_assessments`

### Helper Functions

The `src/lib/onboarding.ts` module provides:

#### `upsertProfile(params)`
Creates or updates a user profile.

**Required Parameters:**
- `account_type`: Account type ('sme', 'professional', 'donor', 'investor')
- `msisdn`: Mobile money number (required)

**Optional Parameters:**
- `full_name`: User's full name
- `business_name`: Business/organization name
- Additional account-specific fields

**Example:**
```typescript
await upsertProfile({
  account_type: 'sme',
  business_name: 'Acme Ltd',
  msisdn: '+260123456789'
});
```

#### Assessment Save Functions

Each account type has a dedicated save function:

**`saveSmeNeedsAssessment(payload)`**
```typescript
await saveSmeNeedsAssessment({
  sector: 'technology',
  stage: 'growth',
  monthly_revenue_range: '50,000 - 100,000',
  main_challenges: ['Working capital', 'Marketing'],
  support_needs: ['Financial management', 'Sales & marketing'],
  funding_amount_range: '10,000 - 50,000',
  funding_type: 'grant'
});
```

**`saveProfessionalNeedsAssessment(payload)`**
```typescript
await saveProfessionalNeedsAssessment({
  expertise_areas: ['Financial management', 'Business strategy'],
  years_of_experience: 10,
  preferred_sme_segments: ['Early-stage startups'],
  availability: '10 hours per week',
  engagement_type: 'paid'
});
```

**`saveDonorNeedsAssessment(payload)`**
```typescript
await saveDonorNeedsAssessment({
  focus_areas: ['Youth entrepreneurship', 'Women-led businesses'],
  geography_preferences: ['Zambia', 'East Africa'],
  reporting_requirements: 'quarterly',
  preferred_payment_method: 'mobile_money'
});
```

**`saveInvestorNeedsAssessment(payload)`**
```typescript
await saveInvestorNeedsAssessment({
  investment_types: ['Equity', 'Debt'],
  sector_preferences: ['Technology', 'Agriculture'],
  stage_preferences: ['Seed', 'Early growth'],
  geography: 'Zambia',
  time_horizon: '3-5',
  involvement_level: 'board'
});
```

## Form Structure

### SME Assessment (4 Steps)

**Step 1: Business Information**
- Business name
- Sector/industry
- Business stage
- Monthly revenue range
- Number of employees
- Location (country, city)

**Step 2: Challenges & Needs**
- Main challenges (multi-select)
- Support needs (multi-select)

**Step 3: Funding Requirements**
- Funding amount needed
- Preferred funding type

**Step 4: Payment Information**
- MSISDN (required)
- Card availability (yes/no)

### Professional Assessment (3 Steps)

**Step 1: Basic Information**
- Full name
- Years of experience

**Step 2: Expertise & Preferences**
- Areas of expertise (multi-select)
- Preferred SME segments (multi-select)
- Availability (hours per week/month)
- Engagement type (paid/pro bono/hybrid)

**Step 3: Payment Information**
- MSISDN (required)

### Donor Assessment (3 Steps)

**Step 1: Organization Information**
- Organization name
- Typical grant/donation size

**Step 2: Funding Priorities**
- Focus areas (multi-select)
- Geography preferences (multi-select)
- Reporting requirements

**Step 3: Payment Information**
- Preferred payment method
- MSISDN (required)

### Investor Assessment (3 Steps)

**Step 1: Basic Information**
- Name/Organization
- Typical investment size
- Geography focus

**Step 2: Investment Preferences**
- Investment types (multi-select)
- Sector preferences (multi-select)
- Stage preferences (multi-select)
- Time horizon
- Involvement level

**Step 3: Payment Information**
- MSISDN (required)

## Validation

All forms include:
- Client-side validation using Zod schemas
- Required field validation
- MSISDN format validation (9-15 digits, optional + prefix)
- Multi-select minimum selection validation
- Error messages displayed inline

## AI Integration

The needs assessment data is structured to support:

1. **SME Matching**
   - Match SMEs with professionals based on support needs and expertise
   - Match SMEs with donors based on focus areas and funding needs
   - Match SMEs with investors based on sector, stage, and funding requirements

2. **Funding Recommendations**
   - Suggest grant programs based on sector and stage
   - Recommend loan products based on revenue and funding needs
   - Identify investment opportunities based on growth stage

3. **Professional Matching**
   - Connect professionals with SMEs needing their expertise
   - Match engagement types with SME preferences

## Testing

Run tests with:
```bash
npm run test:jest -- --testPathPatterns="onboarding|GetStarted"
```

Tests cover:
- Profile creation with MSISDN
- Validation of required fields
- Navigation flows
- Error handling

## Migration

To apply the database changes:

```bash
# Using Supabase CLI
supabase db push

# Or execute the migration directly
psql -f supabase/migrations/20241111000000_add_msisdn_to_profiles.sql
```

## Security

- All routes are protected with `<PrivateRoute>`
- MSISDN is validated on both client and server
- No sensitive card data is stored directly
- CodeQL security scan passed with 0 alerts

## Future Enhancements

Potential improvements:
1. Add MSISDN verification via OTP
2. Implement card details encryption
3. Add progress saving (draft mode)
4. Include assessment completion reminders
5. Add multi-language support for forms
