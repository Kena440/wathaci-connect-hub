# Lenco Settlements API Reference

## Overview

Use the **Settlements API** to inspect the status of payouts generated after a
collection has been completed. The endpoint returns detailed metadata about the
settlement as well as the originating collection so you can track how much was
released, the settlement timeline, and the payment method that produced the
funds.

> **Base URL:** `https://api.lenco.co/access/v2`

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/settlements/{id}` | Retrieves a specific settlement using its unique identifier. |

### Authentication

Send your Lenco **secret key** in the `Authorization` header as a Bearer token
when making this request from trusted back-end services or secure edge
functions.

```http
GET /access/v2/settlements/{id} HTTP/1.1
Host: api.lenco.co
Authorization: Bearer sec_xxxxxxxxxxxxxxxxx
Accept: application/json
```

> Never expose your secret key in client-side applications. Proxy the request
> through a secure server if the data needs to be displayed in a web or mobile
> interface.

## Path Parameters

| Name | Type | Description |
|------|------|-------------|
| `id` | string (UUID) | 36-character settlement identifier returned in collection webhooks and list endpoints. |

## Successful Response

**Status:** `200 OK`

```json
{
  "status": true,
  "message": "Settlement fetched successfully",
  "data": {
    "id": "stl_01hv70srq9a9t6p0n8c8exm1c7",
    "amountSettled": "15000.00",
    "currency": "NGN",
    "createdAt": "2025-02-15T08:45:12.000Z",
    "settledAt": "2025-02-16T10:30:05.000Z",
    "status": "settled",
    "type": "instant",
    "accountId": "acct_01hv50srq9a9t6p0n8c8exm1c7",
    "collection": {
      "id": "col_01hv60srq9a9t6p0n8c8exm1c7",
      "initiatedAt": "2025-02-15T08:40:00.000Z",
      "completedAt": "2025-02-15T08:42:10.000Z",
      "amount": "15000.00",
      "fee": "50.00",
      "bearer": "merchant",
      "currency": "NGN",
      "reference": "INV-2093",
      "lencoReference": "LENCO-REF-002193",
      "type": "card",
      "status": "successful",
      "source": "api",
      "reasonForFailure": null,
      "settlementStatus": "settled",
      "settlement": null,
      "mobileMoneyDetails": null,
      "bankAccountDetails": null,
      "cardDetails": null
    }
  }
}
```

### Field Reference

#### `data`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique settlement identifier. |
| `amountSettled` | string | Amount released to the destination account. |
| `currency` | string | ISO 4217 currency code of the settlement. |
| `createdAt` | ISO 8601 datetime | Timestamp indicating when the settlement was created. |
| `settledAt` | ISO 8601 datetime\|null | Completion timestamp when the settlement was finalised. `null` while pending. |
| `status` | string | Settlement state (`pending` or `settled`). |
| `type` | string | Settlement speed configuration (`instant` or `next-day`). |
| `accountId` | string | Identifier of the destination Lenco account that received the funds. |
| `collection` | object | The originating collection that produced the settlement. |

#### `data.collection`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Collection identifier. |
| `initiatedAt` | ISO 8601 datetime | Time when the collection attempt was started. |
| `completedAt` | ISO 8601 datetime\|null | Completion timestamp for the collection. `null` if still processing. |
| `amount` | string | Amount charged to the customer. |
| `fee` | string\|null | Fee applied to the collection. |
| `bearer` | string | Entity responsible for the fee (`merchant` or `customer`). |
| `currency` | string | Currency used for the collection. |
| `reference` | string\|null | Merchant-supplied reference, if any. |
| `lencoReference` | string | Lenco-assigned reference for reconciliation. |
| `type` | string | Payment method used (`card`, `mobile-money`, or `bank-account`). |
| `status` | string | Collection status (`pending`, `successful`, `failed`, `otp-required`, or `pay-offline`). |
| `source` | string | Channel used to initiate the collection (`banking-app` or `api`). |
| `reasonForFailure` | string\|null | Error reason provided when the collection fails. |
| `settlementStatus` | string\|null | Settlement state from the collection perspective. |
| `settlement` | null | Reserved field; always `null` in the response. |
| `mobileMoneyDetails` | object\|null | Mobile money metadata when applicable. |
| `bankAccountDetails` | null | Placeholder for bank account data (currently `null`). |
| `cardDetails` | null | Placeholder for card data (currently `null`). |

#### `data.collection.mobileMoneyDetails`

| Field | Type | Description |
|-------|------|-------------|
| `country` | string | Country code of the mobile money wallet. |
| `phone` | string | Wallet phone number. |
| `operator` | string | Mobile money operator name. |
| `accountName` | string\|null | Name associated with the wallet, when available. |

## Error Responses

When a settlement with the provided identifier cannot be found, the API returns
a `404 Not Found` error.

```json
{
  "status": false,
  "message": "Settlement not found"
}
```

Handle other client or server errors by inspecting the HTTP status code and the
`message` field in the response.
