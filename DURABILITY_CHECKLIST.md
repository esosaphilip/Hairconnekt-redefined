# Durability Checklist (Pre-Launch)

This checklist tracks the concrete engineering work required to make HairConnekt stable for real users at scale (not just internal testing).

## P0 (Must-have before broad public launch)

- [x] Mobile: Centralize HTTP client with automatic access-token refresh (401 → refresh → retry once) and consistent error parsing.
- [x] Mobile: Ensure refresh rotates both tokens (store new refresh token) and gracefully logs out when refresh fails.
- [x] Mobile: Replace ad-hoc authenticated `fetch` calls in core flows with the centralized client (Home, Search, Bookings, Chat, Profile, Notifications).
- [x] Backend: Add minimal production observability (request logging baseline).
- [x] Backend: Add minimal production observability (error reporting).
- [ ] Backend: Define database backup/restore runbook (Render + Postgres) and verify it end-to-end. (Runbook created; verification pending.)

## P1 (Should-have)

- [x] Mobile: Add consistent network/offline UX (timeouts, retries, “try again”, and non-silent error handling).
- [x] Mobile: Add a minimal smoke-test checklist for releases (manual steps + expected results). (See RELEASE_SMOKE_TEST_CHECKLIST.md)
- [x] Backend: Add migration workflow (TypeORM migrations) and document how to apply in production. (See packages/backend/MIGRATIONS.md)
- [x] Backend: Add basic integration tests for auth + bookings + chat endpoints. (See packages/backend/run_tests.sh)

## P2 (Nice-to-have)

- [x] Backend: Add rate-limit tuning per endpoint based on abuse risk.
- [x] Admin: Add better error surfacing for media uploads and common failures.
