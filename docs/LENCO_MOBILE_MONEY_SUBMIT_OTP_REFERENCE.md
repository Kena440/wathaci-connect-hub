# Lenco Mobile Money Submit OTP API Reference

## Overview

Use the **Submit OTP endpoint** to confirm a mobile money collection request
after the customer receives the SIM toolkit prompt. This step is required when
the initial collection request returns an `otp-required` status. Once the OTP is
validated, the collection proceeds to completion or failure depending on the
operator response.

> **Base URL:** `https://api.lenco.co/access/v2`

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/collections/mobile-money/submit-otp` | Confirms a pending mobile money collection by validating the customer's one-time password (OTP). |

### Authentication

Include your Lenco **secret key** in the `Authorization` header as a Bearer
token whenever you call this endpoint from secure server-side code.

```http
POST /access/v2/collections/mobile-money/submit-otp HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_xxxxxxxxxxxxxxxxx
Content-Type: application/json
Accept: application/json
```

> Do not call this endpoint directly from client-side applications. Expose a
> secure server or Supabase function that forwards the request using your secret
> key.

## Request Body

Send the following JSON payload:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reference` | string | Yes | Unique reference you supplied when initiating the mobile money collection. |
| `otp` | string | Yes | One-time password entered by the customer. Use `000000` in the sandbox. |

### Example Request

```json
{
  "reference": "col_01j4hmr7qf3602w0kvt9s5zvkf",
  "otp": "123456"
}
```

## Successful Response

**Status:** `200 OK`

```json
{
  "status": true,
  "message": "OTP submitted successfully",
  "data": {
    "id": "col_01j4hmr7qf3602w0kvt9s5zvkf",
    "initiatedAt": "2025-03-14T09:20:15.000Z",
    "completedAt": null,
    "amount": "150.00",
    "fee": "2.50",
    "bearer": "customer",
    "currency": "ZMW",
    "reference": "merchant_ref_123",
    "lencoReference": "lenco_ref_456",
    "type": "mobile-money",
    "status": "pending",
    "source": "api",
    "reasonForFailure": null,
    "settlementStatus": "pending",
    "settlement": null,
    "mobileMoneyDetails": {
      "country": "ZMB",
      "phone": "+260971234567",
      "operator": "MTN",
      "accountName": "John Banda",
      "operatorTransactionId": null
    },
    "bankAccountDetails": null,
    "cardDetails": null
  }
}
```

### Field Reference

#### `data`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Identifier for the collection request. |
| `initiatedAt` | ISO 8601 datetime | Timestamp of when the collection was initiated. |
| `completedAt` | ISO 8601 datetime \| null | Timestamp of completion if available. |
| `amount` | string | Amount collected in the transaction currency as a string. |
| `fee` | string \| null | Fee charged for the collection if applicable. |
| `bearer` | `merchant`\|`customer` | Who bears the transaction fee. |
| `currency` | string | ISO 4217 currency code. |
| `reference` | string | Merchant-provided reference for idempotency and reconciliation. |
| `lencoReference` | string | Lenco-issued reference for support investigations. |
| `type` | string | Always `mobile-money` for this endpoint. |
| `status` | string | Current state (`pending`, `successful`, `failed`, `otp-required`, or `pay-offline`). |
| `source` | string | Request origin (`api`, `dashboard`, etc.). |
| `reasonForFailure` | string \| null | Explanation provided when `status` is `failed`. |
| `settlementStatus` | string \| null | Settlement state for the collection. |
| `settlement` | object \| null | Additional settlement information when applicable. |
| `mobileMoneyDetails` | object \| null | Information about the customer's mobile wallet. |
| `mobileMoneyDetails.country` | string | ISO 3166-1 alpha-3 country code for the wallet. |
| `mobileMoneyDetails.phone` | string | Phone number associated with the mobile wallet. |
| `mobileMoneyDetails.operator` | string | Operator handling the transaction. |
| `mobileMoneyDetails.accountName` | string \| null | Name on the mobile money account. |
| `mobileMoneyDetails.operatorTransactionId` | string \| null | Transaction identifier returned by the operator. |
| `bankAccountDetails` | null | Always `null` for mobile money collections. |
| `cardDetails` | null | Always `null` for mobile money collections. |

## Error Handling

When the OTP is invalid or the collection reference is unknown, the API
returns a 4xx error with the same response envelope. Inspect the `message`
field to surface a user-friendly error in your application.

```json
{
  "status": false,
  "message": "Invalid OTP provided",
  "data": null
}
```

## Sandbox Testing

- Use the OTP value `000000` to simulate a successful confirmation in the
  sandbox environment.
- Trigger failure scenarios by sending any other six-digit code to verify your
  error-handling logic.
- Combine this endpoint with the initial mobile money collection request to
  create end-to-end automated tests.

## Related Documentation

- [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md)
- [Payment Sandbox Test Data](./PAYMENT_SANDBOX_TEST_DATA.md)
- [Lenco API Authentication Reference](./LENCO_API_AUTHENTICATION_REFERENCE.md)

---

**Last Updated:** 2025-03-18
**Version:** 1.0
