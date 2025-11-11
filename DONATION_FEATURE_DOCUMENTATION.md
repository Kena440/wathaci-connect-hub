# Donation Feature Documentation

## Overview

The Donation feature enables users to support struggling SMEs (Small and Medium Enterprises) on the Wathaci Connect platform. Each donation helps SMEs cover short-term operational gaps—such as working capital, inventory, rent, and operational costs—so they can stabilize, strengthen their businesses, and become investment-ready for long-term sustainability.

## Architecture

### Frontend Components

#### DonateButton.tsx
- **Location**: `src/components/DonateButton.tsx`
- **Purpose**: Main UI component for donation flow
- **Features**:
  - Preset donation amounts (K20, K50, K100, K250)
  - Custom amount input with validation
  - Platform fee calculation and transparent display
  - Optional donor name and message fields
  - Anonymous donation checkbox
  - Real-time payment breakdown showing gross amount, platform fee, net to SME, and total charged

### Backend Functions

#### create-donation
- **Location**: `supabase/functions/create-donation/index.ts`
- **Purpose**: Creates donation records and initializes Lenco payments
- **Flow**:
  1. Validates donation request (amount within min/max limits)
  2. Calculates platform fee and net amount
  3. Generates unique Lenco payment reference (format: `DON-{timestamp}-{random}`)
  4. Creates pending donation record in database
  5. Calls Lenco API to initialize payment
  6. Returns checkout URL to frontend

#### lenco-payments-validator
- **Location**: `supabase/functions/lenco-payments-validator/index.ts`
- **Purpose**: Webhook handler for payment confirmations
- **Flow**:
  1. Authenticates webhook using `x-lenco-signature` header
  2. Parses webhook payload
  3. Identifies transaction type (donation vs regular payment)
  4. Updates donation status based on payment result
  5. Implements idempotency to prevent duplicate processing
  6. Logs all webhook events to `webhook_logs` table

### Services

#### donation-service.ts
- **Location**: `src/lib/services/donation-service.ts`
- **Purpose**: Frontend service for donation operations
- **Functions**:
  - `createDonation()`: Calls backend to create donation
  - `calculateDonationBreakdown()`: Calculates fees and net amounts
  - `getDonationStatus()`: Retrieves donation status by reference
  - `getUserDonations()`: Fetches user's donation history

## Database Schema

### donations Table

```sql
CREATE TABLE donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Campaign/SME reference
  campaign_id uuid NULL,
  
  -- Donor information (nullable for anonymous)
  donor_user_id uuid NULL REFERENCES auth.users(id),
  donor_name text NULL,
  
  -- Payment amounts (in ZMW)
  amount numeric(18,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  platform_fee_amount numeric(18,2) NOT NULL DEFAULT 0,
  net_amount numeric(18,2) NOT NULL,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  
  -- Lenco integration
  lenco_reference text NOT NULL UNIQUE,
  lenco_transaction_id text NULL,
  lenco_authorization_url text NULL,
  lenco_access_code text NULL,
  
  -- Additional info
  message text NULL,
  source text NOT NULL DEFAULT 'web',
  
  -- Metadata
  metadata jsonb NULL DEFAULT '{}'::jsonb,
  gateway_response jsonb NULL,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Indexes**:
- `donations_donor_user_id_idx` on `donor_user_id`
- `donations_campaign_id_idx` on `campaign_id`
- `donations_status_idx` on `status`
- `donations_lenco_reference_idx` on `lenco_reference`
- `donations_created_at_idx` on `created_at DESC`

## Environment Variables

### Frontend (Vite)

```env
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_KEY="your-anon-key"

# Lenco Payment Configuration
VITE_LENCO_PUBLIC_KEY="your-lenco-public-key"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"

# Payment Limits (in ZMW)
VITE_MIN_PAYMENT_AMOUNT="10"
VITE_MAX_PAYMENT_AMOUNT="50000"

# Platform Fee (percentage, e.g., 5 for 5%)
VITE_PLATFORM_FEE_PERCENTAGE="5"
```

### Backend (Supabase Edge Functions)

```env
# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Lenco API
LENCO_SECRET_KEY="your-lenco-secret-key"
LENCO_API_SECRET="your-lenco-api-secret"
LENCO_WEBHOOK_URL="https://your-project.supabase.co/functions/v1/lenco-payments-validator"
LENCO_WEBHOOK_SECRET="your-webhook-secret"

