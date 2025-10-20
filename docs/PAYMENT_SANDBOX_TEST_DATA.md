# Payment Sandbox Test Data

This reference lists the mobile money test accounts and card numbers available in the Wathaci sandbox. Use these values to simulate the common success and failure paths when validating payment flows. Unless otherwise noted, amounts are provided in Zambian Kwacha.

## Mobile Money Accounts

| Phone       | Operator     | Expected Response | Error Message                           |
| ----------- | ------------ | ----------------- | --------------------------------------- |
| 0961111111  | MTN          | Successful        | –                                       |
| 0962222222  | MTN          | Failed            | Not enough funds                        |
| 0963333333  | MTN          | Failed            | Withdrawal amount limit exceeded        |
| 0964444444  | MTN          | Failed            | Transaction unauthorized                |
| 0965555555  | MTN          | Failed            | Transaction unauthorized                |
| 0966666666  | MTN          | Failed            | Transaction timed out                   |
| 0971111111  | Airtel (ZM)  | Successful        | –                                       |
| 0972222222  | Airtel (ZM)  | Failed            | Incorrect PIN                           |
| 0973333333  | Airtel (ZM)  | Failed            | Invalid amount                          |
| 0974444444  | Airtel (ZM)  | Failed            | Payment invalid                         |
| 0975555555  | Airtel (ZM)  | Failed            | Not enough funds                        |
| 0976666666  | Airtel (ZM)  | Failed            | Failed                                   |
| 0977777777  | Airtel (ZM)  | Failed            | Transaction timed out                   |
| 0978888888  | Airtel (ZM)  | Failed            | Failed                                   |
| 0881111111  | TNM          | Successful        | –                                       |
| 0883333333  | TNM          | Failed            | Not enough funds                        |
| 0885555555  | TNM          | Failed            | Transaction unauthorized                |
| 0991111111  | Airtel (MW)  | Successful        | –                                       |
| 0992222222  | Airtel (MW)  | Failed            | Not enough funds                        |
| 0984444444  | Airtel (MW)  | Failed            | Transaction unauthorized                |

> **Tip:** When simulating failures, keep the requested amount within provider-specific limits so the response matches the expected error scenario.

## Test Cards

These card numbers only work in the sandbox and must not be used in production.

| Type       | Number              | CVV                 | Expiry               |
| ---------- | ------------------- | ------------------- | -------------------- |
| Visa       | 4622 9431 2701 3705 | 838                 | Any future date      |
| Visa       | 4622 9431 2701 3747 | 370                 | Any future date      |
| Mastercard | 5555 5555 5555 4444 | Any 3-digit CVV     | Any future date      |

Always verify that the simulated payment outcome matches the "Expected Response" column before concluding a QA run.
