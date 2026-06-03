# Auth API Guide

Base URL: `http://localhost:3000` (configurable via `PORT`)

All endpoints are prefixed with `/auth`. All requests and responses use JSON.

## Response Envelope

Every response follows one of two shapes:

**Success**
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

All endpoints require an API key header:
```
X-API-Key: <your-api-key>
```

Endpoints marked **Bearer** also require a JWT access token:
```
Authorization: Bearer <access-token>
```

Endpoints marked **Recovery Bearer** require a short-lived recovery token:
```
Authorization: Bearer <recovery-token>
```

---

## Authentication Model

TransTribe uses **Ed25519 public-key authentication**. Each device generates an Ed25519 key pair on first launch. The public key is registered with the server. Authentication works as a challenge-response:

1. Client requests a random 32-byte challenge from the server.
2. Client signs the challenge with its Ed25519 private key.
3. Client submits the signature; server verifies it against the stored public key.

**Key format:** Base64url or standard base64. 32 bytes raw.

**Signing:** `crypto_sign_detached(message, secretKey)` — produces a 64-byte signature, encoded as base64url.

**Token types:**

| Token | Format | Lifetime | Storage |
|---|---|---|---|
| Access token | JWT (HS256) | 15 minutes | Memory only (client) |
| Refresh token | Opaque (base64url) | 90 days | Secure storage (client) |
| Recovery token | JWT (HS256) | 10 minutes | Memory only (client) |

---

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid Authorization header |
| `INVALID_ACCESS_TOKEN` | 401 | Access token expired, malformed, or is a recovery token |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token expired, revoked, or malformed |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token past its expiry |
| `INVALID_CHALLENGE` | 401 | Challenge ID not found |
| `CHALLENGE_EXPIRED` | 401 | Challenge past its 5-minute TTL |
| `CHALLENGE_ALREADY_CONSUMED` | 401 | Challenge already used (replay) |
| `INVALID_SIGNATURE` | 401 | Ed25519 signature verification failed |
| `USER_INACTIVE` | 401 | User account has been deactivated |
| `DEVICE_NOT_FOUND` | 401 | Device ID not found or has been revoked |
| `INVALID_PUBLIC_KEY` | 400 | Public key format is invalid |
| `USERNAME_ALREADY_EXISTS` | 409 | Username taken |
| `USERNAME_RESERVED` | 409 | Username is reserved (admin, root, system, etc.) |
| `CANNOT_REMOVE_CURRENT_DEVICE` | 403 | Cannot revoke the device you are currently using |
| `INVALID_GOOGLE_TOKEN` | 401 | Google ID token failed verification |
| `GOOGLE_TOKEN_EXPIRED` | 401 | Google ID token is past its expiry |
| `GOOGLE_TOKEN_AUDIENCE_MISMATCH` | 401 | Google ID token was issued for a different client |
| `GOOGLE_TOKEN_ISSUER_MISMATCH` | 401 | Google ID token issuer is invalid |
| `GOOGLE_EMAIL_NOT_VERIFIED` | 403 | Google account email is not verified |
| `GOOGLE_ACCOUNT_ALREADY_LINKED` | 409 | Google account is already linked to a different user |
| `GOOGLE_ACCOUNT_NOT_LINKED` | 404 | No TransTribe account linked to this Google identity |
| `INVALID_RECOVERY_TOKEN` | 401 | Recovery token expired, malformed, or wrong purpose |

---

## Flows

### Registration (new user)

Register a username, display name, and device in a single call. Returns tokens immediately — no separate login step.

```
POST /auth/register
Rate limit: 3 requests per minute
HTTP 201
```

**Request**
```json
{
  "username": "malik",
  "displayName": "Malik",
  "publicKey": "IADkYx5hPFZe5ckSnBCctH7DYF_vbgMjJeI1zQORrRI",
  "deviceName": "iPhone 17 Pro",
  "platform": "ios"
}
```

| Field | Required | Constraints |
|---|---|---|
| `username` | Yes | 3-30 chars, lowercase `a-z`, `0-9`, `_`, `.` |
| `displayName` | Yes | Any string |
| `publicKey` | Yes | Ed25519 public key (base64url or base64, 32 raw bytes) |
| `deviceName` | No | Any string |
| `platform` | No | `ios`, `android`, `web`, `unknown` |

