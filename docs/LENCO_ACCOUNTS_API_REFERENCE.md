# Lenco Accounts API Reference

## Overview

Use the **Accounts API** to retrieve the list of bank or till accounts that
belong to your Lenco tenant. This endpoint is typically called on dashboard
initialisation so that the application can display the current balances,
account names, and identifiers that are required when creating outgoing
payments.

> **Base URL:** `https://api.lenco.co/access/v2`

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/accounts` | Returns every account that is attached to the authenticated Lenco tenant. |

### Authentication

Include your Lenco **secret key** in the `Authorization` header as a Bearer
token when calling the API from secure back-end services.

```http
GET /access/v2/accounts HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_xxxxxxxxxxxxxxxxx
Accept: application/json
```

> Never expose the secret key in client-side code. Use a secure server, edge
> function, or Supabase function to proxy the request if the data needs to be
> surfaced in the UI.

## Query Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `page` | integer | `1` | Optional page number for paginated results. |

Pagination metadata is returned in the `meta` object of the response so you can
build paging controls when more than one page of accounts exists.

## Successful Response

**Status:** `200 OK`

```json
{
  "status": true,
  "message": "Accounts fetched successfully",
  "data": [
    {
      "id": "acct_01hv50srq9a9t6p0n8c8exm1c7",
      "details": {
        "type": "bank",
        "accountName": "Main Operating Account",
        "tillNumber": "123456"
      },
      "type": "corporate",
      "status": "active",
      "createdAt": "2025-01-12T10:15:30.000Z",
      "currency": "ZMW",
      "availableBalance": "50000.23",
      "ledgerBalance": "52000.23"
    }
  ],
  "meta": {
    "total": 1,
    "pageCount": 1,
    "perPage": 50,
    "currentPage": 1
  }
}
```

### Field Reference

#### `data[]`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the Lenco account. |
| `details.type` | string | Account detail category (`bank`, `till`, etc.). |
| `details.accountName` | string | Human-readable name configured in the Lenco dashboard. |
| `details.tillNumber` | string | Till or merchant number associated with the account (may be empty for bank accounts). |
| `type` | string | Top-level account type (e.g., `corporate`, `collection`). |
| `status` | string | Current status (`active`, `inactive`, etc.). |
| `createdAt` | ISO 8601 datetime | Creation timestamp in UTC. |
| `currency` | string | ISO 4217 currency code used by the account. |
| `availableBalance` | string\|null | Immediately spendable balance. May be `null` if unavailable. |
| `ledgerBalance` | string\|null | Ledger balance including pending transactions. May be `null` if unavailable. |

#### `meta`

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of accounts. |
| `pageCount` | number | Total number of pages based on the `perPage` value. |
| `perPage` | number | Maximum items returned per page. |
| `currentPage` | number | Page number that generated the response. |

## Error Handling

When authentication fails or the request is malformed, the API responds with an
error object using the same envelope structure. Inspect the HTTP status code and
the `message` field to determine the root cause.

```json
{
  "status": false,
  "message": "Invalid or missing authorization token",
  "data": [],
  "meta": {
    "total": 0,
    "pageCount": 0,
    "perPage": 50,
    "currentPage": 1
  }
}
```

## Implementation Notes

1. **Server-side only:** Proxy requests through Supabase functions or your own
   back end to protect the secret key.
2. **Cache appropriately:** Account data rarely changes. Consider short-term
   caching (e.g., 1–5 minutes) to reduce repeated calls during dashboard use.
3. **Balance formatting:** Convert the string balances to numbers before doing
   arithmetic, and format for display with locale-aware helpers.
4. **Audit logging:** Record who initiated an account lookup and why, especially
   in admin dashboards, to maintain compliance requirements.
5. **Pagination:** Use the `meta` object to detect when additional pages are
   available and fetch them lazily to avoid unnecessary API calls.

## Related Documentation

- [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md)
- [Webhook Setup Guide](./WEBHOOK_SETUP_GUIDE.md)
- [Environment Variables Quick Reference](./ENVIRONMENT_VARIABLES_QUICK_REFERENCE.md)

---

**Last Updated:** 2025-02-18
**Version:** 1.0
