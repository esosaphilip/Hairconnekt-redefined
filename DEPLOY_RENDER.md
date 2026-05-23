# Render Deployment Notes (Backend)

This is the minimal checklist to deploy the NestJS backend on Render and validate it after secrets rotation.

## Required env vars (production)

The backend will refuse to start in `NODE_ENV=production` if any are missing:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN` (comma-separated allowlist)
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `R2_ENDPOINT`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

## Render service config (backend)

- Root directory: `packages/backend`
- Build command: `npm ci && npm run build`
- Start command: `npm run start` (runs `node dist/main`)

## Post-deploy verification

Production:
- `GET https://api.hairconnekt.de/api/v1/health` → 200
- `GET https://api.hairconnekt.de/api/v1/health/db` → 200

Staging:
- `GET https://hairconnekt-api-staging.onrender.com/api/v1/health` → 200
- `GET https://hairconnekt-api-staging.onrender.com/api/v1/health/db` → 200
