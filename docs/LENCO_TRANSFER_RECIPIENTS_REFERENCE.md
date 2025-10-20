# Lenco Transfer Recipients API Reference

## Overview

Use this endpoint to retrieve all transfer recipients that have been registered in your Lenco account. Results are paginated and support filtering by recipient type and country for faster lookups in dashboards or internal tooling.

- **Base URL:** `https://api.lenco.co/access/v2`
- **Endpoint:** `GET /transfer-recipients`
- **Authentication:** Requires a valid Lenco access token (secret key)

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/transfer-recipients` | Returns a paginated list of transfer recipients available to your business. |

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page`    | integer | No | Page number to retrieve. Defaults to `1` when omitted. |
| `type`    | string  | No | Filter by recipient type. Accepted values: `mobile-money`, `bank-account`, `lenco-money`, `lenco-merchant`. |
| `country` | string  | No | Filter recipients by two-letter country code (e.g., `ng`, `zm`). |

## Response Structure

Successful responses return HTTP `200` with the following payload:

```json
{
  "status": true,
  "message": "Transfer recipients retrieved successfully",
  "data": [
    {
      "id": "string",
      "currency": "string",
      "type": "string",
      "country": "string",
      "details": {
        "type": "string",
        "accountName": "string",
        "accountNumber": "string | null",
        "bank": {
          "id": "string",
          "name": "string",
          "country": "string"
        } | null,
        "phone": "string | null",
        "operator": "string | null",
        "walletNumber": "string | null",
        "tillNumber": "string | null"
      }
    }
  ],
  "meta": {
    "total": 0,
    "pageCount": 0,
    "perPage": 0,
    "currentPage": 0
  }
}
```

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | boolean | Indicates whether the request was successful. |
| `message` | string | Human-readable status message from the API. |
| `data` | array | Collection of transfer recipient objects. |
| `meta` | object | Pagination metadata describing the current result set. |

### Recipient Object (`data[]`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier for the recipient. |
| `currency` | string | ISO currency code associated with the recipient (e.g., `NGN`, `ZMW`). |
| `type` | string | Recipient type such as `mobile-money` or `bank-account`. |
| `country` | string | ISO 3166-1 alpha-2 country code. |
| `details` | object | Nested details describing the destination account or wallet. |

### Recipient Details (`details`)

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Detailed subtype describing the funding destination. |
| `accountName` | string | Name on the account or wallet. |
| `accountNumber` | string or null | Account number when applicable (bank transfers). |
| `bank` | object or null | Banking information for bank account recipients. |
| `phone` | string or null | Phone number tied to mobile-money recipients. |
| `operator` | string or null | Mobile-money operator identifier. |
| `walletNumber` | string or null | Wallet identifier for wallet-based transfers. |
| `tillNumber` | string or null | Merchant till number for merchant transfers. |

### Pagination Metadata (`meta`)

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of recipients matching the filters. |
| `pageCount` | number | Total number of pages available. |
| `perPage` | number | Number of records returned per page. |
| `currentPage` | number | Page number represented by this response. |

## Usage Notes

- Use pagination to iterate through recipients when `total` exceeds the default page size.
- Combine the `type` and `country` filters to reduce the dataset for specific payout flows.
- Store the `id` of each recipient to reuse it when initiating transfers, avoiding repeated recipient creation calls.
- Bank details (`bank`) are only present for recipients of type `bank-account`.
- Mobile-money specific fields (`phone`, `operator`, `walletNumber`) are populated only for mobile-money recipients.
