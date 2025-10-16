# Lenco Payment Integration Guide

## Overview

This documentation provides comprehensive guidance for integrating and configuring Lenco payments in the WATHACI CONNECT platform.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Configuration](#environment-configuration)
3. [Deployment](#deployment)
4. [Payment Flow](#payment-flow)
5. [API Reference](#api-reference)
6. [Security Guidelines](#security-guidelines)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Features](#advanced-features)

## Quick Start

### Prerequisites

- Node.js 18+ 
- Supabase account and project
- Lenco payment gateway account
- Valid SSL certificate for production

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables (see Environment Configuration section)
```

### Basic Payment Setup

```typescript
import { lencoPaymentService } from '@/lib/services/lenco-payment-service';

// Process mobile money payment
const paymentResponse = await lencoPaymentService.processMobileMoneyPayment({
  amount: 100,
  phone: '0978123456',
  provider: 'mtn',
  email: 'user@example.com',
  name: 'John Doe',
  description: 'Service payment'
});
```

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_KEY="your-anon-key"

# Lenco Payment Gateway Configuration
VITE_LENCO_PUBLIC_KEY="pub-dea560c94d379a23e7b85a265d7bb9acbd585481e6e1393e"
LENCO_SECRET_KEY="843a2b242591e9a58370da44e11bb2575b20780f27c8efe39a6ed24ecba0b668"
LENCO_WEBHOOK_SECRET="bc09f682f3bbbf3d851b125b9914984c272471e16cd2a4f14f9406706f7c98cd293bf0d"
VITE_LENCO_API_URL="https://api.lenco.co/access/v2"

# Payment Configuration
VITE_PAYMENT_CURRENCY="ZMK"
VITE_PAYMENT_COUNTRY="ZM"
VITE_PLATFORM_FEE_PERCENTAGE="2"
VITE_MIN_PAYMENT_AMOUNT="5"
VITE_MAX_PAYMENT_AMOUNT="1000000"

# Environment
VITE_APP_ENV="development"
VITE_APP_NAME="WATHACI CONNECT"
```

### Development vs Production

**Development Settings:**
- Use test API keys (prefixed with `pk_test_` and `sk_test_`)
- Lower transaction limits
- Verbose logging enabled
- Mock payment responses for testing

**Production Settings:**
- Use live API keys (prefixed with `pk_live_` and `sk_live_`)
- Production transaction limits
- Error logging only
- Real payment processing

**⚠️ IMPORTANT: For complete production setup instructions, see [PRODUCTION_PAYMENT_SETUP.md](./PRODUCTION_PAYMENT_SETUP.md)**

### Lenco API Key Setup

1. Log into your Lenco dashboard
2. Navigate to API Keys section
3. Generate new keys for your environment
4. Copy the public and secret keys
5. Set up webhook endpoint URL
6. Configure webhook secret

## Deployment

### Edge Function Deployment

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```
2. **Authenticate**
   ```bash
   supabase login
   ```
3. **Deploy the payment webhook function**
   ```bash
   supabase functions deploy lenco-webhook
   ```
4. **Set function secrets**
   ```bash
   supabase secrets set \
     LENCO_SECRET_KEY="843a2b242591e9a58370da44e11bb2575b20780f27c8efe39a6ed24ecba0b668" \
     LENCO_WEBHOOK_SECRET="bc09f682f3bbbf3d851b125b9914984c272471e16cd2a4f14f9406706f7c98cd293bf0d"
   ```
5. **Verify deployment** – note the generated URL:
   `https://<project-ref>.functions.supabase.co/lenco-webhook`

### Webhook URL Configuration

1. Copy the edge function URL from the deployment step.
2. In the Lenco dashboard, open **Developer > Webhooks**.
3. Add the function URL as your webhook endpoint.
4. Use the same `LENCO_WEBHOOK_SECRET` value to validate incoming requests.

### Environment Variables

1. Duplicate the sample file:
   ```bash
   cp .env.example .env
   ```
2. Fill in all required variables, including Supabase and Lenco keys.
3. For deployed edge functions, set variables using `supabase secrets set`.
4. Redeploy the function whenever environment variables change.

## Payment Flow

### 1. Payment Initialization

```typescript
// Initialize payment service
const paymentService = new LencoPaymentService();

// Check configuration
if (!paymentService.isConfigured()) {
  throw new Error('Payment service not configured');
}

// Create payment request
const paymentRequest = {
  amount: 100,
  email: 'user@example.com', // Optional - can be omitted
  name: 'John Doe',
  description: 'Service payment'
};
```

### 2. Mobile Money Flow

```typescript
// Process mobile money payment
const mobileMoneyPayment = await lencoPaymentService.processMobileMoneyPayment({
  ...paymentRequest,
  phone: '0978123456',
  provider: 'mtn' // 'mtn', 'airtel', 'zamtel'
});

if (mobileMoneyPayment.success) {
  // Payment initiated successfully
  // User will receive mobile money prompt
} else {
  // Handle payment error
  console.error(mobileMoneyPayment.error);
}
```

### 3. Card Payment Flow

```typescript
// Process card payment
const cardPayment = await lencoPaymentService.processCardPayment({
  ...paymentRequest,
  phone: '0978123456' // Optional
});

if (cardPayment.success) {
  // Redirect user to payment URL
  window.location.href = cardPayment.data.payment_url;
} else {
  // Handle payment error
  console.error(cardPayment.error);
}
```

### 4. Payment Verification

```typescript
// Verify payment status
const paymentStatus = await lencoPaymentService.verifyPayment(reference);

switch (paymentStatus.status) {
  case 'success':
    // Payment completed successfully
    break;
  case 'pending':
    // Payment still processing
    break;
  case 'failed':
    // Payment failed
    break;
  case 'cancelled':
    // Payment cancelled by user
    break;
}
```

## API Reference

### LencoPaymentService

#### Methods

##### `processMobileMoneyPayment(request)`

Process a mobile money payment.

**Parameters:**
- `amount` (number): Payment amount in Kwacha
- `phone` (string): Zambian mobile number (096/076/097/077/095xxxxxxx)
- `provider` (string): 'mtn', 'airtel', or 'zamtel'
- `email` (string, optional): User email address
- `name` (string): User full name
- `description` (string): Payment description

**Returns:** `Promise<LencoPaymentResponse>`

##### `processCardPayment(request)`

Process a card payment.

**Parameters:**
- `amount` (number): Payment amount in Kwacha
- `email` (string, optional): User email address
- `name` (string): User full name
- `description` (string): Payment description
- `phone` (string, optional): Phone number

**Returns:** `Promise<LencoPaymentResponse>`

##### `verifyPayment(reference)`

Verify payment status.

**Parameters:**
- `reference` (string): Payment reference

**Returns:** `Promise<PaymentStatus>`

##### `calculatePaymentTotal(amount)`

Calculate payment breakdown including fees.

**Parameters:**
- `amount` (number): Base amount

**Returns:** Payment breakdown object

### SubscriptionService

#### Methods

##### `subscribeToPlan(userId, planId, paymentMethod, paymentDetails)`

Subscribe user to a plan with payment processing.

**Parameters:**
- `userId` (string): User ID
- `planId` (string): Subscription plan ID
- `paymentMethod` (string): 'mobile_money' or 'card'
- `paymentDetails` (object): Payment details including email, name, phone, provider

**Returns:** `Promise<SubscriptionResult>`

##### `verifySubscriptionPayment(paymentReference)`

Verify and activate subscription payment.

**Parameters:**
- `paymentReference` (string): Payment reference

**Returns:** `Promise<VerificationResult>`

## Security Guidelines

### 1. API Key Security

- Never expose secret keys in client-side code
- Use environment variables for all credentials
- Rotate API keys regularly
- Monitor API key usage

### 2. Payment Validation

```typescript
// Always validate payment amounts
if (amount < 5 || amount > 1000000) {
  throw new Error('Invalid payment amount');
}

// Validate phone numbers
if (!validatePhoneNumber(phone, 'ZM')) {
  throw new Error('Invalid phone number format');
}

// Validate email addresses
if (!isValidEmail(email)) {
  throw new Error('Invalid email address');
}
```

### 3. Data Sanitization

```typescript
// Sanitize payment data before storage
const sanitizedData = paymentSecurityService.sanitizePaymentData(paymentData);
```

### 4. Rate Limiting

- Implement rate limiting for payment endpoints
- Monitor for suspicious payment patterns
- Set daily/monthly transaction limits

## Testing

### 1. Payment Test Suite

```typescript
import { paymentTestSuite } from '@/lib/testing/payment-test-suite';

// Run all tests
const results = await paymentTestSuite.runComprehensiveTests();

// Run specific category
const validationResults = await paymentTestSuite.runTestCategory('validation');
```

### 2. Manual Testing

Use the PaymentTestComponent for manual testing:

```typescript
import { PaymentTestComponent } from '@/components/PaymentTestComponent';

// Add to your test page
<PaymentTestComponent />
```

### 3. Test Data

**Valid Test Phone Numbers:**
- MTN: 0978123456
- Airtel: 0978654321
- Zamtel: 0978111222

**Test Amounts:**
- Minimum: K5.00
- Maximum: K1,000,000.00
- Recommended test amounts: K50, K100, K500

## Troubleshooting

### Common Issues

#### 1. Payment Initialization Fails

**Symptoms:** Payment service returns error on initialization

**Solutions:**
- Check API key configuration
- Verify network connectivity
- Validate request parameters
- Check Lenco service status

#### 2. Mobile Money Timeout

**Symptoms:** Mobile money payments timeout without completion

**Solutions:**
- Increase timeout duration
- Implement retry mechanism
- Check mobile network connectivity
- Verify provider availability

#### 3. Card Payment Redirect Issues

**Symptoms:** Card payment redirects fail or don't complete

**Solutions:**
- Verify callback URL configuration
- Check HTTPS/SSL setup
- Validate payment URL format
- Test in different browsers

#### 4. Webhook Not Received

**Symptoms:** Payment status not updated via webhooks

**Solutions:**
- Verify webhook URL configuration
- Check webhook endpoint accessibility
- Validate webhook signature
- Monitor webhook logs

#### 5. Invalid API Keys

**Symptoms:** Requests return `API_KEY_INVALID` or `401` errors

**Solutions:**
- Confirm keys match the target environment (test vs live)
- Regenerate keys in the Lenco dashboard if compromised
- Ensure secrets are correctly set in `.env` and Supabase function secrets

#### 6. Payment Stuck in Pending

**Symptoms:** Payment remains in `pending` status for an extended time

**Solutions:**
- Verify that the webhook endpoint is reachable
- Check provider status in the Lenco dashboard
- Retry verification using the payment reference

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_AMOUNT` | Payment amount is invalid | Check min/max limits |
| `INVALID_PHONE` | Phone number format invalid | Use valid Zambian mobile format (e.g., 0961234567) |
| `PROVIDER_UNAVAILABLE` | Mobile money provider unavailable | Try different provider |
| `INSUFFICIENT_FUNDS` | User has insufficient funds | Ask user to add funds |
| `NETWORK_ERROR` | Network connectivity issue | Retry request |
| `API_KEY_INVALID` | Invalid API credentials | Check API key configuration |

### Debug Mode

Enable debug mode for detailed logging:

```typescript
// Set environment variable
VITE_APP_ENV=development

// Enable verbose logging
const paymentService = new LencoPaymentService();
paymentService.enableDebugMode();
```

## Advanced Features

### 1. Real-time Payment Tracking

```typescript
import { usePaymentStatus } from '@/hooks/use-payment-status';

const PaymentComponent = () => {
  const { paymentStatus, startTracking, stopTracking } = usePaymentStatus();
  
  // Start tracking payment
  startTracking(paymentReference);
  
  // Payment status updates automatically
  useEffect(() => {
    if (paymentStatus?.status === 'completed') {
      // Handle payment success
    }
  }, [paymentStatus]);
};
```

### 2. Payment Analytics

```typescript
import { paymentAnalyticsService } from '@/lib/services/payment-analytics-service';

// Get payment analytics
const analytics = await paymentAnalyticsService.getPaymentAnalytics(
  startDate,
  endDate,
  userId
);

// Export payment data
const csvData = await paymentAnalyticsService.exportPaymentData(
  startDate,
  endDate,
  userId,
  'csv'
);
```

### 3. Security Monitoring

```typescript
import { paymentSecurityService } from '@/lib/services/payment-security-service';

// Perform security checks
const securityChecks = await paymentSecurityService.performSecurityChecks(
  userId,
  amount,
  paymentMethod,
  metadata
);

// Generate compliance report
const report = paymentSecurityService.generateComplianceReport(securityChecks);
```

### 4. Subscription Management

```typescript
import { subscriptionService } from '@/lib/services/subscription-service';

// Subscribe to plan
const subscription = await subscriptionService.subscribeToPlan(
  userId,
  planId,
  paymentMethod,
  paymentDetails
);

// Get subscription analytics
const analytics = await subscriptionService.getSubscriptionAnalytics(userId);
```

## Support

For technical support and questions:

- Email: support@wathaci.org
- Documentation: https://docs.wathaci.org
- GitHub Issues: https://github.com/Kena440/WATHACI-CONNECT.-V1/issues

## License

This project is licensed under the MIT License. See LICENSE file for details.