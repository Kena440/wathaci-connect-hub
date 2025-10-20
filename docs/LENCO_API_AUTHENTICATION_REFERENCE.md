# Lenco API Authentication & Response Reference

This guide summarizes the authentication requirements, request/response format, and error payloads for the Lenco REST API. Use it as a quick reference when integrating payment calls from either the frontend helpers or the backend Express server.

## Authentication Requirements

All requests to the Lenco API must include a valid API token in the `Authorization` header. Tokens are scoped per environment (test vs. live) and must be sent over HTTPS.

```http
Authorization: Bearer <API_TOKEN>
```

### Example: Authenticated cURL Request

```bash
curl \
  -X GET "https://api.lenco.co/access/v2/recipients" \
  -H "Authorization: Bearer xo+CAiijrIy9XvZCYyhjrv0fpSAL6CfU8CgA+up1NXqK"
```

If the header is missing or the token is invalid, Lenco returns `401 Unauthorized`. Always provision separate tokens for staging and production and rotate them regularly (see [Lenco Keys Rotation Guide](./LENCO_KEYS_ROTATION_GUIDE.md)).

## Request and Response Format

Lenco accepts and returns JSON for every REST endpoint. Successful responses are wrapped in a consistent envelope:

```json
{
  "status": true,
  "message": "Recipients retrieved",
  "data": [
    {
      "id": "rec_123",
      "name": "Example Recipient"
    }
  ],
  "meta": {
    "total": 2,
    "perPage": 50,
    "currentPage": 1,
    "pageCount": 1
  }
}
```

- **`status`** – Boolean flag indicating whether the request was processed successfully. Always confirm this value even when the HTTP status code is `200`.
- **`message`** – Human-readable summary. Log it for debugging, but do not branch logic on this string.
- **`data`** – Contains the requested resource or array of resources.
- **`meta`** – Optional pagination object returned on list endpoints.

### Meta Pagination Object

| Key          | Description                                                                 |
|--------------|-----------------------------------------------------------------------------|
| `total`      | Total number of records available.                                          |
| `perPage`    | Maximum number of records returned per request.                             |
| `currentPage`| Page currently returned (defaults to `1` when the query parameter is unset). |
| `pageCount`  | Total number of pages available based on `perPage` and `total`.             |

## Error Handling

Lenco uses standard HTTP status codes. When a request fails, inspect both the HTTP code and the optional `errorCode` field in the response body.

### HTTP Status Codes

| Status | Meaning                                                                                 |
|--------|-----------------------------------------------------------------------------------------|
| 200, 201 | Request accepted. For transfer endpoints, inspect `data` to confirm the transaction status. |
| 400    | Validation or client-side error.                                                        |
| 401    | Authentication failed (missing or invalid token).                                       |
| 404    | Resource not found.                                                                     |
| 500–504| Server-side error on Lenco.                                                             |

### Error Code Reference

| Code | Description                                        |
|------|----------------------------------------------------|
| `01` | Validation error.                                  |
| `02` | Insufficient funds in account.                     |
| `03` | Transfer limit on the account exceeded.            |
| `04` | Invalid or duplicate reference.                    |
| `05` | Invalid recipient account.                         |
| `06` | Restriction on debit account.                      |
| `07` | Invalid or duplicate bulk transfer reference.      |
| `08` | Invalid number of objects in `transfers`.          |
| `09` | Invalid auth token or authorization denied.        |
| `10` | General error.                                     |
| `11` | Resource not found.                                |
| `12` | Invalid mobile number.                             |
| `13` | Access to resource denied.                         |

When handling errors, prefer resilient retry logic for `5xx` responses and user-facing validation for the `01`–`05` series. Record both the HTTP status code and `errorCode` for observability dashboards.
