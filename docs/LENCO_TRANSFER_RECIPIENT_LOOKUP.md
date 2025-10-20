# Lenco Transfer Recipient Lookup

Retrieve account metadata for an existing transfer recipient record via the Lenco Access API.

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/transfer-recipients/{id}` | Bearer token (`LENCO_SECRET_KEY`) | Fetch the stored details for a specific transfer recipient. |

- **Base URL:** `https://api.lenco.co/access/v2`
- **Path Parameter:**
  - `id` – 36-character UUID assigned when the transfer recipient was created.

## Request Example

```bash
curl --request GET \
  --url "https://api.lenco.co/access/v2/transfer-recipients/2f6b1b91-7d3e-4e9d-9c4e-9efba66c9de5" \
  --header "Authorization: Bearer ${LENCO_SECRET_KEY}"
```

> ⚠️ Replace the UUID with the recipient identifier returned from `POST /transfer-recipients` and ensure you are using the correct secret key for the target environment (test vs production).

## Successful Response

```json
{
  "status": true,
  "message": "Recipient fetched successfully",
  "data": {
    "id": "2f6b1b91-7d3e-4e9d-9c4e-9efba66c9de5",
    "currency": "NGN",
    "type": "bank",
    "country": "NG",
    "details": {
      "type": "bank_account",
      "accountName": "Jane Doe",
      "accountNumber": "0123456789",
      "bank": {
        "id": "7b2d0a22-35e9-47f4-a6fd-11e7cd69bd6d",
        "name": "Access Bank",
        "country": "NG"
      },
      "phone": null,
      "operator": null,
      "walletNumber": null,
      "tillNumber": null
    }
  }
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `status` | boolean | `true` when the lookup succeeds. |
| `message` | string | Human-readable status message from Lenco. |
| `data.id` | string | UUID of the transfer recipient. |
| `data.currency` | string | ISO 4217 currency code associated with the recipient. |
| `data.type` | string | Recipient category (e.g., `bank`, `mobile_money`, `till`). |
| `data.country` | string | ISO 3166-1 alpha-2 country code. |
| `data.details.type` | string | Details subtype, such as `bank_account` or `mobile_wallet`. |
| `data.details.accountName` | string | Account holder name as stored on the recipient profile. |
| `data.details.accountNumber` | string \| null | Bank account or wallet number (nullable for till-based recipients). |
| `data.details.bank` | object \| null | Bank metadata when `type` is `bank`. Null for non-bank recipients. |
| `data.details.bank.id` | string | Identifier for the bank within Lenco's directory. |
| `data.details.bank.name` | string | Friendly bank name. |
| `data.details.bank.country` | string | Country code for the bank. |
| `data.details.phone` | string \| null | Contact phone for mobile money recipients. |
| `data.details.operator` | string \| null | Mobile money operator (e.g., `airtel`, `mtn`). |
| `data.details.walletNumber` | string \| null | Wallet identifier for mobile money accounts. |
| `data.details.tillNumber` | string \| null | Merchant till number for merchant payment recipients. |

## Error Handling

Expect HTTP `4xx` responses for missing or invalid recipient IDs and `401` when the bearer token is invalid or missing. Retry with exponential backoff if you receive transient `5xx` errors.

```json
{
  "status": false,
  "message": "Recipient not found"
}
```

## Operational Notes

- The endpoint always returns the most recent snapshot of the recipient's configuration. Update operations (`PATCH /transfer-recipients/{id}`) are reflected immediately.
- Cache responses cautiously; recipient details may change if the user updates bank information through the dashboard.
- Log lookup attempts together with the requesting service/user to aid auditing and reconciliation.
- Combine with the [Payment Integration Guide](./PAYMENT_INTEGRATION_GUIDE.md#api-reference) when wiring automated payout flows.

---

**Last Updated:** 2025-10-18
**Version:** 1.0
