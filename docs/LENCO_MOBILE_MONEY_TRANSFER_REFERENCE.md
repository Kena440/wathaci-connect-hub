# Lenco Transfer: Mobile Money Endpoint

## Overview

Use this endpoint to initiate payouts from WATHACI CONNECT to supported mobile money wallets. The Lenco Access API currently
supports Airtel, MTN, and Zamtel wallets in Zambia, and Airtel or TNM wallets in Malawi. Provide either a previously created
transfer recipient identifier or the beneficiary's phone and operator details in the request. All requests must be authorized
with your Lenco secret key (`LENCO_SECRET_KEY`).

## Endpoint

- **Method:** `POST`
- **URL:** `https://api.lenco.co/access/v2/transfers/mobile-money`
- **Purpose:** Initiate a mobile money transfer to a beneficiary wallet

## Required Headers

| Header | Value | Notes |
| ------ | ----- | ----- |
| `Authorization` | `Bearer <LENCO_SECRET_KEY>` | Use the secret key stored in your secure environment (e.g., Supabase secrets). |
| `Content-Type` | `application/json` | JSON payload encoded in UTF-8. |

## Request Body

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `accountId` | string | ✅ | Your 36-character Lenco account UUID that will be debited. |
| `amount` | number | ✅ | Amount to transfer. Provide the value in the account's currency (e.g., ZMW). |
| `narration` | string | Optional | Optional description shown on Lenco and recipient statements. |
| `reference` | string | ✅ | Unique client reference. Only letters, numbers, `-`, `_`, and `.` are accepted. |
| `transferRecipientId` | string | Optional | UUID of an existing transfer recipient. Supply this to avoid sending phone/operator details again. |
| `phone` | string | Conditional | Required if `transferRecipientId` is omitted. Provide the MSISDN in international format (e.g., `+260961234567`). |
| `operator` | string | Conditional | Required if `transferRecipientId` is omitted. Supported values: `airtel`, `mtn`, `zamtel` (Zambia) or `airtel`, `tnm` (Malawi). |
| `country` | string | Optional | ISO country code (`zm` or `mw`). Defaults to your business' configured country when omitted. |

> **Important:** Either `transferRecipientId` or both `phone` and `operator` must be present. Validation fails if neither option
> is supplied.

### Example Request

```http
POST /access/v2/transfers/mobile-money HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_example_secret_from_dashboard
Content-Type: application/json

{
  "accountId": "acc_01h8xyzab12cd34ef56789012",
  "amount": 250.75,
  "reference": "MM-ORDER-948572",
  "narration": "Payout for order #948572",
  "phone": "+260961234567",
  "operator": "airtel",
  "country": "zm"
}
```

## Successful Response

```json
{
  "status": true,
  "message": "Transfer initiated successfully",
  "data": {
    "id": "trf_01hb0abcf2gh345",
    "amount": "250.75",
    "fee": "5.00",
    "currency": "ZMW",
    "narration": "Payout for order #948572",
    "initiatedAt": "2024-01-24T12:18:44.312Z",
    "completedAt": null,
    "accountId": "acc_01h8xyzab12cd34ef56789012",
    "creditAccount": {
      "type": "mobile-money",
      "accountName": "Chipo Banda",
      "phone": "+260961234567",
      "operator": "airtel",
      "country": "zm"
    },
    "status": "pending",
    "reasonForFailure": null,
    "reference": "MM-ORDER-948572",
    "lencoReference": "LNCO-20240124-123456",
    "extraData": {
      "nipSessionId": null
    },
    "source": "api"
  }
}
```

> **Note:** Monitor the `status` field (`pending`, `successful`, or `failed`) to reconcile transfers. Poll the transfer status or
> subscribe to webhook events for updates when `completedAt` transitions from `null` to a timestamp.

## Error Responses

| Status | Description |
| ------ | ----------- |
| `400 Bad Request` | Validation failure such as missing `reference`, unsupported operator, or invalid MSISDN format. The response body includes a human-readable `message`. |

### Example Error

```json
{
  "status": false,
  "message": "Operator must be one of: airtel, mtn, zamtel"
}
```

## Operational Checklist

- [ ] Confirm your Lenco keys are rotated per the [Lenco Keys Rotation Guide](./LENCO_KEYS_ROTATION_GUIDE.md) before hitting production.
- [ ] Reuse stored `transferRecipientId` values whenever possible to reduce validation errors and speed up payouts.
- [ ] Validate phone numbers and operator selection in the UI before making API calls (see `src/lib/payment-config.ts`).
- [ ] Track webhook events defined in the [Webhook Setup Guide](./WEBHOOK_SETUP_GUIDE.md) to reconcile completed and failed transfers.