**Response** (201)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "malik",
      "displayName": "Malik",
      "avatarUrl": null,
      "avatarInitials": "M",
      "isActive": true,
      "createdAt": "2025-05-29T12:00:00.000Z"
    },
    "device": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "deviceName": "iPhone 17 Pro",
      "platform": "ios",
      "lastSeenAt": "2025-05-29T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGVzdC11dWlk.test-random-bytes-base64url"
  },
  "meta": {
    "accessTokenExpiresIn": 900
  }
}
```

Store the `refreshToken` securely. The `accessToken` is short-lived and can be held in memory.

**Errors:** `INVALID_PUBLIC_KEY` (400), `USERNAME_RESERVED` (409), `USERNAME_ALREADY_EXISTS` (409)

---

### Login (returning user)

Three-step flow for an existing user with a known device.

#### Step 1: Request a challenge

```
POST /auth/challenge
Rate limit: 10 requests per minute
HTTP 200
```

**Request**
```json
{
  "username": "malik",
  "deviceId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "challengeId": "770e8400-e29b-41d4-a716-446655440002",
    "challenge": "dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U",
    "expiresAt": "2025-05-29T12:05:00.000Z"
  }
}
```

#### Step 2: Sign the challenge (client-side)

```
// Pseudo-code (libsodium / NaCl)
const message = Buffer.from(challenge, 'base64url');
const signature = crypto_sign_detached(message, secretKey);
const signatureBase64url = signature.toString('base64url');
```

#### Step 3: Submit the signature

```
POST /auth/login
Rate limit: 5 requests per minute
HTTP 200
```

**Request**
```json
{
  "challengeId": "770e8400-e29b-41d4-a716-446655440002",
  "signature": "c2lnbmF0dXJlLWJhc2U2NHVybA"
}
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "malik",
      "displayName": "Malik",
      "avatarUrl": null,
      "avatarInitials": "M",
      "isActive": true,
      "createdAt": "2025-05-29T12:00:00.000Z"
    },
    "device": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "deviceName": "iPhone 17 Pro",
      "platform": "ios",
      "lastSeenAt": "2025-05-29T12:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "dGVzdC11dWlk.test-random-bytes-base64url"
  },
  "meta": {
    "accessTokenExpiresIn": 900
  }
}
```

**Errors:** `INVALID_CHALLENGE` (401), `CHALLENGE_EXPIRED` (401), `CHALLENGE_ALREADY_CONSUMED` (401), `INVALID_SIGNATURE` (401), `USER_INACTIVE` (401)

---

### Token Refresh

Access tokens expire after 15 minutes. Use the refresh token to get a new pair. The old refresh token is immediately revoked (rotation protects against token theft).

```
POST /auth/refresh
Rate limit: 20 requests per minute
HTTP 200
```

**Request**
```json
{
  "refreshToken": "dGVzdC11dWlk.test-random-bytes-base64url"
}
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "bmV3LXV1aWQ.new-random-bytes-base64url",
    "accessTokenExpiresIn": 900
  }
}
```

Replace both tokens after every refresh. The old refresh token is revoked and cannot be reused.

**Errors:** `INVALID_REFRESH_TOKEN` (401), `REFRESH_TOKEN_EXPIRED` (401), `USER_INACTIVE` (401)

---

### Logout

Revoke a refresh token. Idempotent — always returns success even if the token was already revoked.

```
POST /auth/logout
Rate limit: none
HTTP 200
```

**Request**
```json
{
  "refreshToken": "dGVzdC11dWlk.test-random-bytes-base64url"
}
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### Current User

Get the authenticated user's profile. Requires a valid access token.

```
GET /auth/me
Auth: Bearer
Rate limit: none
HTTP 200
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "malik",
    "displayName": "Malik",
    "avatarUrl": null,
    "avatarInitials": "M",
    "isActive": true,
    "deviceId": "660e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2025-05-29T12:00:00.000Z"
  }
}
```

**Errors:** `UNAUTHORIZED` (401), `INVALID_ACCESS_TOKEN` (401), `USER_INACTIVE` (401)

---

### Device Management

#### List Devices

```
GET /auth/devices
Auth: Bearer
Rate limit: none
HTTP 200
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "deviceName": "iPhone 17 Pro",
        "platform": "ios",
        "lastSeenAt": "2025-05-29T12:00:00.000Z",
        "createdAt": "2025-05-29T10:00:00.000Z",
        "isCurrent": true
      }
    ]
  }
}
```

`isCurrent` is `true` for the device associated with the access token used in the request.

#### Revoke a Device

Revoking a device invalidates all its active refresh tokens and prevents future logins from that device.

```
DELETE /auth/devices/:id
Auth: Bearer
Rate limit: none
HTTP 200
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "message": "Device revoked successfully"
  }
}
```

**Errors:** `CANNOT_REMOVE_CURRENT_DEVICE` (403), `DEVICE_NOT_FOUND` (404)

---

## Google Account Linking

Link a Google account to the currently authenticated TransTribe user. Enables account recovery via Google.

Requires the Google Identity Services SDK on the client to obtain an ID token.

```
POST /auth/identities/google/connect
Auth: Bearer
Rate limit: none
HTTP 200
```

