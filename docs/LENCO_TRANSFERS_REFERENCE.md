# Lenco Transfers API Reference

## Overview

Use the **Transfers API** to retrieve the list of payments initiated from your
Lenco account, including mobile money payouts, bank transfers, and other disbursements.
This endpoint supports filtering by status, recipient, and date range so that you can
build monitoring dashboards or reconciliation tooling.

> **Base URL:** `https://api.lenco.co/access/v2`

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/transfers` | Returns a paginated list of transfers initiated from the authenticated tenant. |

### Authentication

Include your Lenco **secret key** in the `Authorization` header as a Bearer token
for all server-side requests. Never expose the key in client-side code.

```http
GET /access/v2/transfers HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_xxxxxxxxxxxxxxxxx
Accept: application/json
```

## Query Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `page` | integer | `1` | Optional page number for paginated results. |
| `from` | date (YYYY-MM-DD) | — | Lower bound for the transfer `initiatedAt` timestamp. |
| `to` | date (YYYY-MM-DD) | — | Upper bound for the transfer `initiatedAt` timestamp. |
| `search` | string | — | Generic search term applied to references, narration, or recipient details. |
| `accountId` | string (UUID) | — | Restrict the response to transfers from a specific tenant account. |
| `transferRecipientId` | string (UUID) | — | Filter transfers by the saved recipient identifier. |
| `type` | string | — | Filter by transfer channel (`mobile-money`, `bank-account`, `lenco-money`, `lenco-merchant`). |
| `status` | string | — | Filter by processing state (`pending`, `successful`, `failed`). |
| `country` | string | — | Two-letter country code (e.g., `ng`, `zm`) to restrict results. |

## Successful Response

**Status:** `200 OK`

```json
{
  "status": true,
  "message": "Transfers fetched successfully",
  "data": [
    {
      "id": "trf_01hwb60w27baegmrxzz5g5vjk6",
      "amount": "250000.00",
      "fee": "35.00",
      "currency": "NGN",
      "narration": "Payroll batch 2025-02-18",
      "initiatedAt": "2025-02-18T08:30:12.000Z",
      "completedAt": "2025-02-18T08:32:44.000Z",
      "accountId": "acct_01hv50srq9a9t6p0n8c8exm1c7",
      "creditAccount": {
        "id": "rcp_01hwb5zr1zq0j4v7x25q54y4yt",
        "type": "bank-account",
        "accountName": "John Doe",
        "accountNumber": "0123456789",
        "bank": {
          "id": "bank_zenith",
          "name": "Zenith Bank",
          "country": "ng"
        },
        "phone": null,
        "operator": null,
        "walletNumber": null,
        "tillNumber": null
      },
      "status": "successful",
      "reasonForFailure": null,
      "reference": "payroll-2025-02-18-001",
      "lencoReference": "LENCO-REF-1234567890",
      "extraData": {
        "nipSessionId": "NIP-20250218-001234"
      },
      "source": "api"
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
| `id` | string | Unique identifier for the transfer. |
| `amount` | string | Amount debited from the source account (use decimal parsing before arithmetic). |
| `fee` | string | Fee charged for the transfer. May be `"0"` when no fees apply. |
| `currency` | string | ISO 4217 currency code for the transfer. |
| `narration` | string | Description supplied when the transfer was created. |
| `initiatedAt` | ISO 8601 datetime | Timestamp when the transfer request was submitted. |
| `completedAt` | ISO 8601 datetime\|null | Timestamp when the transfer reached a terminal state. `null` for pending transfers. |
| `accountId` | string | Identifier for the tenant account that funded the transfer. |
| `creditAccount` | object | Destination account or wallet details. |
| `creditAccount.id` | string\|null | Identifier of the saved recipient record, if available. |
| `creditAccount.type` | string | Destination channel (`bank-account`, `mobile-money`, etc.). |
| `creditAccount.accountName` | string | Recipient name as stored with the transfer. |
| `creditAccount.accountNumber` | string\|null | Bank account number for bank transfers. |
| `creditAccount.bank` | object\|null | Bank metadata (present for bank transfers). |
| `creditAccount.bank.id` | string | Bank identifier used by Lenco. |
| `creditAccount.bank.name` | string | Bank display name. |
| `creditAccount.bank.country` | string | Country code where the bank operates. |
| `creditAccount.phone` | string\|null | Recipient phone number for mobile money payouts. |
| `creditAccount.operator` | string\|null | Mobile money operator (e.g., `mtn`). |
| `creditAccount.walletNumber` | string\|null | Wallet identifier when applicable. |
| `creditAccount.tillNumber` | string\|null | Till number for merchant payouts. |
| `status` | string | Current state (`pending`, `successful`, or `failed`). |
| `reasonForFailure` | string\|null | Failure explanation provided by Lenco or partner rails. |
| `reference` | string\|null | External reference supplied when creating the transfer. |
| `lencoReference` | string | Lenco-generated transfer reference for support queries. |
| `extraData` | object | Additional metadata attached to the transfer. |
| `extraData.nipSessionId` | string\|null | Nigerian Interbank Payment (NIP) session identifier. |
| `source` | string | Origin of the transfer (`banking-app` or `api`). |

#### `meta`

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of transfers that match the filter. |
| `pageCount` | number | Total number of available pages. |
| `perPage` | number | Number of items returned in the current page. |
| `currentPage` | number | Index of the current page (1-based). |

## Error Handling

Errors follow the same envelope structure. Check the HTTP status code and the
`message` field to determine the cause (for example, invalid credentials or a
malformed filter). The `data` array will be empty when an error occurs.

## Implementation Notes

1. **Server-side access only:** Proxy the request from your back end or Supabase
   Edge Function to keep the secret key secure.
2. **Pagination:** Use the `meta` object to determine when to fetch subsequent
   pages, especially when building dashboards for finance teams.
3. **Reconciliation:** Store both the `reference` and `lencoReference` values so
   that customer support can cross-reference payouts quickly.
4. **Status polling:** Failed or pending transfers should trigger follow-up
   polling or webhook subscriptions until a terminal state is reached.
5. **Country-specific fields:** Only expect `nipSessionId` for Nigerian bank
   transfers; handle `null` safely for other corridors.

## Related Documentation

- [Lenco Transfer Recipients Reference](./LENCO_TRANSFER_RECIPIENTS_REFERENCE.md)
- [Lenco API Authentication Reference](./LENCO_API_AUTHENTICATION_REFERENCE.md)
- [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md)

---

**Last Updated:** 2025-02-18
**Version:** 1.0
