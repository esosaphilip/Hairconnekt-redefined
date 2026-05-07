# Release Smoke Test Checklist (Mobile + Backend)

Run this checklist on every release candidate build (TestFlight / Play internal testing) before widening rollout.

## Setup

- Use a fresh install on one device (or uninstall/reinstall).
- Use one client test account and one provider test account.
- Confirm the app points to the intended API (staging vs production).

## Auth

- Register (client): create account, verify email/OTP flow completes, lands in client home.
- Login (client): login succeeds, profile loads.
- Login (provider): login succeeds, provider dashboard loads.
- Token refresh: leave app idle until access token expires, then load a protected screen; request succeeds without forcing logout.

## Client core flows

- Home: providers list loads; Popular Styles load with images; tapping opens detail.
- Search: search query returns results; change sort; load more pagination works.
- Provider profile: services/gallery/reviews tabs load; message button opens chat.
- Booking: select a service, pick date/time, submit booking; confirmation screen shows.
- Appointments: upcoming booking appears; open booking details; cancel/reschedule (if enabled) succeeds.
- Favourites: add/remove provider from favourites; state persists after app restart.

## Provider core flows

- Provider profile: preview loads; edit profile saves; avatar upload works.
- Services: list loads; add/edit a service; toggle active; delete service.
- Availability: open availability settings; save schedule; re-open and confirm persisted.
- Portfolio: upload an image; it appears in portfolio and preview.
- Booking requests: pending booking appears; accept/decline; client sees updated status.

## Chat + Notifications

- Chat: send message from client to provider; provider receives and replies.
- Notifications: notifications screen loads; new booking status triggers notification (if applicable).

## Error handling / Offline checks

- Offline: enable airplane mode and open Home or Search; error banner appears and “Try again” recovers after network returns.
- Slow network: on a throttled connection, requests either succeed or time out with a user-friendly error (no infinite spinners).

## Backend health

- `GET /api/v1/health` returns 200.
- `GET /api/v1/health/db` returns 200.

