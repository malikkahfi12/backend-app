# Frontend Error Handling Guide

The backend guarantees **every response** follows one of two shapes:

## Response Envelope

### Success

```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable description"
  }
}
```

The `success` field is a reliable discriminator. Do **not** rely on HTTP status codes alone — use `success` first.

---

## Error Codes

### Global (all endpoints)

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid JWT (global guard rejection) |
| `INVALID_ACCESS_TOKEN` | 401 | Token verification failed (auth-specific guard) |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `VALIDATION_ERROR` | 400 | Request body/query/param validation failed |
| `NOT_FOUND` | 404 | Resource does not exist |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `CONFLICT` | 409 | Resource conflict (e.g. duplicate) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `ERROR` | any | Fallback for unmapped status codes |

### Auth Module

| Code | HTTP | Meaning |
|------|------|---------|
| `USER_INACTIVE` | 401 | User account has been deactivated |
| `USERNAME_RESERVED` | 400 | The requested username is reserved |
| `USERNAME_ALREADY_EXISTS` | 400 | Username is already taken |
| `NO_FIELDS_PROVIDED` | 400 | Update profile request had no fields |
| `INVALID_USERNAME` | 400 | Username failed validation rules |
| `INVALID_PUBLIC_KEY` | 400 | Device public key is malformed |
| `INVALID_SIGNATURE` | 400 | Device signature verification failed |
| `INVALID_CHALLENGE` | 400 | Auth challenge ID is invalid or missing |
| `CHALLENGE_EXPIRED` | 400 | Auth challenge has expired |
| `CHALLENGE_ALREADY_CONSUMED` | 400 | Auth challenge was already used |
| `INVALID_REFRESH_TOKEN` | 400 | Refresh token is invalid or expired |
| `REFRESH_TOKEN_EXPIRED` | 400 | Refresh token has expired |
| `DEVICE_NOT_FOUND` | 400 | Device is not registered |
| `CANNOT_REMOVE_CURRENT_DEVICE` | 400 | Tried to remove the currently active device |
| `INVALID_RECOVERY_TOKEN` | 400 | Account recovery token is invalid or expired |
| `INVALID_GOOGLE_TOKEN` | 400 | Google ID token could not be verified |
| `GOOGLE_EMAIL_NOT_VERIFIED` | 400 | Google account email is not verified |
| `GOOGLE_ACCOUNT_ALREADY_LINKED` | 400 | Google account is already linked to another user |
| `GOOGLE_ACCOUNT_NOT_LINKED` | 400 | No Google account is linked to this user |

### File Upload

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_FILE` | 400 | File missing, too large (>5 MB), unsupported type (JPEG, PNG, WebP, GIF only), or missing multipart boundary |

### File Upload Gotchas

**Never manually set `Content-Type` for FormData.** React Native's `XMLHttpRequest`, `fetch()`, and Axios all auto-generate the `boundary=` parameter when you pass a `FormData` body. If you set `Content-Type: multipart/form-data` manually in headers, the boundary is stripped, the server can't parse the body, and you get a `NetworkError` (no HTTP response at all).

```ts
// WRONG — strips the auto-generated boundary, causes silent NetworkError
fetch('/api/v1/auth/me/avatar', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'multipart/form-data', // ❌ NEVER do this
  },
  body: formData,
});