# Payment Configuration
MIN_PAYMENT_AMOUNT="10"
MAX_PAYMENT_AMOUNT="50000"
PLATFORM_FEE_PERCENTAGE="5"
```

## Business Logic

### Platform Fee Calculation

```typescript
platformFee = floor((amount * platformFeePercentage) / 100)
netAmount = amount - platformFee
```

Example: K100 donation with 5% fee
- Gross: K100
- Platform fee: K5
- Net to SME: K95
- Total charged to donor: K100

### Amount Validation

- **Minimum**: Configured via `VITE_MIN_PAYMENT_AMOUNT` (default: K10)
- **Maximum**: Configured via `VITE_MAX_PAYMENT_AMOUNT` (default: K50,000)
- Frontend and backend both validate to ensure consistency

### Status Lifecycle

1. **pending**: Initial state when donation is created
2. **completed**: Webhook confirms successful payment
3. **failed**: Payment failed or was declined
4. **cancelled**: User cancelled the payment

### Reference Generation

Format: `DON-{timestamp}-{random}`

Example: `DON-1699564823456-A3B7C9`

This ensures:
- Uniqueness across all donations
- Easy identification of donation transactions
- Sortable by creation time

## Integration with Lenco

### Payment Initialization

The `create-donation` function calls:
```
POST https://api.lenco.co/access/v2/payments/initialize
```

With payload:
```json
{
  "amount": 10000,  // Amount in smallest unit (ngwee)
  "currency": "ZMK",
  "email": "donor@example.com",
  "name": "John Doe",
  "phone": "",
  "reference": "DON-1699564823456-A3B7C9",
  "callback_url": "https://your-project.supabase.co/functions/v1/lenco-payments-validator",
  "metadata": {
    "donation_id": "uuid",
    "transaction_type": "donation",
    "platform": "WATHACI_CONNECT"
  }
}
```

### Webhook Handling

Lenco sends webhook to `/functions/v1/lenco-payments-validator` with:

```json
{
  "event": "payment.completed",
  "data": {
    "reference": "DON-1699564823456-A3B7C9",
    "status": "success",
    "amount": 10000,
    "currency": "ZMK",
    "id": "lenco_transaction_id",
    "metadata": {
      "donation_id": "uuid"
    }
  }
}
```

The validator:
1. Verifies signature via `x-lenco-signature` header
2. Checks if reference starts with `DON-` to identify as donation
3. Updates donation status to `completed`
4. Implements idempotency check
5. Logs event to `webhook_logs`

## User Experience Flow

1. User clicks **Donate** button
2. Modal opens showing:
   - Impact statement about helping SMEs
   - Preset amounts (K20, K50, K100, K250)
   - Custom amount input
   - Payment breakdown with transparent fees
   - Optional fields (name, message, anonymous checkbox)
3. User selects/enters amount
4. Breakdown updates in real-time
5. User optionally enters name and message
6. User clicks **Donate K{amount}**
7. Frontend validates and calls `create-donation` function
8. Backend creates donation record and initializes Lenco payment
9. User redirected to Lenco checkout page
10. User completes payment on Lenco
11. Lenco sends webhook to `lenco-payments-validator`
12. Donation status updated to `completed`
13. User redirected back to platform (via Lenco callback)

## Testing

### Manual Testing

1. **Valid Donation**:
   - Click Donate button
   - Select K50
   - Enter name (optional)
   - Verify breakdown shows correct amounts
   - Submit and verify Lenco redirect

2. **Anonymous Donation**:
   - Select amount
   - Check "Donate anonymously"
   - Verify name field is hidden
   - Submit and verify donation created

3. **Custom Amount**:
   - Enter custom amount (e.g., 75)
   - Verify breakdown calculates correctly
   - Submit successfully

4. **Validation**:
   - Try amount below minimum (should show error)
   - Try amount above maximum (should show error)
   - Try without selecting amount (should show error)

### Backend Testing

Deploy functions:
```bash
npm run supabase:deploy
```

Test webhook:
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/lenco-payments-validator \
  -H "x-lenco-signature: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.completed",
    "data": {
      "reference": "DON-1699564823456-A3B7C9",
      "status": "success"
    }
  }'
```

## Security Considerations

1. **Webhook Authentication**: All webhooks verified via `x-lenco-signature` header
2. **Input Validation**: Amount validated on both frontend and backend
3. **SQL Injection**: Using parameterized queries via Supabase client
4. **CORS**: Properly configured for frontend domain
5. **Service Role Key**: Securely stored in environment variables
6. **Idempotency**: Prevents duplicate processing of webhooks

## Deployment Checklist

- [ ] Update `.env` with production Lenco keys
- [ ] Set `VITE_MIN_PAYMENT_AMOUNT` and `VITE_MAX_PAYMENT_AMOUNT`
- [ ] Set `VITE_PLATFORM_FEE_PERCENTAGE`
- [ ] Deploy Supabase migrations: `npm run supabase:push`
- [ ] Deploy Edge Functions: `npm run supabase:deploy`
- [ ] Configure Lenco webhook URL in Lenco dashboard
- [ ] Test end-to-end donation flow in production
- [ ] Verify webhook handling with real Lenco transactions
- [ ] Monitor `webhook_logs` table for issues

## Monitoring

### Key Metrics

- Total donations (count)
- Total donation amount (sum)
- Average donation amount
- Platform fee collected
- Net amount to SMEs
- Conversion rate (initiated vs completed)
- Failed payment rate

### Queries

**Total donations today**:
```sql
SELECT COUNT(*), SUM(amount), SUM(net_amount)
FROM donations
WHERE created_at >= CURRENT_DATE
AND status = 'completed';
```

**Failed donations**:
```sql
SELECT *
FROM donations
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

**Webhook errors**:
```sql
SELECT *
FROM webhook_logs
WHERE source = 'lenco'
AND error IS NOT NULL
ORDER BY created_at DESC;
```

## Support

For issues or questions:
- Check `webhook_logs` table for webhook errors
- Check Supabase function logs: `npm run supabase:logs`
- Verify environment variables are set correctly
- Ensure Lenco API keys are valid and not expired
- Test webhook signature validation

## Future Enhancements

- [ ] Campaign-specific donation tracking
- [ ] Recurring donations
- [ ] Donation leaderboard
- [ ] Tax receipt generation
- [ ] Email notifications for donors
- [ ] SMS confirmations
- [ ] Donation impact reports
- [ ] Multi-currency support
- [ ] Gift donations (donate on behalf of someone)
