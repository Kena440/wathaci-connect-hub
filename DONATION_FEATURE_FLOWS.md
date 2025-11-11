# Donation Feature - Visual Flow Diagrams

## User Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Journey                              │
└─────────────────────────────────────────────────────────────────┘

    User on Platform
         │
         ▼
    [Donate Button]
         │
         ▼
    ┌─────────────────────────────────────┐
    │     Donation Modal Opens            │
    │                                     │
    │  ┌───────────────────────────────┐ │
    │  │ Impact Statement:             │ │
    │  │ "Help SMEs cover working      │ │
    │  │ capital, inventory, rent..."  │ │
    │  └───────────────────────────────┘ │
    │                                     │
    │  ┌───────────────────────────────┐ │
    │  │ Amount Selection:             │ │
    │  │  [K20] [K50] [K100] [K250]   │ │
    │  │  Custom: [____] ZMW          │ │
    │  └───────────────────────────────┘ │
    │                                     │
    │  ┌───────────────────────────────┐ │
    │  │ Breakdown (Real-time):        │ │
    │  │  Donation:      K100.00       │ │
    │  │  Platform fee:  K5.00 (5%)    │ │
    │  │  To SME:        K95.00        │ │
    │  │  Total:         K100.00       │ │
    │  └───────────────────────────────┘ │
    │                                     │
    │  ☐ Donate anonymously               │
    │  Name: [________________]           │
    │  Message: [____________]            │
    │                                     │
    │  [Cancel]  [Donate K100.00]         │
    └─────────────────────────────────────┘
         │
         ▼
    Validation
         │
         ▼
    API Call to Backend
         │
         ▼
    Redirect to Lenco
         │
         ▼
    User Completes Payment
         │
         ▼
    Webhook Updates Status
         │
         ▼
    ✅ Donation Complete
