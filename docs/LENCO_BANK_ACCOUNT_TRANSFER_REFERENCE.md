# Lenco Transfer: Bank Account Endpoint

## Overview

Initiate payouts from WATHACI CONNECT to customer bank accounts via the Lenco Access API. This endpoint debits one of your funded
Lenco accounts and sends the funds to a preconfigured recipient. Make sure live keys are rotated and balances are reconciled
before triggering production transfers.

## Endpoint

- **Method:** `POST`
- **URL:** `https://api.lenco.co/access/v2/transfers/bank-account`
- **Purpose:** Initiate a bank transfer from a Lenco business account

## Required Headers

| Header | Value | Notes |
| ------ | ----- | ----- |
| `Authorization` | `Bearer <LENCO_SECRET_KEY>` | Use the secret key stored in Supabase secrets or your deployment environment. |
| `Content-Type` | `application/json` | Send a JSON-encoded body. |

## Request Body

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `accountId` | string | ✅ | 36-character UUID of the Lenco account to debit. Retrieve via the Accounts API. |
| `amount` | number | ✅ | Transfer amount. Must not exceed your available balance after fees. |
| `reference` | string | ✅ | Unique client reference using only letters, numbers, hyphen, period, or underscore. |
| `narration` | string | Optional | Statement description shown to the beneficiary. |
| `transferRecipientId` | string | Optional | UUID returned from `POST /transfer-recipients`. Preferred for repeat beneficiaries. |
| `accountNumber` | string | Optional | Destination account number. Required when `transferRecipientId` is omitted. |
| `bankId` | string | Optional | Lenco bank identifier. Pair with `accountNumber` if you are not using a recipient record. |
| `country` | string | Optional | ISO country code (e.g., `ng`, `zm`). Defaults to the business' home country. |

> ✅ **Recommended:** Create and reuse transfer recipients. Fallback to raw account details only when recipient creation is not
> feasible.

### Example Request Using Recipient ID

```http
POST /access/v2/transfers/bank-account HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_example_secret_from_dashboard
Content-Type: application/json

{
  "accountId": "3f7a2b1c-8d9e-4f01-a3c5-9a4b6c7d8e9f",
  "amount": 50000,
  "reference": "WATHACI-INV-23001",
  "narration": "Vendor payout",
  "transferRecipientId": "1a2b3c4d-5e6f-7890-1234-56789abcdef0"
}
```

### Example Request Using Raw Bank Details

```http
POST /access/v2/transfers/bank-account HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_example_secret_from_dashboard
Content-Type: application/json

{
  "accountId": "3f7a2b1c-8d9e-4f01-a3c5-9a4b6c7d8e9f",
  "amount": 50000,
  "reference": "WATHACI-INV-23002",
  "narration": "Vendor payout",
  "accountNumber": "0123456789",
  "bankId": "bank_12345",
  "country": "ng"
}
```

## Successful Response

```json
{
  "status": true,
  "message": "Transfer initiated successfully",
  "data": {
    "id": "trf_01h9exampleabcd",
    "amount": "50000.00",
    "fee": "25.00",
    "currency": "NGN",
    "narration": "Vendor payout",
    "initiatedAt": "2025-03-11T10:45:12.000Z",
    "completedAt": null,
    "accountId": "3f7a2b1c-8d9e-4f01-a3c5-9a4b6c7d8e9f",
    "creditAccount": {
      "type": "bank-account",
      "accountName": "Ada Lovelace",
      "accountNumber": "0123456789",
      "bank": {
        "id": "bank_12345",
        "name": "Example Bank",
        "country": "NG"
      }
    },
    "status": "pending",
    "reasonForFailure": null,
    "reference": "WATHACI-INV-23001",
    "lencoReference": "LNCO-20250311-ABC123",
    "extraData": {
      "nipSessionId": null
    },
    "source": "api"
  }
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `status` | boolean | Indicates whether the initiation succeeded. `true` still implies the transfer may be pending settlement. |
| `data.id` | string | Lenco transfer identifier. Store for reconciliation and webhook correlation. |
| `data.fee` | string | Transfer fee charged, formatted as a decimal string. |
| `data.status` | string | Transfer lifecycle status (`pending`, `successful`, `failed`). |
| `data.reasonForFailure` | string \| null | Explanation when a transfer fails. Surfaces bank or NIP errors. |
| `data.lencoReference` | string | Lenco-generated reference useful when working with support. |
| `data.extraData.nipSessionId` | string \| null | Nigeria Inter-Bank Payment session ID when applicable. |

## Error Responses

Expect HTTP `400 Bad Request` for validation errors (duplicate reference, unsupported bank, insufficient funds). Lenco returns a
JSON payload containing a descriptive `message` to aid troubleshooting.

```json
{
  "status": false,
  "message": "Reference already used"
}
```

## Operational Checklist

- [ ] Register recipients in advance using [Lenco Transfer Recipient: Bank Account Endpoint](./LENCO_TRANSFER_RECIPIENTS_REFERENCE.md).
- [ ] Monitor webhook events documented in [Webhook Quick Reference](./WEBHOOK_QUICK_REFERENCE.md) to track transfer status updates.
- [ ] Reconcile successful transfers nightly using the [Lenco Accounts API](./LENCO_ACCOUNTS_API_REFERENCE.md) balances.
- [ ] Retry transient failures with exponential backoff, but avoid reusing the same `reference` once Lenco processes the request.
- [ ] Escalate persistent `failed` statuses with the `lencoReference` and `nipSessionId` (if provided) when contacting support.

---

**Last Updated:** 2025-01-20
**Version:** 1.0
