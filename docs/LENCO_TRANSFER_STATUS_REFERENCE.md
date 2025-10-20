# Lenco Transfer Status Lookup Endpoint

## Overview

Use this endpoint to fetch the lifecycle state of a previously initiated transfer by referencing the `reference` value your integration supplied during creation. The lookup confirms whether the transfer is still pending, completed successfully, or failed, and it also exposes metadata such as bank details, timestamps, and failure reasons. Authentication requires the same secret key (`LENCO_SECRET_KEY`) that protects all Access API requests.

## Endpoint

- **Method:** `GET`
- **URL:** `https://api.lenco.co/access/v2/transfers/status/{reference}`
- **Purpose:** Retrieve the latest status snapshot for a single transfer.

## Required Headers

| Header | Value | Notes |
| ------ | ----- | ----- |
| `Authorization` | `Bearer <LENCO_SECRET_KEY>` | Replace with the secret key configured in Supabase secrets or your deployment environment. |
| `Content-Type` | `application/json` | Required even though the request has no body; some HTTP clients default to other values. |

## Path Parameters

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `reference` | string | ✅ | The transfer reference you supplied when initiating the payout. Use the same casing and formatting. |

### Example Request

```bash
curl -X GET "https://api.lenco.co/access/v2/transfers/status/invoice-2024-09-0001" \
  -H "Authorization: Bearer sec_example_secret_from_dashboard" \
  -H "Content-Type: application/json"
```

## Successful Response

```http
Status: 200 OK
Content-Type: application/json
```

```json
{
  "status": true,
  "message": "Transfer fetched successfully",
  "data": {
    "id": "tr_01hay8v4bk69dx8tt9xb08v1jd",
    "amount": "50000.00",
    "fee": "35.00",
    "currency": "NGN",
    "narration": "Vendor payout for September",
    "initiatedAt": "2024-09-15T10:02:24.532Z",
    "completedAt": "2024-09-15T10:04:12.103Z",
    "accountId": "acct_01g5w4f1pz0z8m1td6y6x7jv9f",
    "creditAccount": {
      "id": "trcp_01fyeq7t6v7qjw8k5d5vv4d8qq",
      "type": "bank_account",
      "accountName": "Ada Lovelace",
      "accountNumber": "0123456789",
      "bank": {
        "id": "bank_12345",
        "name": "Example Bank",
        "country": "NG"
      },
      "phone": null,
      "operator": null,
      "walletNumber": null,
      "tillNumber": null
    },
    "status": "successful",
    "reasonForFailure": null,
    "reference": "invoice-2024-09-0001",
    "lencoReference": "LC-TR-20240915-000123",
    "extraData": {
      "nipSessionId": "NIP-20240915-112233"
    },
    "source": "dashboard"
  }
}
```

### Key Fields

- **`data.status`** — The primary lifecycle marker. Expect `pending`, `successful`, or `failed`.
- **`data.completedAt`** — Populated only when the transfer reaches a terminal state (`successful` or `failed`). Remains `null` for active transfers.
- **`data.reasonForFailure`** — Diagnostic message provided for failed transfers. Persist to observability logs for support teams.
- **`data.extraData.nipSessionId`** — Present for NIP (Nigeria Inter-Bank) transfers; retain for reconciliation when contacting bank partners.
- **`data.source`** — Indicates which channel initiated the transfer (e.g., API, dashboard, or integration).

## Not Found Response

A `404 Not Found` indicates that Lenco has no transfer matching the supplied reference.

```json
{
  "status": false,
  "message": "Transfer not found"
}
```

> **Tip:** Double-check you are targeting the correct environment (sandbox vs production) and that the reference exactly matches the value submitted during initiation.

## Error Handling Guidance

- Log both the HTTP status code and the `status` boolean returned in the response body. A `200 OK` with `"status": false` signals a logical failure, such as a rejected transfer.
- Apply retry logic for transient network issues (5xx responses) but avoid repeated polling of this endpoint; prefer webhook updates when available.
- When `data.status` remains `pending` beyond expected clearing times, contact Lenco support with the `lencoReference` and `nipSessionId` to escalate.

## Operational Checklist

- [ ] Store the `reference` you generated for each transfer; it is required for reconciliation and this status lookup.
- [ ] Cross-reference `lencoReference` values with Supabase logging tables to maintain traceability between internal and external identifiers.
- [ ] Configure alerts for transfers that remain in `pending` longer than your SLA to ensure proactive follow-up.
- [ ] Ensure support teams have access to `reasonForFailure` details for rapid customer communication.
- [ ] Document whether the transfer originated from the dashboard or API by recording the `source` value in your activity logs.