```

## Technical Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Component Architecture                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   DonateButton   │  (React Component)
│   Component      │
└────────┬─────────┘
         │
         │ uses
         ▼
┌──────────────────┐
│ donation-service │  (Frontend Service)
│   .ts            │
└────────┬─────────┘
         │
         │ calls
         ▼
┌──────────────────────────────────────────────────────────────┐
│            Supabase Edge Function                             │
│         /functions/v1/create-donation                         │
│                                                               │
│  1. Validate amount (min/max)                                │
│  2. Calculate fees                                            │
│     platformFee = floor((amount * feePercent) / 100)         │
│     netAmount = amount - platformFee                          │
│  3. Generate reference: DON-{timestamp}-{random}             │
│  4. Insert to donations table (status: pending)              │
│  5. Call Lenco API                                            │
│  6. Return checkout URL                                       │
└──────────────────┬────────────────────────────────────────────┘
                   │
                   │ initializes
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                  Lenco Payment Gateway                        │
│  - Hosted payment page                                        │
│  - Mobile money integration                                   │
│  - Card processing                                            │
└──────────────────┬────────────────────────────────────────────┘
                   │
                   │ sends webhook
                   ▼
┌──────────────────────────────────────────────────────────────┐
│         Supabase Edge Function                                │
│    /functions/v1/lenco-payments-validator                     │
│                                                               │
│  1. Validate signature (x-lenco-signature)                   │
│  2. Parse webhook payload                                     │
│  3. Identify transaction type (DON- prefix)                  │
│  4. Lookup donation by lenco_reference                       │
│  5. Check idempotency (skip if completed)                    │
│  6. Update status: completed/failed                          │
│  7. Log to webhook_logs                                       │
└──────────────────┬────────────────────────────────────────────┘
                   │
                   │ updates
                   ▼
┌──────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                              │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │ donations table                               │           │
│  ├──────────────────────────────────────────────┤           │
│  │ id: uuid                                      │           │
│  │ donor_user_id: uuid (nullable)                │           │
│  │ donor_name: text (nullable)                   │           │
│  │ amount: numeric(18,2)                         │           │
│  │ platform_fee_amount: numeric(18,2)            │           │
│  │ net_amount: numeric(18,2)                     │           │
│  │ status: text (pending/completed/failed)       │           │
│  │ lenco_reference: text (unique)                │           │
│  │ message: text (nullable)                      │           │
│  │ created_at: timestamptz                       │           │
│  └──────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐    ┌──────────┐
│ Browser │    │ Frontend │    │ Backend  │    │ Lenco │    │ Database │
└────┬────┘    └────┬─────┘    └────┬─────┘    └───┬───┘    └────┬─────┘
     │              │                │               │             │
     │  Click       │                │               │             │
     │  Donate      │                │               │             │
     ├─────────────>│                │               │             │
     │              │                │               │             │
     │   Display    │                │               │             │
     │   Modal      │                │               │             │
     │<─────────────┤                │               │             │
     │              │                │               │             │
     │  Enter       │                │               │             │
     │  Amount      │                │               │             │
     ├─────────────>│                │               │             │
     │              │                │               │             │
     │   Show       │                │               │             │
     │   Breakdown  │                │               │             │
     │<─────────────┤                │               │             │
     │              │                │               │             │
     │  Submit      │                │               │             │
     ├─────────────>│                │               │             │
     │              │                │               │             │
     │              │ POST           │               │             │
     │              │ /create-       │               │             │
     │              │ donation       │               │             │
     │              ├───────────────>│               │             │
     │              │                │               │             │
     │              │                │  INSERT       │             │
     │              │                │  pending      │             │
     │              │                ├──────────────────────────>  │
     │              │                │               │             │
     │              │                │  OK           │             │
     │              │                │<──────────────────────────  │
     │              │                │               │             │
     │              │                │ POST          │             │
     │              │                │ /initialize   │             │
     │              │                ├──────────────>│             │
     │              │                │               │             │
     │              │                │ checkout_url  │             │
     │              │                │<──────────────┤             │
     │              │                │               │             │
     │              │ {checkoutUrl}  │               │             │
     │              │<───────────────┤               │             │
     │              │                │               │             │
     │  Redirect    │                │               │             │
     │<─────────────┤                │               │             │
     │              │                │               │             │
     ├──────────────────────────────────────────────>│             │
     │              │                │  Lenco Page   │             │
     │              │                │               │             │
     │  Complete    │                │               │             │
     │  Payment     │                │               │             │
     ├──────────────────────────────────────────────>│             │
     │              │                │               │             │
     │              │                │               │  Webhook    │
     │              │                │<──────────────┤             │
     │              │                │               │             │
     │              │                │  UPDATE       │             │
     │              │                │  completed    │             │
     │              │                ├──────────────────────────>  │
     │              │                │               │             │
     │              │                │  OK           │             │
     │              │                │<──────────────────────────  │
     │              │                │               │             │
     │              │                │  200 OK       │             │
     │              │                ├──────────────>│             │
     │              │                │               │             │
     │  Redirect    │                │               │             │
     │  Back        │                │               │             │
     │<──────────────────────────────────────────────┤             │
     │              │                │               │             │
```

## Fee Calculation Examples

```
┌─────────────────────────────────────────────────────────────────┐
│              Platform Fee Calculation Logic                      │
└─────────────────────────────────────────────────────────────────┘

Formula: platformFee = floor((amount × feePercentage) / 100)
         netAmount = amount - platformFee

Example 1: K100 donation with 5% fee
  amount = 100
  feePercentage = 5
  platformFee = floor((100 × 5) / 100) = floor(5.0) = 5
  netAmount = 100 - 5 = 95
  
  Display:
    Donation:      K100.00
    Platform fee:  K5.00 (5%)
    To SME:        K95.00
    Total:         K100.00

Example 2: K33 donation with 5% fee
  amount = 33
  feePercentage = 5
  platformFee = floor((33 × 5) / 100) = floor(1.65) = 1
  netAmount = 33 - 1 = 32
  
  Display:
    Donation:      K33.00
    Platform fee:  K1.00 (5%)
    To SME:        K32.00
    Total:         K33.00

Example 3: K250 donation with 10% fee
  amount = 250
  feePercentage = 10
  platformFee = floor((250 × 10) / 100) = floor(25.0) = 25
  netAmount = 250 - 25 = 225
  
  Display:
    Donation:      K250.00
    Platform fee:  K25.00 (10%)
    To SME:        K225.00
    Total:         K250.00
```