**Request**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFmZGE2N2I5ZjQxMjI3M2Q1N2ZmOGU3..."
}
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "provider": "google",
    "providerUserId": "1234567890",
    "email": "user@gmail.com"
  }
}
```

**Idempotent:** Calling this endpoint again with the same Google account returns the existing link data (200).

**Errors:** `UNAUTHORIZED` (401), `INVALID_GOOGLE_TOKEN` (401), `GOOGLE_TOKEN_EXPIRED` (401), `GOOGLE_TOKEN_AUDIENCE_MISMATCH` (401), `GOOGLE_TOKEN_ISSUER_MISMATCH` (401), `GOOGLE_EMAIL_NOT_VERIFIED` (403), `GOOGLE_ACCOUNT_ALREADY_LINKED` (409)

---

## Account Recovery

If a user loses their device, they can recover their account using a previously linked Google account. Recovery is a two-step flow.

### Step 1: Get a Recovery Token

Prove ownership of the linked Google account to obtain a short-lived recovery token.

```
POST /auth/recovery/google
Rate limit: 5 requests per minute
HTTP 200
```

**Request**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFmZGE2N2I5ZjQxMjI3M2Q1N2ZmOGU3..."
}
```

**Response** (200)
```json
{
  "success": true,
  "data": {
    "recoveryToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

The recovery token expires in **10 minutes**. It is a JWT containing the user ID and a purpose claim. It cannot be used as an access token for normal endpoints.

**Errors:** `INVALID_GOOGLE_TOKEN` (401), `GOOGLE_TOKEN_EXPIRED` (401), `GOOGLE_EMAIL_NOT_VERIFIED` (403), `GOOGLE_ACCOUNT_NOT_LINKED` (404), `USER_INACTIVE` (401)

### Step 2: Register a New Device

Use the recovery token to attach a new device to the existing account. This generates a standard auth challenge — the user then completes the normal login flow with their new key pair.

```
POST /auth/recovery/register-device
Auth: Recovery Bearer
Rate limit: 3 requests per minute
HTTP 200
```

**Headers**
```
Authorization: Bearer <recoveryToken>
```

**Request**
```json
{
  "publicKey": "IADkYx5hPFZe5ckSnBCctH7DYF_vbgMjJeI1zQORrRI",
  "deviceName": "New Phone",
  "platform": "android"
}
```

| Field | Required | Constraints |
|---|---|---|
| `publicKey` | Yes | Ed25519 public key (base64url or base64, 32 raw bytes) |
| `deviceName` | No | Any string |
| `platform` | No | `ios`, `android`, `web`, `unknown` |

**Response** (200)
```json
{
  "success": true,
  "data": {
    "deviceId": "660e8400-e29b-41d4-a716-446655440001",
    "challengeId": "770e8400-e29b-41d4-a716-446655440002",
    "challenge": "dGhpcyBpcyBhIHJhbmRvbSBjaGFsbGVuZ2U",
    "expiresAt": "2025-05-29T12:05:00.000Z"
  }
}
```

After this call:
1. Sign the challenge with your new device's private key.
2. Call `POST /auth/login` with `challengeId` and `signature` to get access/refresh tokens.

**Errors:** `INVALID_RECOVERY_TOKEN` (401), `USER_INACTIVE` (401), `INVALID_PUBLIC_KEY` (400)

---

## Rate Limits

| Endpoint | Rate Limit |
|---|---|
| `POST /auth/register` | 3 per minute |
| `POST /auth/challenge` | 10 per minute |
| `POST /auth/login` | 5 per minute |
| `POST /auth/refresh` | 20 per minute |
| `POST /auth/recovery/google` | 5 per minute |
| `POST /auth/recovery/register-device` | 3 per minute |
| All other auth endpoints | No limit |

Rate limits use a sliding window. Exceeding a limit returns HTTP 429.

---

## Key Concepts

### Ed25519 Key Generation (client-side)

Generate a key pair on first launch:
```
// libsodium / NaCl
const keyPair = crypto_sign_keypair();
// keyPair.publicKey  — 32 bytes, register with server
// keyPair.privateKey — 64 bytes (seed + public), keep secret
```

### Challenge Signing (client-side)

```
const challengeBytes = Buffer.from(serverChallenge, 'base64url');
const signature = crypto_sign_detached(challengeBytes, privateKey);
const signatureB64 = Buffer.from(signature).toString('base64url');
// Send signatureB64 to POST /auth/login
```

### Token Lifecycle

```
Register/Login
  └─► accessToken (15 min) + refreshToken (90 days)

accessToken expires
  └─► POST /auth/refresh
        └─► new accessToken + new refreshToken (old refreshToken revoked)

Logout
  └─► POST /auth/logout
        └─► refreshToken revoked

Recovery
  └─► POST /auth/recovery/google
        └─► recoveryToken (10 min)
              └─► POST /auth/recovery/register-device
                    └─► challenge
                          └─► POST /auth/login
                                └─► new accessToken + refreshToken
```
