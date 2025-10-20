# Lenco Webhook Events Reference

This reference consolidates the webhook events currently emitted by Lenco for transfers, collections, and account transactions. Use it alongside the existing webhook setup guides when validating payloads in development or production.

## Event Catalogue

| Event | Description |
|-------|-------------|
| `transfer.successful` | A transfer initiated from one of your accounts completed successfully. |
| `transfer.failed` | A transfer initiated from one of your accounts failed. |
| `collection.successful` | A payment collection request completed successfully. |
| `collection.failed` | A payment collection request failed. |
| `collection.settled` | Funds from a collection were settled into your account. |
| `transaction.credit` | An account linked to your API token was credited. |
| `transaction.debit` | An account linked to your API token was debited. |

## Payload Examples

Each webhook shares a common envelope:

```json
{
  "event": "<event-name>",
  "data": { ... }
}
```

> **Note:** The examples below highlight the `data` section for each event. Real payloads include additional metadata such as `created_at` timestamps.

### Transfer Successful

```json
{
  "event": "transfer.successful",
  "data": {
    "id": "string",
    "amount": "string",
    "fee": "string",
    "currency": "string",
    "narration": "string",
    "initiatedAt": "date-time",
    "completedAt": "date-time | null",
    "accountId": "string",
    "creditAccount": {
      "id": "string | null",
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
    },
    "status": "pending" | "successful" | "failed",
    "reasonForFailure": "string | null",
    "reference": "string | null",
    "lencoReference": "string",
    "extraData": {
      "nipSessionId": "string | null"
    },
    "source": "banking-app" | "api"
  }
}
```

### Transfer Failed

```json
{
  "event": "transfer.failed",
  "data": {
    "id": "string",
    "amount": "string",
    "fee": "string",
    "currency": "string",
    "narration": "string",
    "initiatedAt": "date-time",
    "completedAt": "date-time | null",
    "accountId": "string",
    "creditAccount": {
      "id": "string | null",
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
    },
    "status": "pending" | "successful" | "failed",
    "reasonForFailure": "string | null",
    "reference": "string | null",
    "lencoReference": "string",
    "extraData": {
      "nipSessionId": "string | null"
    },
    "source": "banking-app" | "api"
  }
}
```

### Collection Successful

```json
{
  "event": "collection.successful",
  "data": {
    "id": "string",
    "initiatedAt": "date-time",
    "completedAt": "date-time | null",
    "amount": "string",
    "fee": "string | null",
    "bearer": "merchant" | "customer",
    "currency": "string",
    "reference": "string | null",
    "lencoReference": "string",
    "type": "card" | "mobile-money" | "bank-account" | null,
    "status": "pending" | "successful" | "failed" | "otp-required" | "pay-offline",
    "source": "banking-app" | "api",
    "reasonForFailure": "string | null",
    "settlementStatus": "pending" | "settled" | null,
    "settlement": {
      "id": "string",
      "amountSettled": "string",
      "currency": "string",
      "createdAt": "date-time",
      "settledAt": "date-time | null",
      "status": "pending" | "settled",
      "type": "instant" | "next-day",
      "accountId": "string"
    } | null,
    "mobileMoneyDetails": {
      "country": "string",
      "phone": "string",
      "operator": "string",
      "accountName": "string | null",
      "operatorTransactionId": "string | null"
    } | null,
    "bankAccountDetails": null,
    "cardDetails": null
  }
}
```

### Collection Failed

```json
{
  "event": "collection.failed",
  "data": {
    "id": "string",
    "initiatedAt": "date-time",
    "completedAt": "date-time | null",
    "amount": "string",
    "fee": "string | null",
    "bearer": "merchant" | "customer",
    "currency": "string",
    "reference": "string | null",
    "lencoReference": "string",
    "type": "card" | "mobile-money" | "bank-account" | null,
    "status": "pending" | "successful" | "failed" | "otp-required" | "pay-offline",
    "source": "banking-app" | "api",
    "reasonForFailure": "string | null",
    "settlementStatus": "pending" | "settled" | null,
    "settlement": {
      "id": "string",
      "amountSettled": "string",
      "currency": "string",
      "createdAt": "date-time",
      "settledAt": "date-time | null",
      "status": "pending" | "settled",
      "type": "instant" | "next-day",
      "accountId": "string"
    } | null,
    "mobileMoneyDetails": {
      "country": "string",
      "phone": "string",
      "operator": "string",
      "accountName": "string | null",
      "operatorTransactionId": "string | null"
    } | null,
    "bankAccountDetails": null,
    "cardDetails": null
  }
}
```

### Collection Settled

```json
{
  "event": "collection.settled",
  "data": {
    "id": "string",
    "initiatedAt": "date-time",
    "completedAt": "date-time | null",
    "amount": "string",
    "fee": "string | null",
    "bearer": "merchant" | "customer",
    "currency": "string",
    "reference": "string | null",
    "lencoReference": "string",
    "type": "card" | "mobile-money" | "bank-account" | null,
    "status": "pending" | "successful" | "failed" | "otp-required" | "pay-offline",
    "source": "banking-app" | "api",
    "reasonForFailure": "string | null",
    "settlementStatus": "pending" | "settled" | null,
    "settlement": {
      "id": "string",
      "amountSettled": "string",
      "currency": "string",
      "createdAt": "date-time",
      "settledAt": "date-time | null",
      "status": "pending" | "settled",
      "type": "instant" | "next-day",
      "accountId": "string"
    } | null,
    "mobileMoneyDetails": {
      "country": "string",
      "phone": "string",
      "operator": "string",
      "accountName": "string | null",
      "operatorTransactionId": "string | null"
    } | null,
    "bankAccountDetails": null,
    "cardDetails": null
  }
}
```

### Transaction Credit

```json
{
  "event": "transaction.credit",
  "data": {
    "id": "string",
    "amount": "string",
    "currency": "string",
    "narration": "string",
    "type": "credit" | "debit",
    "datetime": "date-time",
    "accountId": "string",
    "balance": "string | null"
  }
}
```

### Transaction Debit

```json
{
  "event": "transaction.debit",
  "data": {
    "id": "string",
    "amount": "string",
    "currency": "string",
    "narration": "string",
    "type": "credit" | "debit",
    "datetime": "date-time",
    "accountId": "string",
    "balance": "string | null"
  }
}
```

## Usage Tips

- Validate the `event` field before processing to ensure you handle each payload appropriately.
- Transfers and collections expose both merchant-facing references and Lenco-assigned references; store whichever identifier best fits your reconciliation flow.
- Transaction credit/debit events do not include a payment reference. Use the `id` or `accountId` fields when logging or reconciling these notifications.
- Continue to verify webhook signatures using the shared secret documented in the webhook setup guide.

For detailed setup, testing, and troubleshooting steps refer to:

- [`docs/WEBHOOK_SETUP_GUIDE.md`](./WEBHOOK_SETUP_GUIDE.md)
- [`docs/WEBHOOK_TESTING_GUIDE.md`](./WEBHOOK_TESTING_GUIDE.md)
- [`docs/WEBHOOK_QUICK_REFERENCE.md`](./WEBHOOK_QUICK_REFERENCE.md)
