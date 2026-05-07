# Durability Checklist (Pre-Launch)

This checklist tracks the concrete engineering work required to make HairConnekt stable for real users at scale (not just internal testing).

## P0 (Must-have before broad public launch)

- [x] Mobile: Centralize HTTP client with automatic access-token refresh (401 → refresh → retry once) and consistent error parsing.
- [x] Mobile: Ensure refresh rotates both tokens (store new refresh token) and gracefully logs out when refresh fails.
- [ ] Mobile: Replace ad-hoc authenticated `fetch` calls in core flows with the centralized client (Home, Search, Bookings, Chat, Profile, Notifications).
- [ ] Backend: Add minimal production observability (error reporting and request logging baseline).
- [ ] Backend: Define database backup/restore runbook (Render + Postgres) and verify it end-to-end.

## P1 (Should-have)

- [ ] Mobile: Add consistent network/offline UX (timeouts, retries, “try again”, and non-silent error handling).
- [ ] Mobile: Add a minimal smoke-test checklist for releases (manual steps + expected results).
- [ ] Backend: Add migration workflow (TypeORM migrations) and document how to apply in production.
- [ ] Backend: Add basic integration tests for auth + bookings + chat endpoints.

## P2 (Nice-to-have)

- [ ] Backend: Add rate-limit tuning per endpoint based on abuse risk.
- [ ] Admin: Add better error surfacing for media uploads and common failures.