## Status State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                   Donation Status Lifecycle                      │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │  CREATE  │
                    │ DONATION │
                    └─────┬────┘
                          │
                          ▼
                    ┌──────────┐
                    │ PENDING  │ ◄───────────────┐
                    └─────┬────┘                 │
                          │                      │
                ┌─────────┴─────────┐           │
                │                   │           │
         ┌──────▼──────┐     ┌─────▼─────┐    │
         │  COMPLETED  │     │  FAILED   │    │
         └─────────────┘     └───────────┘    │
                │                   │          │
                │                   │          │
                ▼                   ▼          │
         ┌─────────────┐     ┌───────────┐    │
         │   Final     │     │  Retry or │────┘
         │   State     │     │  Cancel   │
         └─────────────┘     └───────────┘

States:
  • PENDING:   Initial state after donation creation
  • COMPLETED: Payment successful (webhook confirmed)
  • FAILED:    Payment failed/declined
  • CANCELLED: User cancelled (future enhancement)

Transitions:
  1. Create → PENDING
  2. PENDING → COMPLETED (webhook: payment.success)
  3. PENDING → FAILED (webhook: payment.failed)
  4. FAILED → PENDING (user retry - future enhancement)
```

## Security Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Webhook Security Flow                         │
└─────────────────────────────────────────────────────────────────┘

Lenco sends webhook:
  POST /functions/v1/lenco-payments-validator
  Headers:
    x-lenco-signature: <shared-secret>
  Body:
    {
      "event": "payment.completed",
      "data": {
        "reference": "DON-1699564823456-A3B7C9",
        "status": "success",
        ...
      }
    }

Validator processing:
  ┌─────────────────────────────────────┐
  │ 1. Extract x-lenco-signature        │
  │    from headers                     │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 2. Load expected secret from env    │
  │    LENCO_WEBHOOK_SECRET             │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 3. Timing-safe comparison           │
  │    timingSafeEqual(provided,        │
  │                    expected)        │
  └────────────┬────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
  ┌────────┐      ┌────────┐
  │ VALID  │      │INVALID │
  └───┬────┘      └───┬────┘
      │               │
      │               ▼
      │          ┌──────────┐
      │          │ Return   │
      │          │ 401      │
      │          └──────────┘
      │
      ▼
  ┌─────────────────────────────────────┐
  │ 4. Parse webhook payload            │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 5. Identify transaction type        │
  │    (DON- prefix = donation)         │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 6. Lookup donation by reference     │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 7. Idempotency check                │
  │    (skip if already completed)      │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 8. Update donation status           │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 9. Log to webhook_logs              │
  └────────────┬────────────────────────┘
               │
               ▼
  ┌─────────────────────────────────────┐
  │ 10. Return 200 OK                   │
  └─────────────────────────────────────┘
```

## Key Design Principles

1. **Transparency**: Real-time fee breakdown visible before payment
2. **Security**: Webhook signature validation, timing-safe comparisons
3. **Idempotency**: Prevents duplicate processing of webhooks
4. **User Choice**: Anonymous donations, optional messaging
5. **Validation**: Frontend and backend validation for consistency
6. **Auditability**: Comprehensive logging of all transactions
7. **Scalability**: Indexed database for performance
8. **Maintainability**: Clean separation of concerns
