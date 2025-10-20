# Lenco Resolve Bank Account Reference

## Overview

Use this endpoint to validate a customer's bank account details before creating a payout or saving the account to the WATHACI CONNECT treasury module. The Lenco Access API responds with the resolved account name and bank metadata so you can display a confirmation prompt to the user or automatically populate your records.

> **Base URL:** `https://api.lenco.co/access/v2` (configurable via `VITE_LENCO_API_URL`)

## Endpoint Summary

| Property | Value |
| --- | --- |
| **Method** | `POST` |
| **Path** | `/resolve/bank-account` |
| **Requires Auth** | Yes – send your secret key as a Bearer token |
| **Content-Type** | `application/json` |

### Required Headers

```http
Authorization: Bearer <LENCO_SECRET_KEY>
Content-Type: application/json
```

## Request Body

Send a JSON payload with the parameters below.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `accountNumber` | `string` | ✅ | Customer's bank account number. Provide the value exactly as it appears in the customer's records (no spaces). |
| `bankId` | `string` | ✅ | The numeric or alphanumeric identifier for the bank as provided by Lenco's bank directory. |
| `country` | `string` | ⚪️ | Two-letter country code (e.g. `ng`, `zm`). Use when the bank directory spans multiple markets. |

## Sample Request

```bash
curl -X POST "$VITE_LENCO_API_URL/resolve/bank-account" \
  -H "Authorization: Bearer $LENCO_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "accountNumber": "0123456789",
    "bankId": "280",
    "country": "ng"
  }'
```

## Successful Response

```json
{
  "status": true,
  "message": "Account resolved successfully",
  "data": {
    "type": "bank-account",
    "accountName": "JANE DOE",
    "accountNumber": "0123456789",
    "bank": {
      "id": "280",
      "name": "Guaranty Trust Bank",
      "country": "ng"
    }
  }
}
```

### Response Attributes

- `status` — Boolean flag that indicates whether the resolution succeeded.
- `message` — Human-friendly message describing the result.
- `data.type` — For this endpoint the value is always `bank-account`.
- `data.accountName` — The resolved account holder name returned by Lenco.
- `data.accountNumber` — Echoes the account number you supplied after validation.
- `data.bank` — Object describing the matched bank (identifier, display name, and country code).

## Error Handling

Expect standard HTTP errors when the request cannot be processed:

| Status | Reason |
| --- | --- |
| `400 Bad Request` | Missing or invalid parameters. Double-check the `accountNumber` length or bank identifier. |
| `401 Unauthorized` | Missing/invalid bearer token or insufficient permissions for the supplied key. |
| `404 Not Found` | The bank identifier is not recognised for the specified country. |
| `422 Unprocessable Entity` | The account details could not be resolved (e.g. incorrect account number). |
| `429 Too Many Requests` | Rate limit exceeded. Retry after the `Retry-After` duration returned by the API. |
| `500+ Server Error` | Lenco service issue. Implement retries with backoff for idempotent requests. |

Log the error payload from Lenco when a request fails. The `message` field typically contains actionable information that can be surfaced to customer support teams.

## Implementation Checklist

1. Load `VITE_LENCO_API_URL` and `LENCO_SECRET_KEY` from your environment configuration.
2. Prompt users to confirm the resolved `accountName` before saving payout details.
3. Cache successful resolutions to reduce redundant API calls during the same session.
4. Gracefully handle resolution failures by allowing users to re-enter their account details or select a different bank.
5. Monitor for spikes in `429` responses—these indicate rate limiting and may require batching or delayed retries.
