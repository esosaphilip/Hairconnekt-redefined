# Security Hardening Checklist

This checklist turns the current security review into concrete release work.

Current strict rating: `6.5 / 10`

## 1. Must Fix Before Public Launch

### Admin authentication hardening
- [ ] Add a second factor for admin login.
- [ ] Reduce admin login rate limits below normal user login limits.
- [ ] Add additional protection for repeated failed admin logins:
  - temporary lockout, or
  - step-up verification, or
  - alerting on repeated failures.
- [ ] Re-test admin login flow after hardening.

Relevant code:
- `packages/backend/src/auth/auth.controller.ts`
- `packages/backend/src/auth/auth.service.ts`
- `apps/admin/src/pages/Login.tsx`

### CORS production fail-closed
- [ ] Ensure production `CORS_ORIGIN` is explicitly set to trusted origins only.
- [ ] Do not allow `*` in production `CORS_ORIGIN`.
- [ ] Do not rely on the fallback `origin: true` behavior in production.
- [ ] Confirm only these origins are allowed in production:
  - `https://hairconnekt.de`
  - `https://www.hairconnekt.de`
  - `https://admin.hairconnekt.de`
- [ ] Verify admin session cookies are not readable from unintended origins.

Relevant code:
- `packages/backend/src/main.ts`
- `packages/backend/src/auth/admin-session.ts`
- `packages/backend/src/auth/admin-csrf.ts`

### Secrets and production env hygiene
- [ ] Confirm no real secrets exist in tracked files.
- [ ] Rotate any secret that may have been exposed during setup or testing.
- [ ] Verify production values exist for:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `BREVO_API_KEY`
- [ ] Confirm `OTP_DEV_MODE` is disabled in production.
- [ ] Confirm `EXPO_PUBLIC_*` values contain no sensitive secrets.

Relevant code:
- `packages/backend/src/main.ts`
- `STORE_READINESS.md`

### Security verification before release
- [ ] Install the real production Android build and smoke-test auth, booking, uploads, chat, and notifications.
- [ ] Verify crash reporting works with a real test event.
- [ ] Verify legal/privacy links open correctly in production builds.
- [ ] Verify Android App Links only if `assetlinks.json` is live and valid.

Relevant docs:
- `STORE_READINESS.md`
- `RELEASE_SMOKE_TEST_CHECKLIST.md`

## 2. Strongly Recommended Before Closed/Public Testing

### Admin monitoring and audit confidence
- [ ] Review admin audit events for login, logout, suspend, reject, approve, and user deletion flows.
- [ ] Add alerting for suspicious admin login activity.
- [ ] Confirm request IDs are visible in production logs and error reports.

Relevant code:
- `packages/backend/src/auth/auth.controller.ts`
- `packages/backend/src/admin/admin-providers.controller.ts`
- `packages/backend/src/admin/admin-users.controller.ts`
- `packages/backend/src/common/filters/global-exception.filter.ts`

### Cookie/session review
- [ ] Verify admin session cookie flags in production:
  - `httpOnly`
  - `secure`
  - `sameSite=lax`
- [ ] Verify admin logout clears both session and CSRF cookies.
- [ ] Confirm session lifetime is appropriate for admin usage.

Relevant code:
- `packages/backend/src/auth/admin-session.ts`
- `packages/backend/src/auth/admin-csrf.ts`
- `packages/backend/src/auth/auth.controller.ts`

### Upload and abuse protection review
- [ ] Confirm upload size limits are appropriate for avatar, portfolio, chat, and ID documents.
- [ ] Confirm only expected MIME/signature types are accepted.
- [ ] Review rate limits on auth and booking endpoints against expected production traffic.

Relevant code:
- `packages/backend/src/common/files/file-validation.ts`
- `packages/backend/src/providers/providers.controller.ts`
- `packages/backend/src/portfolio/portfolio.controller.ts`
- `packages/backend/src/chat/chat.controller.ts`
- `packages/backend/src/app.module.ts`

## 3. Good Follow-Ups After Launch

### Mobile hardening
- [ ] Review whether certificate pinning is needed for the mobile app.
- [ ] Review whether rooted/jailbroken device detection is worth adding.
- [ ] Review whether sensitive user profile data stored in `SecureStore` should be minimized further.

Relevant code:
- `apps/mobile/src/utils/token-storage.ts`

### Admin hardening upgrades
- [ ] Consider restricting admin access by IP or VPN if operationally possible.
- [ ] Consider shorter admin session duration or forced re-auth for sensitive actions.
- [ ] Consider separate admin-only identity provider or password policy.

### Ongoing security process
- [ ] Add a recurring secrets rotation cadence.
- [ ] Add a recurring access review for admin accounts.
- [ ] Add a release-time security check to the launch workflow.

Relevant docs:
- `SECRETS_ROTATION.md`
- `STORE_READINESS.md`

## 4. Suggested Order

1. Lock down production CORS.
2. Harden admin authentication.
3. Re-check secrets and production env values.
4. Verify production build behavior on a real device.
5. Finish Play/App Store compliance and rollout steps.

## 5. Done Means

You are in much better shape for public launch when all of the following are true:

- [ ] Admin login has stronger protection than normal user login.
- [ ] Production CORS is strict and explicit.
- [ ] No known secret exposure remains.
- [ ] Production mobile builds have been smoke-tested on real devices.
- [ ] Crash reporting and core security-sensitive flows are verified.
