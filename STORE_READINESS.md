# Store Readiness (Play Store + App Store)

This document is the single source of truth for getting HairConnekt to “100” release readiness for:
- Google Play Store (Android AAB)
- Apple App Store (iOS)

It includes:
- A checklist of non-negotiable release gates
- Operational steps (accounts, store console, env vars)
- Engineering changes that must exist in the repo

---

## 0) Current Assumptions

- Developer accounts (Apple + Google Play) are paid and verified.
- The production API is reachable via `https://api.hairconnekt.de/api/v1`.
- The app is an Expo (Expo Router) app built via EAS.

---

## 1) Non‑Negotiable Release Gates (Must Be True)

### App integrity
- [ ] No dev-only behavior is possible in production builds (e.g., OTP dev mode).
- [ ] No secrets are committed to git (DB URLs, R2 keys, email keys, JWT secrets).
- [ ] Logging does not print sensitive data in production (no SQL query logs with parameters).

### Stability + observability
- [ ] Crash reporting is enabled in production builds (and verified by forcing a test crash).
- [ ] Backend has basic protection against abuse (rate limiting, upload limits).
- [ ] A way to detect outages exists (Render alerts / uptime monitoring).

### Store compliance
- [ ] Android permissions are minimal and justified.
- [ ] Privacy policy URL is live and accurate.
- [ ] Data Safety (Play) / Privacy Nutrition Labels (Apple) are filled correctly.
- [ ] Test accounts exist for review (client + provider + admin if needed).

### Release operations
- [ ] Versioning is correct (Android `versionCode` increases; iOS `buildNumber` increases).
- [ ] Production build is done from the intended branch, with intended env vars.
- [ ] Staged rollout strategy exists (internal → closed testing → production).

---

## 2) Android (Google Play) Checklist

### Package + versioning
- [ ] `android.package` is final and will not change post-release.
- [ ] `android.versionCode` is incremented for every Play submission.
- [ ] `expo.version` is updated for each release (human-facing).

### Permissions (keep minimal)
- [ ] Only request permissions that are required by shipping features.
- [ ] Remove legacy storage permissions unless you truly need direct filesystem access.

### Store listing
- [ ] App name, short description, full description
- [ ] Feature graphic + screenshots (phone + tablet if required)
- [ ] Content rating questionnaire completed
- [ ] Target audience / age rating set
- [ ] Support email and website set

### Policies
- [ ] Privacy policy URL present (Play Console requirement for apps that handle personal data)
- [ ] Data Safety section matches actual collected/shared data

### Testing tracks
- [ ] Internal testing build installed and smoke-tested
- [ ] Closed testing (beta) with real devices / networks
- [ ] Production rollout (staged %) with rollback plan

---

## 3) iOS (Apple App Store) Checklist

### Bundle + versioning
- [ ] `ios.bundleIdentifier` is final and will not change post-release.
- [ ] iOS `buildNumber` increments for each submission.

### Privacy
- [ ] Privacy policy URL provided
- [ ] App Privacy details completed in App Store Connect

### Review readiness
- [ ] Review notes include how to access gated flows (test accounts)
- [ ] If location is used, provide clear reason string and feature behavior

---

## 4) Environment / Secrets Runbook (Do This Once)

### Rotate credentials if any were exposed
- [ ] Rotate Neon/Postgres user password at the database provider (not only Render).
- [ ] Update `DATABASE_URL` everywhere it is used:
  - Production backend service environment
  - Staging backend service environment
  - Any CI/CD secrets / local dev secrets
- [ ] Rotate any other infrastructure secrets that shared the same blast radius:
  - JWT secrets
  - Email provider keys
  - R2 access keys

Recommended approach for Neon:
- [ ] Create a new Neon role/password (or rotate the existing role password), then update `DATABASE_URL` in Render.
- [ ] Prefer Neon connection pooling host (`-pooler`) for serverless-style workloads.

Runbook reference:
- [ ] Follow SECRETS_ROTATION.md for production + staging rotation steps.
- [ ] Follow DEPLOY_RENDER.md to redeploy backend and verify `/health` + `/health/db`.

### Guardrails
- [x] Production startup must fail fast if an unsafe dev-only flag is enabled (OTP dev mode).
- [ ] Ensure `EXPO_PUBLIC_*` env vars contain only non-sensitive values.
- [x] Set `EXPO_PUBLIC_SENTRY_DSN` for production builds (and optionally staging) so crash reporting is active.

---

## 5) Engineering Implementation Checklist (Repo Changes)

### Mobile app (Expo)
- [x] Bump `expo.version` and Android `versionCode`.
- [x] Remove unnecessary Android permissions.
- [x] Ensure staging/prod identifiers are consistent (avoid confusing installs/updates).
- [x] Add crash reporting initialization (no-op unless DSN/config exists).

### Backend (NestJS)
- [x] TypeORM logging is environment-based (verbose only in development).
- [x] OTP dev mode is impossible in production.
- [x] Global rate limiting exists (auth remains stricter where already configured).
- [x] Health endpoint exists (`GET /api/v1/health`).
- [x] Express-layer protections exist (Helmet, JSON body size limits).
- [x] Upload endpoints enforce Multer fileSize limits before in-memory buffering.
- [x] Dev test scripts avoid hardcoded passwords and require env vars.

---

## 6) Verification (What “Done” Means)

### Mobile
- [x] TypeScript passes.
- [ ] App launches, login works, core navigation works.
- [ ] Popular Styles loads from API and renders images when `imageUrl` exists.
- [ ] A production build is created and installed (internal testing).
- [ ] Crash reporting receives a real event from a test crash.
- [ ] Sentry verification path: Settings → tap version 7x → Diagnostics → “Send Sentry test”.

### Backend
- [x] Server boots with production env and does not log SQL queries/parameters.
- [x] Auth endpoints still enforce throttling.
- [x] Non-auth endpoints have baseline throttling.
- [x] Health check / simple endpoint responds under load test (light).
- [x] `GET /api/v1/health/db` returns 200 (DB reachable).

---

## 7) Store Submission Notes (Practical)

- Keep a single “release channel” rule:
  - EAS Build produces store artifacts (AAB/IPA).
  - EAS Update only ships JS changes and only to compatible `runtimeVersion`.
- Prefer staged rollouts for the first production release.
