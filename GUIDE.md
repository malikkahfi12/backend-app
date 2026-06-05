# Profile Management

Update user profile fields and upload avatar images.

---

## PATCH /api/v1/auth/me

Update username, display name, or avatar URL. Send only the fields you want to change.

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Body (at least one field required):**
```json
{ "username": "newhandle" }
```
```json
{ "displayName": "New Name" }
```
```json
{ "avatarUrl": "https://..." }
```
```json
{ "avatarUrl": null }
```

**Constraints:**

| Field | Rules |
|-------|-------|
| `username` | 3-30 chars, lowercase letters, numbers, underscore, and dot only |
| `displayName` | 1-100 chars |
| `avatarUrl` | Valid HTTPS URL, or `null` to remove avatar |

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "newhandle",
    "displayName": "New Name",
    "avatarUrl": "https://...",
    "avatarInitials": "NN",
    "isActive": true,
    "deviceId": "uuid",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `NO_FIELDS_PROVIDED` | At least one field must be provided |
| 400 | `INVALID_USERNAME` | Username validation failed |
| 409 | `USERNAME_ALREADY_EXISTS` | Username already exists |
| 409 | `USERNAME_RESERVED` | This username is reserved |
| 401 | `UNAUTHORIZED` | Missing or invalid access token |

---

## POST /api/v1/auth/me/avatar

Upload a profile image. The new avatar URL is saved to your profile automatically and the previous avatar (if stored on B2) is deleted.

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: multipart/form-data
```

**Form fields:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `file` | binary | Yes | JPEG, PNG, WebP, or GIF. Max 5 MB |

**Success (200):**
```json
{
  "success": true,
  "data": {
    "avatarUrl": "https://s3.us-west-004.backblazeb2.com/bucket/avatars/abc.jpg"
  }
}
```

**Errors:**

| Status | Code | Message |
|--------|------|---------|
| 400 | `INVALID_FILE` | No file provided, unsupported type, or exceeds 5 MB limit |
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
