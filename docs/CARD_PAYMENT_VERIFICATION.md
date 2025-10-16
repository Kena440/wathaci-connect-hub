# Card Payment Fields - Manual Verification Guide

## Overview

This document describes the card payment fields that have been added to the ProfileForm component to fix the issue where card details were being submitted as undefined.

## Changes Made

### 1. Added Card Input Fields

The ProfileForm now includes dedicated input fields for card payment details when the user selects card as their payment method:

- **Card Number**: Input field with 19 character limit and placeholder "1234 5678 9012 3456"
- **Card Expiry**: Input field with 5 character limit (MM/YY format) and placeholder "MM/YY"

### 2. Form State Initialization

The form now initializes with card fields in the state:

```typescript
const [formData, setFormData] = useState<Record<string, any>>({
  payment_method: 'phone',
  use_same_phone: true,
  qualifications: [],
  gaps_identified: [],
  phone: '',
  payment_phone: '',
  card_number: '',      // NEW
  card_expiry: '',      // NEW
  profile_image_url: null,
  linkedin_url: '',
  ...initialData
});
```

### 3. Conditional Rendering

The card fields are only displayed when:
1. User unchecks "Use the same phone number for subscription payments"
2. User selects "Credit/Debit Card" as payment method

## Manual Verification Steps

Follow these steps to verify the card payment fields are working correctly:

### Step 1: Start the Application

```bash
npm run dev
```

### Step 2: Navigate to Profile Setup

1. Sign up or sign in to the application
2. Navigate to the Profile Setup page
3. Select any account type (e.g., "Professional")
4. Click "Continue"

### Step 3: Verify Default State

✓ **Expected Behavior:**
- The "Use the same phone number for subscription payments" checkbox should be checked
- Payment method radio buttons should NOT be visible
- Card fields should NOT be visible

### Step 4: Uncheck "Use Same Phone"

1. Uncheck the "Use the same phone number for subscription payments" checkbox

✓ **Expected Behavior:**
- Two radio buttons should appear:
  - "Mobile Money"
  - "Credit/Debit Card"
- "Mobile Money" should be selected by default
- "Payment Phone Number" input field should be visible

### Step 5: Select Card Payment Method

1. Click the "Credit/Debit Card" radio button

✓ **Expected Behavior:**
- "Payment Phone Number" field should disappear
- Two new fields should appear:
  - **Card Number**: with placeholder "1234 5678 9012 3456"
  - **Card Expiry (MM/YY)**: with placeholder "MM/YY"
- A security message should be displayed: "Your card details will be securely stored for subscription payments"

### Step 6: Enter Card Details

1. Enter a test card number: `4532123456789012`
2. Enter a test expiry date: `12/25`

✓ **Expected Behavior:**
- Both fields should accept the input
- Card number should be limited to 19 characters
- Card expiry should be limited to 5 characters

### Step 7: Submit Form

1. Fill in all other required fields (First Name, Last Name, Phone, etc.)
2. Click "Complete Profile"

✓ **Expected Behavior:**
- Form submits successfully
- In browser DevTools Network tab, check the request payload to Supabase
- The payload should include:
  ```json
  {
    "payment_method": "card",
    "card_details": {
      "number": "4532123456789012",
      "expiry": "12/25"
    }
  }
  ```
- **No longer undefined!**

### Step 8: Verify Database Storage

1. Go to Supabase Dashboard
2. Navigate to Table Editor → profiles
3. Find the newly created profile
4. Check the `card_details` column

✓ **Expected Behavior:**
- The `card_details` field should contain:
  ```json
  {
    "number": "4532123456789012",
    "expiry": "12/25"
  }
  ```
- The `payment_method` field should be `"card"`

### Step 9: Test Switching Between Payment Methods

1. Go back to the Profile Setup page (or refresh)
2. Uncheck "Use the same phone number"
3. Select "Mobile Money" → verify phone field appears, card fields disappear
4. Select "Credit/Debit Card" → verify card fields appear, phone field disappears
5. Re-check "Use the same phone number" → verify all payment method options disappear

✓ **Expected Behavior:**
- Switching between payment methods should work smoothly
- No fields should show undefined or null values
- No console errors should appear

## Common Issues and Solutions

### Issue 1: Card Fields Not Appearing

**Symptoms:** Card fields don't show up when selecting "Credit/Debit Card"

**Solution:**
1. Check browser console for JavaScript errors
2. Verify the ProfileForm.tsx file has been updated correctly
3. Clear browser cache and refresh
4. Restart the development server

### Issue 2: Card Details Still Undefined in Submission

**Symptoms:** Card details are undefined when form is submitted

**Solution:**
1. Check that card fields are properly named: `card_number` and `card_expiry`
2. Verify form state includes these fields in initialization
3. Check ProfileSetup.tsx correctly reads these fields from formData
4. Inspect the network request to see actual payload being sent

### Issue 3: Validation Errors from Supabase

**Symptoms:** Supabase returns validation error when submitting card details

**Solution:**
1. Verify the `profiles` table has a `card_details` column of type JSONB
2. Check that the column allows null values (for users not using card payment)
3. Verify the structure matches what's being sent

## Database Schema Requirements

For card payment details to be stored properly, ensure your Supabase `profiles` table includes:

```sql
-- Add card_details column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS card_details JSONB;

-- Make it optional (nullable)
ALTER TABLE profiles 
ALTER COLUMN card_details DROP NOT NULL;
```

## Security Considerations

⚠️ **IMPORTANT SECURITY NOTES:**

1. **PCI Compliance**: This implementation stores card details directly in the database. For production use, consider:
   - Using tokenization services (e.g., Stripe, Lenco card tokenization)
   - Storing only card tokens, not actual card numbers
   - Implementing proper encryption at rest
   - Following PCI DSS compliance requirements

2. **Card Number Display**: For production, consider:
   - Masking card numbers (showing only last 4 digits)
   - Not storing CVV/CVC codes
   - Implementing proper access controls

3. **Data Handling**: 
   - Never log card details to console
   - Use HTTPS for all communications
   - Implement proper database-level encryption

## Future Enhancements

Potential improvements for the card payment implementation:

1. **Card Validation**:
   - Add Luhn algorithm validation for card numbers
   - Validate expiry date is not in the past
   - Format card number with spaces (1234 5678 9012 3456)

2. **Card Type Detection**:
   - Detect card type (Visa, Mastercard, etc.) from card number
   - Display appropriate card logo
   - Validate card number length based on type

3. **Security Enhancements**:
   - Integrate with Lenco card tokenization API
   - Store only encrypted tokens
   - Implement card update/removal functionality

4. **User Experience**:
   - Add card expiry date picker
   - Auto-format card number input with spaces
   - Add CVV field (store securely or don't store at all)
   - Show masked card number for editing

## Conclusion

The card payment fields have been successfully added to the ProfileForm. Users can now enter and submit card details without encountering undefined value errors. The form properly handles both mobile money and card payment methods with appropriate field visibility and validation.

---

**Document Version:** 1.0.0  
**Last Updated:** October 2024  
**Related Issues:** Profile workflow gaps - card payment details undefined
