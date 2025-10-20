# Lenco Transactions API Reference

## Overview

Use the **Transactions API** to retrieve the full details of a single
transaction processed through your Lenco business account. This endpoint is
commonly called after a webhook or dashboard action when you need to present the
final amount, type, and running balance of a specific transaction.

> **Base URL:** `https://api.lenco.co/access/v2`

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/transactions/{id}` | Retrieves the complete record for a specific transaction by its UUID. |

### Authentication

Include your Lenco **secret key** in the `Authorization` header as a Bearer
access token when invoking the endpoint from a secure server-side environment.

```http
GET /access/v2/transactions/{id} HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_xxxxxxxxxxxxxxxxx
Accept: application/json
```

> Do not expose the secret key in client-side applications. Forward the request
> through a trusted server, Supabase Edge Function, or other secure backend
> integration layer that can safely handle secrets.

### Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string (UUID) | Yes | The 36-character transaction identifier returned by Lenco. |

## Successful Response

**Status:** `200 OK`

```json
{
  "status": true,
  "message": "Transaction fetched successfully",
  "data": {
    "id": "trxn_01hv5f6e1qcpqz6s9tn8k5g3r2",
    "amount": "1500.00",
    "currency": "NGN",
    "narration": "Invoice payment #INV-2041",
    "type": "credit",
    "datetime": "2025-02-21T14:32:09.000Z",
    "accountId": "acct_01hv50srq9a9t6p0n8c8exm1c7",
    "balance": "24500.23"
  }
}
```

### Field Reference

#### `data`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique transaction identifier supplied by Lenco. |
| `amount` | string | Monetary value of the transaction represented as a string for precision. |
| `currency` | string | ISO 4217 currency code associated with the transaction. |
| `narration` | string | Human-readable description, often containing invoice numbers or memo text. |
| `type` | `"credit"\|"debit"` | Indicates whether funds were added to (`credit`) or removed from (`debit`) the account. |
| `datetime` | ISO 8601 datetime | Timestamp (UTC) when the transaction was posted. |
| `accountId` | string | Identifier of the account that owns the transaction. |
| `balance` | string\|null | Running balance immediately after the transaction. May be `null` if the provider did not return a value. |

## Error Responses

### `404 Not Found`

Returned when the supplied transaction `id` does not exist for the authenticated
tenant.

```json
{
  "status": false,
  "message": "Transaction not found",
  "data": null
}
```

### `401 Unauthorized`

Returned when the `Authorization` header is missing or invalid. Ensure the
secret key is active and correctly scoped.

```json
{
  "status": false,
  "message": "Invalid or missing authorization token",
  "data": null
}
```

## Implementation Notes

1. **Idempotent lookups:** Fetching the same transaction repeatedly is safe but
   should be throttled or cached to avoid unnecessary API calls.
2. **Balance precision:** Convert string balances and amounts to decimals before
   performing arithmetic to avoid floating-point rounding issues.
3. **Secure logging:** Sanitise logs before storing transaction payloads to
   avoid leaking sensitive customer details.
4. **Webhooks integration:** Pair this endpoint with webhook events so you can
   fetch the authoritative record after receiving asynchronous notifications.
5. **Error handling:** Build retries for transient `5xx` responses and fall back
   to manual reconciliation workflows when necessary.

## Related Documentation

- [Accounts API Reference](./LENCO_ACCOUNTS_API_REFERENCE.md)
- [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md)
- [Webhook Setup Guide](./WEBHOOK_SETUP_GUIDE.md)

---

**Last Updated:** 2025-02-21
**Version:** 1.0
