# Secrets Rotation Runbook

This runbook is for rotating secrets safely (Neon/Postgres + Render + R2 + SendGrid + JWT secrets) for production and staging.

## 1) Neon / Postgres (Recommended)

### Goal

- Generate a new Postgres password (or a new role) in Neon.
- Update every service that uses `DATABASE_URL`.
- Redeploy and verify `GET /api/v1/health/db`.

### Steps

- Rotate the password for the Neon database user used by the backend (or create a new role with least privilege).
- Update `DATABASE_URL` in:
  - Render production backend service env vars
  - Render staging backend service env vars
  - Any other place it exists (CI, local `.env`)
- Redeploy backend services.
- Verify:

  &#x20;`GET https://hairconnekt-api-staging.onrender.com/api/v1/health/db` returns 200
  - `GET https://api.hairconnekt.de/api/v1/health/db` returns 200
  - staging

### Notes

- Prefer Neon connection pooling hostnames for high concurrency workloads (the `-pooler` host variant).
- Treat any leaked DB URL/password as compromised immediately.

## 2) Backend JWT Secrets

### Goal

- Rotate `JWT_SECRET` and `REFRESH_JWT_SECRET` without breaking deployments.

### Steps

- Generate new strong random secrets for:
  - `JWT_SECRET`
  - `REFRESH_JWT_SECRET`
- Update Render env vars for production and staging.
- Redeploy.

### Impact

- All users will be logged out (existing tokens become invalid). Plan this as a coordinated release step.

## 3) R2 (S3-compatible) Keys

### Goal

- Rotate Cloudflare R2 credentials without breaking uploads.

### Steps

- Rotate the R2 access key pair.
- Update backend env vars:
  - `R2_ACCOUNT_ID`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_PUBLIC_BASE_URL`
- Redeploy.
- Verify:
  - avatar upload works
  - portfolio upload works
  - popular style image upload works

## 4) SendGrid

### Goal

- Rotate SendGrid API key used for OTP/password reset emails.

### Steps

- Create a new SendGrid API key (restricted scopes).
- Update Render env var `SENDGRID_API_KEY`.
- Redeploy.
- Verify forgot-password flow sends email (production and staging as needed).

## 5) Expo / EAS (Mobile)

### Public vs Secret

- `EXPO_PUBLIC_*` variables are not secrets (they can be read from the app bundle).
- Secrets (like `SENTRY_AUTH_TOKEN`) must be stored as EAS secrets.

### Sentry

- Keep `EXPO_PUBLIC_SENTRY_DSN` set so the app can send crash events.
- If you want symbolicated stack traces in Sentry for native builds/updates, add `SENTRY_AUTH_TOKEN` as an EAS secret.

