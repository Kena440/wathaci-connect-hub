# Lenco Transfer Recipient: Bank Account Endpoint

## Overview

Use this endpoint to register a recipient's bank account on Lenco before initiating payouts from WATHACI CONNECT. Creating the recipient returns a persistent identifier that can be reused for multiple transfer requests. The endpoint requires the secret key configured in your environment variables (`LENCO_SECRET_KEY`).

## Endpoint

- **Method:** `POST`
- **URL:** `https://api.lenco.co/access/v2/transfer-recipients/bank-account`
- **Purpose:** Create a transfer recipient backed by a bank account

## Required Headers

| Header | Value | Notes |
| ------ | ----- | ----- |
| `Authorization` | `Bearer <LENCO_SECRET_KEY>` | Use the secret key retrieved from the Lenco dashboard and stored in Supabase secrets or your deployment environment. |
| `Content-Type` | `application/json` | Ensure the request body is valid JSON. |

## Request Body

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `accountNumber` | string | ✅ | Destination bank account number. Must match the account format expected by the selected bank. |
| `bankId` | string | ✅ | Identifier for the target bank. Retrieve the correct ID from the bank directory exposed by Lenco before creating the recipient. |
| `country` | string | Optional | ISO country code (e.g., `NG`, `GH`, `KE`). Defaults to the business' home country when omitted. |

### Example Request

```http
POST /access/v2/transfer-recipients/bank-account HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_example_secret_from_dashboard
Content-Type: application/json

{
  "accountNumber": "0123456789",
  "bankId": "bank_12345",
  "country": "NG"
}
```

## Successful Response

```
Status: 200 OK
Content-Type: application/json
```

```json
{
  "status": true,
  "message": "Transfer recipient created successfully",
  "data": {
    "id": "trcp_01h8xyzab12cd34",
    "currency": "NGN",
    "type": "bank_account",
    "country": "NG",
    "details": {
      "type": "bank-account",
      "accountName": "Ada Lovelace",
      "accountNumber": "0123456789",
      "bank": {
        "id": "bank_12345",
        "name": "Example Bank",
        "country": "NG"
      }
    }
  }
}
```

> **Note:** `data.type` reflects the recipient category (usually `bank_account` for bank destinations). Persist the returned `data.id` and reuse it when initiating transfers.

## Error Responses

| Status | Description |
| ------ | ----------- |
| `400 Bad Request` | Validation failure, such as an invalid account number, unknown `bankId`, or missing required fields. The response body contains an error message detailing the problem. |

### Example Error

```json
{
  "status": false,
  "message": "Invalid account number supplied"
}
```

## Operational Checklist

- [ ] Confirm you have rotated to live keys following the [Lenco Keys Rotation Guide](./LENCO_KEYS_ROTATION_GUIDE.md) before registering production recipients.
- [ ] Verify the `bankId` against the latest bank directory retrieved from Lenco's API or dashboard export.
- [ ] Store the recipient `id` securely; transfers reference this identifier instead of raw account numbers.
- [ ] Audit failed creations in Supabase logs to cross-check with the Lenco dashboard when troubleshooting customer reports.