// RIGHT — let the platform auto-set Content-Type with boundary
fetch('/api/v1/auth/me/avatar', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`, // ✅ only auth headers
  },
  body: formData, // ✅ platform auto-generates boundary
});
```

If you do hit this mistake, the backend now logs: `WARN Multipart request missing boundary` and returns a 400 `INVALID_FILE` instead of silently dropping the request.

---

## Recommended Client Architecture

### 1. Response interceptor (unwrap + error detect)

```ts
// Example with Axios
api.interceptors.response.use(
  (response) => {
    const body = response.data;

    if (body.success === false) {
      const { code, message } = body.error;
      throw new ApiError(code, message, response.status);
    }

    // Unwrap the envelope — return only { data, meta }
    return {
      data: body.data,
      meta: body.meta ?? {},
    };
  },
  (error) => {
    // True network errors: DNS failure, connection refused, timeout, CORS
    // These have no response at all.
    if (!error.response) {
      throw new NetworkError('Network error. Please check your connection.');
    }

    // The backend may send errors through the GlobalExceptionFilter,
    // which still uses the unified envelope. Parse it the same way.
    const body = error.response.data;
    if (body?.success === false) {
      const { code, message } = body.error;
      throw new ApiError(code, message, error.response.status);
    }

    // Unexpected response shape — treat as network error
    throw new NetworkError('Unexpected server response');
  },
);
```

### 2. Error class hierarchy

```ts
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Network error. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### 3. Handling errors at the call site

```ts
try {
  const { data } = await api.uploadAvatar(file);
  // data.avatarUrl
} catch (err) {
  if (err instanceof NetworkError) {
    // No internet, server down, CORS block
    // → show "Connection lost" banner
    return;
  }

  if (err instanceof ApiError) {
    switch (err.code) {
      case 'UNAUTHORIZED':
      case 'INVALID_ACCESS_TOKEN':
        // → redirect to login, clear stored tokens
        break;
      case 'TOO_MANY_REQUESTS':
        // → show "Slow down" toast, retry after delay
        break;
      case 'USER_INACTIVE':
        // → show "Account deactivated" screen
        break;
      case 'INVALID_FILE':
        // → show "File too large or unsupported type" toast
        break;
      case 'INTERNAL_ERROR':
        // → show "Something went wrong" toast + report
        break;
      default:
        // → show err.message as toast for unknown codes
        break;
    }
    return;
  }

  // Fallback for unexpected non-ApiError exceptions
}
```

### 4. Request interceptor (attach auth)

```ts
api.interceptors.request.use((config) => {
  const token = getAccessToken(); // from secure storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## Key Principles

1. **The `success` field always discriminates.** If `success` is `true`, read `data`. If `false`, read `error.code` and `error.message`. There are no other shapes from any backend endpoint.

2. **NetworkError is only for actual network failures.** If the server returns an HTTP response (any status), the interceptor should parse the body and throw `ApiError`. Only throw `NetworkError` when there is no response at all (Axios `error.response` is `undefined`).

3. **Error codes are stable and machine-readable.** Route on `code`, not on `message` strings. Messages are for display only.

4. **Token refresh on 401.** When intercepting `UNAUTHORIZED` or `INVALID_ACCESS_TOKEN`, attempt a silent token refresh before redirecting to login. Avoid refreshing on the refresh endpoint itself to prevent loops.

---

## Production Monitoring (Loki + Grafana)

### Logging Stack

```
 Pino (JSON stdout) ──► Docker json-file ──► Promtail ──► Loki ──► Grafana
```

The backend uses **[Pino](https://github.com/pinojs/pino)** via `nestjs-pino` for structured JSON logging.
In production, logs are written to stdout as JSON lines. In development, `pino-pretty` colorizes output.

Every log line includes: `level`, `time`, `pid`, `hostname`, `msg`, and optional context fields.

### Configuration

| Env Var | Default | Values |
|---------|---------|--------|
| `LOG_LEVEL` | `info` (prod), `debug` (dev) | `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

The log level controls **minimum severity** emitted:
- `info` — HTTP requests, import summaries
- `warn` — 4xx errors, auth failures, cache misses, retries
- `error` — 5xx errors, DB/Redis/S3 failures, stack traces

### Log Structure (Production JSON)

**Successful request:**
```json
{
  "level": 30,
  "time": "2026-06-05T13:30:00.000Z",
  "pid": 1,
  "hostname": "api-prod-1",
  "req": { "id": "req-abc123", "method": "GET", "url": "/api/v1/stops?lat=-6.2&lng=106.8" },
  "res": { "statusCode": 200 },
  "responseTime": 45.2,
  "msg": "request completed"
}
```

**4xx auth failure (warn level):**
```json
{
  "level": 40,
  "time": "2026-06-05T13:30:05.000Z",
  "pid": 1,
  "hostname": "api-prod-1",
  "req": { "id": "req-def456", "method": "POST", "url": "/api/v1/auth/me/avatar" },
  "res": { "statusCode": 401 },
  "responseTime": 2.1,
  "status": 401,
  "code": "UNAUTHORIZED",
  "method": "POST",
  "url": "/api/v1/auth/me/avatar",
  "msg": "POST /api/v1/auth/me/avatar 401 (UNAUTHORIZED)"
}
```

**5xx crash with stack trace (error level):**
```json
{
  "level": 50,
  "time": "2026-06-05T13:30:10.000Z",
  "pid": 1,
  "hostname": "api-prod-1",
  "req": { "id": "req-ghi789", "method": "POST", "url": "/api/v1/auth/me/avatar" },
  "res": { "statusCode": 500 },
  "responseTime": 3200,
  "status": 500,
  "code": "INTERNAL_ERROR",
  "method": "POST",
  "url": "/api/v1/auth/me/avatar",
  "stack": "Error: AccessDenied\n    at ...",
  "msg": "POST /api/v1/auth/me/avatar failed"
}
```

### Enabling Loki + Grafana

1. **Uncomment the services** in `docker-compose.yml` (search for `loki`, `promtail`, `grafana`).
2. **Uncomment the volumes** at the bottom.
3. **Start the stack:**

```bash
docker compose up -d
```

4. **Open Grafana** at http://localhost:3001 (login: `admin` / `admin`).
5. **Add Loki data source** — URL: `http://loki:3100`.
6. **Import or create dashboards** using the LogQL queries below.

### LogQL Queries

**Error rate (last 5 minutes):**
```logql
rate({service="api", level="error"} [5m])
```

**All 5xx errors with stack traces:**
```logql
{service="api"} | json | res_status >= 500
```

**Auth failure spike (rate-limited or token issues):**
```logql
{service="api"} | json | error_code = "UNAUTHORIZED" or error_code = "TOO_MANY_REQUESTS"
```

**Slow requests (p95 response time):**
```logql
quantile_over_time(0.95,
  {service="api"} | json | unwrap response_time [$__interval]
)
```

**Filter errors by endpoint:**
```logql
{service="api"} | json | req_url =~ "/api/v1/auth/.*" | level = "error"
```

**Trace a single request by ID (for debugging):**
```logql
{service="api"} | json | req_id = "req-abc123"
```

### Grafana Dashboard Panels (Suggested)

| Panel | Query | Visualization |
|-------|-------|---------------|
| Request rate | `rate({service="api"} [1m])` | Time series |
| Error rate (5xx) | `rate({service="api", level="error"} [1m])` | Time series |
| 4xx warning rate | `rate({service="api", level="warn"} [1m])` | Time series |
| p95 latency | `quantile_over_time(0.95, {service="api"} \| json \| unwrap response_time [$__interval])` | Time series |
| Top error endpoints | `sum by (req_url) (count_over_time({service="api", level="error"} [1h]))` | Bar gauge |
| Auth failures | `sum by (error_code) (count_over_time({service="api"} \| json \| error_code =~ "UNAUTHORIZED\|TOO_MANY_REQUESTS" [1h]))` | Stat |
| Recent errors | `{service="api"} \|= "error"` with limit | Logs panel |

### Critical Error Flows to Monitor

| Signal | What to watch | Alert threshold |
|--------|--------------|-----------------|
| 5xx spike | `level = "error"` rate > 10/min | Severity: critical |
| Auth failure flood | `error_code = "UNAUTHORIZED"` rate > 50/min | Potential brute-force attack |
| Rate limit hits | `error_code = "TOO_MANY_REQUESTS"` rate > 20/min | Abuse or misconfigured client |
| S3/Storage failures | logs containing `"AccessDenied"` or `"NoSuchBucket"` | Storage misconfiguration |
| External API degradation | logs with context `"StadiaMapsGeocodingService"` and level `error` | Third-party outage |
| DB connection failures | logs containing `"Can't reach database"` or `"ECONNREFUSED"` | Database down |
| Redis failures | logs with context `"RedisService"` and level `warn/error` | Cache degradation |

### Redacted Fields

The following are automatically stripped from logs to prevent secret leaks:
- `req.headers.authorization` → `[REDACTED]`
- `req.headers.cookie` → `[REDACTED]`
- `req.headers["x-api-key"]` → `[REDACTED]`
