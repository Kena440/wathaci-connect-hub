# Lenco Internal Account Transfer Reference

## Overview

Use this endpoint to move funds between two accounts that belong to the same
Lenco tenant. Typical use cases include topping up a till from the primary
operating account or sweeping funds back to a corporate settlement account after
collections. The transfer happens inside Lenco, so no external rails are
involved and settlement is usually instantaneous once the request succeeds.

> **Base URL:** `https://api.lenco.co/access/v2`

## Endpoint

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/transfers/account` | Initiate a transfer from one of your accounts to another account you own. |

## Required Headers

| Header | Value | Notes |
| ------ | ----- | ----- |
| `Authorization` | `Bearer <LENCO_SECRET_KEY>` | Use the secret key configured in Supabase secrets or your deployment environment. |
| `Content-Type` | `application/json` | Body must be valid JSON. |

## Request Body

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `accountId` | string | ✅ | 36-character UUID for the source account that will be debited. Retrieve it from the [Accounts API](./LENCO_ACCOUNTS_API_REFERENCE.md). |
| `creditAccountId` | string | ✅ | 36-character UUID for the destination account that will be credited. Must also belong to your tenant. |
| `amount` | number | ✅ | Amount to transfer. Use a positive decimal number expressed in the currency of the source account. |
| `reference` | string | ✅ | Unique client-generated reference. Only alphanumeric characters plus `-`, `_`, and `.` are accepted. |
| `narration` | string | Optional | Free-form description shown on the transfer record (e.g., "Till top up May 2025"). |

### Example Request

```http
POST /access/v2/transfers/account HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_example_secret
Content-Type: application/json

{
  "accountId": "d5f8a140-1234-4abc-8de7-3d64b768f001",
  "creditAccountId": "6afee3a1-5678-41ab-9832-b94d1a793c10",
  "amount": 25000.50,
  "reference": "top_up_20250515",
  "narration": "Till float top up"
}
```

## Successful Response

**Status:** `200 OK`

```json
{
  "status": true,
  "message": "Transfer initiated successfully",
  "data": {
    "id": "trf_01j123example456",
    "amount": "25000.50",
    "fee": "0.00",
    "currency": "ZMW",
    "narration": "Till float top up",
    "initiatedAt": "2025-05-15T09:30:23.000Z",
    "completedAt": null,
    "accountId": "d5f8a140-1234-4abc-8de7-3d64b768f001",
    "creditAccount": {
      "id": "6afee3a1-5678-41ab-9832-b94d1a793c10",
      "type": "lenco-merchant",
      "accountName": "Main Till",
      "tillNumber": "123456"
    },
    "status": "pending",
    "reasonForFailure": null,
    "reference": "top_up_20250515",
    "lencoReference": "len_01j123example456",
    "extraData": {
      "nipSessionId": null
    },
    "source": "dashboard"
  }
}
```

### Field Reference

| Field | Description |
| ----- | ----------- |
| `data.id` | Unique identifier for the transfer record. Persist it if you need to poll for status updates. |
| `data.completedAt` | Timestamp populated when the transfer has settled. Remains `null` while the transfer is pending. |
| `data.status` | `pending`, `successful`, or `failed`. Use this to drive UI state or reconciliation logic. |
| `data.reasonForFailure` | Lenco-provided reason when the transfer fails. Helpful for troubleshooting. |
| `data.reference` | Echo of your client reference; useful when matching webhook notifications. |
| `data.lencoReference` | Lenco's internal identifier that appears on dashboard audit logs. |
| `data.source` | Indicates how the transfer was initiated (`dashboard`, `api`, etc.). |

## Error Responses

| Status | Description |
| ------ | ----------- |
| `400 Bad Request` | Validation error such as missing parameters, duplicate `reference`, mismatched account currency, or insufficient funds. |
| `401 Unauthorized` | Secret key missing or invalid. |
| `403 Forbidden` | The referenced accounts do not belong to the authenticated tenant. |

### Example Error

```json
{
  "status": false,
  "message": "Duplicate reference provided",
  "data": null
}
```

## Operational Checklist

- [ ] Store the `reference` you send so you can reconcile against webhook notifications from Lenco.
- [ ] Monitor `data.status` until it becomes `successful` or `failed`. Pending transfers may require manual review.
- [ ] Ensure the source account has adequate balance before initiating the transfer to avoid `insufficient_funds` errors.
- [ ] Rotate keys periodically in line with the [Lenco Keys Rotation Guide](./LENCO_KEYS_ROTATION_GUIDE.md) when promoting to production.
