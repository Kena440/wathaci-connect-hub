# Lenco Payload Encryption Reference

## Transport Encryption

Connections between client applications and Lenco are secured with TLS/SSL, ensuring that data in transit is encrypted by default.

In addition, specific API endpoints apply JSON Web Encryption (JWE) for end-to-end encryption of sensitive payloads. The Card Collection API, for example, must comply with the Payment Card Industry Data Security Standard (PCI DSS) when handling cardholder Personally Identifying Information (PII).

## Encryption Algorithms

Lenco uses JSON Web Encryption (JWE) compact serialization with the following cryptographic algorithms:

- **AES** in Galois/Counter Mode (GCM) with PKCS#7 padding for payload encryption.
- **RSA** with Optimal Asymmetric Encryption Padding (OAEP) for key wrapping.

## Encryption Keys

### RSA Key Pair

- Payload encryption uses a 2048-bit RSA public/private key pair.
- Data encrypted with the public key can only be decrypted using the corresponding private key.
- Retrieve the RSA public key through the **Get Encryption Key** endpoint. The key may rotate at any time and must not be cached.

### AES Session Key

- Each payload generates a one-time-use 256-bit AES session key for symmetric encryption.
- The session key is encrypted (wrapped) with the RSA public key and included in the payload alongside the encrypted data.

## Payload Encryption Workflow

1. Generate an AES session key and any required encryption parameters.
2. Encrypt the sensitive data using the AES session key.
3. Encrypt the AES session key with the RSA public key retrieved from the Get Encryption Key endpoint.
4. Send the payload containing the encrypted session key, encryption parameters, and encrypted data.

## Constructing an Encrypted Payload

1. Build the original JSON request body according to the API specification.
2. Fetch the latest RSA public key from the **Get Encryption Key** endpoint (do not reuse cached keys).
3. Use JWE compact serialization to encrypt the original request using the following JOSE header values:
   - `enc`: `A256GCM` (payload encryption algorithm)
   - `alg`: `RSA-OAEP-256` (key encryption algorithm)
   - `cty`: `application/json` (content type of the encrypted payload)
   - `kid`: `kid` value from the RSA public key (JWK) identifying the decryption key
4. Replace the original request body with a JSON object containing the encrypted payload:

   ```json
   {
     "encryptedPayload": "<JWE encrypted payload>"
   }
   ```

## Sample Implementation (Go)

```go
package main

import (
    "github.com/lestrrat-go/jwx/jwa"
    "github.com/lestrrat-go/jwx/jwe"
    "github.com/lestrrat-go/jwx/jwk"
)

func encrypt(payload []byte) (string, error) {
    jwkJSON := `{
        "kty": "RSA",
        "use": "enc",
        "n": "nApb8LyyFrZw4A(...)W1RpGR6Z7zcNikiZcQ",
        "e": "AQAB",
        "kid": "2bbb0d(...)2f68aa"
    }`

    rsaPublicKey, err := jwk.ParseKey([]byte(jwkJSON))
    if err != nil {
        return "", err
    }

    encrypted, err := jwe.Encrypt(payload, jwa.RSA_OAEP_256, rsaPublicKey, jwa.A256GCM, jwa.NoCompress)
    if err != nil {
        return "", err
    }

    return string(encrypted[:]), nil
}
```

> **Note:** The code sample above is for illustrative purposes only. Audit any third-party libraries before using them in production.
