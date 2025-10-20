# Lenco Transfer Details API Reference

Retrieve full details for a single transfer using its Lenco UUID. This endpoint is useful when you need to poll for the latest
status of a payout or display the breakdown of fees, beneficiary information, and timestamps in back-office tools.

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET`  | `/transfers/{id}` | Bearer token (`LENCO_SECRET_KEY`) | Fetch a specific transfer by its unique identifier. |

- **Base URL:** `https://api.lenco.co/access/v2`
- **Path Parameter:**
  - `id` – 36-character transfer UUID returned when the transfer was initiated.

## Request Example

```bash
curl --request GET \
  --url "https://api.lenco.co/access/v2/transfers/8a7d9c36-cc0f-4e3c-97de-d3a55d1f5b9e" \
  --header "Authorization: Bearer ${LENCO_SECRET_KEY}" \
  --header "Accept: application/json"
```

> ✅ Use the **secret** key that matches the environment where the transfer exists. Production transfers cannot be retrieved with sandbox credentials.

## Successful Response

```json
{
  "status": true,
  "message": "Transfer fetched successfully",
  "data": {
    "id": "8a7d9c36-cc0f-4e3c-97de-d3a55d1f5b9e",
    "amount": "50000.00",
    "fee": "50.00",
    "currency": "NGN",
    "narration": "Vendor payment - April invoice",
    "initiatedAt": "2025-04-11T09:32:14.000Z",
    "completedAt": "2025-04-11T09:35:02.000Z",
    "accountId": "acct_01hv50srq9a9t6p0n8c8exm1c7",
    "creditAccount": {
      "id": "recip_01hv53aqg73ny2t0xpj3vx2s2y",
      "type": "bank_account",
      "accountName": "Jane Doe",
      "accountNumber": "0123456789",
      "bank": {
        "id": "bank_01hv53d3t6d1g6p7s6y3p1w4e9",
        "name": "Access Bank",
        "country": "NG"
      },
      "phone": null,
      "operator": null,
      "walletNumber": null,
      "tillNumber": null
    },
    "status": "successful",
    "reasonForFailure": null,
    "reference": "INV-2025-04",
    "lencoReference": "TRF-230411-00042",
    "extraData": {
      "nipSessionId": "NIP1234567890"
    },
    "source": "api"
  }
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `status` | boolean | Indicates if the API request was processed successfully. |
| `message` | string | Human-readable status message supplied by Lenco. |
| `data.id` | string | UUID assigned to the transfer when it was created. |
| `data.amount` | string | Transfer amount in major currency units. |
| `data.fee` | string | Fee charged for processing the transfer. |
| `data.currency` | string | ISO 4217 currency code for the transfer. |
| `data.narration` | string | Narration passed when the transfer was initiated. |
| `data.initiatedAt` | ISO 8601 datetime | Timestamp when the transfer request was accepted. |
| `data.completedAt` | ISO 8601 datetime \| null | Timestamp when processing finished. `null` while pending. |
| `data.accountId` | string | Identifier of the Lenco account used to fund the transfer. |
| `data.creditAccount` | object | Metadata about the beneficiary account or wallet. |
| `data.creditAccount.id` | string \| null | Recipient record ID if the transfer was created from a saved recipient. |
| `data.creditAccount.type` | string | Recipient type (e.g., `bank_account`, `mobile_wallet`). |
| `data.creditAccount.accountName` | string | Name associated with the beneficiary account. |
| `data.creditAccount.accountNumber` | string \| null | Account or wallet number for the beneficiary. |
| `data.creditAccount.bank` | object \| null | Bank metadata; `null` for non-bank destinations. |
| `data.creditAccount.bank.id` | string | Lenco directory identifier for the bank. |
| `data.creditAccount.bank.name` | string | Display name of the bank. |
| `data.creditAccount.bank.country` | string | ISO 3166-1 alpha-2 bank country code. |
| `data.creditAccount.phone` | string \| null | Beneficiary phone number for mobile money transfers. |
| `data.creditAccount.operator` | string \| null | Mobile money operator name. |
| `data.creditAccount.walletNumber` | string \| null | Wallet identifier for mobile money payouts. |
| `data.creditAccount.tillNumber` | string \| null | Merchant till number for merchant payouts. |
| `data.status` | string | Current transfer state: `pending`, `successful`, or `failed`. |
| `data.reasonForFailure` | string \| null | Error message supplied when `data.status` is `failed`. |
| `data.reference` | string \| null | Client-supplied reference string for reconciliation. |
| `data.lencoReference` | string | Unique Lenco reference for the transfer. |
| `data.extraData` | object | Additional attributes supplied by Lenco (varies by rail). |
| `data.extraData.nipSessionId` | string \| null | NIP session identifier for Nigerian bank transfers. |
| `data.source` | string | Origin of the transfer (e.g., `api`, `dashboard`). |

## Error Responses

A `404 Not Found` is returned when the transfer identifier does not exist or
belongs to a different tenant. Invalid or missing bearer tokens trigger `401 Unauthorized` responses.

```json
{
  "status": false,
  "message": "Transfer not found"
}
```

## Operational Guidance

- Poll this endpoint sparingly. For large payout runs prefer webhook updates and
  reserve direct lookups for manual investigations or reconciliation flows.
- Store the `lencoReference` alongside your internal reference for easier support
  escalations with the Lenco team.
- When implementing retries for failed transfers, inspect `reasonForFailure`
  and correct the underlying issue (e.g., invalid account) before creating a new
  transfer request.

---

**Last Updated:** 2025-03-06  
**Version:** 1.0
