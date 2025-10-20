# Lenco Accounts API Reference

## Overview

Use the Lenco Accounts API to retrieve metadata and balance information for a specific virtual or till account that belongs to your tenant. All requests must include a valid `Authorization: Bearer <LENCO_SECRET_KEY>` header generated from the Lenco dashboard credentials configured for the current environment.

- **Base URL:** `https://api.lenco.co/access/v2`
- **Sandbox Support:** The same endpoint structure is used for both sandbox and live tenants. Point the base URL to the appropriate environment and ensure the credentials come from the matching Lenco dashboard project.
- **Use Case:** Confirm account setup during onboarding, power account-detail displays in the admin console, or validate balances before initiating payouts.

## Endpoint: Retrieve Account Details

```http
GET /accounts/{id}
Host: api.lenco.co
Authorization: Bearer <LENCO_SECRET_KEY>
Accept: application/json
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (UUID) | ✅ | 36-character account identifier issued by Lenco. |

### Successful Response

A successful request returns HTTP `200 OK` with the following payload:

```json
{
  "status": true,
  "message": "Account retrieved successfully",
  "data": {
    "id": "b22bbf57-493f-4c79-8ba1-2504f7d5372d",
    "details": {
      "type": "personal",
      "accountName": "Wathaci Platform Fees",
      "tillNumber": "1234567"
    },
    "type": "wallet",
    "status": "active",
    "createdAt": "2024-02-10T14:18:26.000Z",
    "currency": "ZMW",
    "availableBalance": "9500.00",
    "ledgerBalance": "10000.00"
  }
}
```

> **Tip:** Empty balances are returned as `null`. Always coerce the numeric fields to a decimal type before performing comparisons.

### Error Responses

| Status | When it Occurs | Notes |
|--------|----------------|-------|
| `400 Bad Request` | The `id` value is missing or not a valid UUID. | Verify you are sending the exact identifier provided by the Lenco dashboard. |
| `401 Unauthorized` | Missing or invalid bearer token. | Ensure the `LENCO_SECRET_KEY` environment variable matches the active Lenco dashboard project. |
| `404 Not Found` | The account does not belong to your tenant. | Confirm you are querying an account that was issued to your organisation. |
| `429 Too Many Requests` | Rate limit exceeded. | Implement client-side retry with exponential backoff. |
| `5xx` | Lenco service error. | Retry the request or escalate to Lenco support if persistent. |

### Integration Notes

1. **Environment Variables** – Set `VITE_LENCO_API_URL` (frontend) and `LENCO_SECRET_KEY` (backend) using live credentials from the Lenco dashboard for production deployments.
2. **Caching** – Account metadata changes infrequently. Cache responses for up to 5 minutes, but always fetch fresh data before high-value transfers.
3. **Auditing** – Log the response payload identifier and timestamp so that support can reconcile queries with Lenco support tickets.
4. **Error Handling** – When `availableBalance` is `null`, display an actionable UI message instructing operators to retry later or check the Lenco dashboard for outages.
