# Known Bug Tests in HairConnekt

This document catalogs all regression tests marked with `it.failing` that track known existing issues in the HairConnekt codebase.

Because HairConnekt follows a strict **zero production code change** rule during test suite setup, these tests capture known defects and ensure that:
1. CI remains completely green today.
2. When the bug is fixed in the future, the test automatically breaks CI until `.failing` is removed (acting as a double-sided verification guard).

---

## Catalog of Tracked Bugs

| Bug ID | Test Suite | Test Name | Status |
| :--- | :--- | :--- | :--- |
| **BUG-019** | `packages/backend/test/t06-admin-contract.spec.ts` | `admin category create accepts isActive field without 400 rejection` | `RESOLVED` (Active `it`) |
| **BUG-020** | `apps/mobile/test/t14-mobile-logic.spec.ts` | `[KNOWN BUG-020] joinUrl passes absolute URLs through without prepending base URL` | `it.failing` (Pending mobile fix) |
| **BUG-021** | `apps/mobile/test/t15-mobile-formatting.spec.ts` | `[KNOWN BUG-021] booking-request screen formats scheduledTime instead of scheduledDate midnight offset` | `it.failing` (Pending mobile fix) |
| **BUG-023** | `packages/backend/test/t11-berlin-time.spec.ts` | `appointment at 09:00 Berlin can be started at SUMMER_NOW (09:29 Berlin)` | `RESOLVED` (Active `it`) |
| **BUG-024** | `packages/backend/test/t10-cancellation-stats.spec.ts` | `cancelled bookings are not counted in provider today appointments stat` | `RESOLVED` (Active `it`) |
| **BUG-028** | `packages/backend/test/t08-booking-conflicts.spec.ts` | `rejects booking with yesterday date` | `RESOLVED` (Active `it`) |

---

### BUG-019: Category Create DTO Rejects `isActive` Flag [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `packages/backend/test/t06-admin-contract.spec.ts`)
- **Location**: `packages/backend/test/t06-admin-contract.spec.ts`
- **Symptom**: When the admin dashboard creates a service category and passes `isActive: true` (or `false`), NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` rejects the payload with HTTP 400: `property isActive should not exist`.
- **Root Cause**: `CreateCategoryDto` in `packages/backend/src/categories/dto/create-category.dto.ts` omitted `@IsBoolean() @IsOptional() isActive?: boolean;`.
- **Resolution**: Merged `bug-019-category-isactive` branch into `ci-safety-net`, adding `isActive?: boolean` to `CreateCategoryDto`. Both category creation tests flipped from `it.failing` to `it`.

---

### BUG-020: `joinUrl` Prepends Base URL to Absolute URLs

- **Location**: `apps/mobile/test/t14-mobile-logic.spec.ts`
- **Symptom**: When an absolute URL (e.g. `https://s3.eu-central-1.amazonaws.com/...` or an external resource) is fetched via `apiFetch(url)` or `apiJson(url)`, `joinUrl` prepends `API` (`EXPO_PUBLIC_API_URL`), resulting in malformed URLs like `https://api.hairconnekt.de/api/v1/https://s3...`.
- **Root Cause**: `joinUrl` in `apps/mobile/src/services/apiClient.ts` only checks `path.startsWith('/')` without verifying whether `path` is already an absolute HTTP/HTTPS URL:
  ```typescript
  const joinUrl = (base: string, path: string): string => {
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
  };
  ```
- **Fix Required**:
  Update `joinUrl` to return `path` immediately if it matches `^https?://`:
  ```typescript
  const joinUrl = (base: string, path: string): string => {
    if (/^https?:\/\//i.test(path)) return path;
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
  };
  ```
- **How to Activate Test**:
  In `apps/mobile/test/t14-mobile-logic.spec.ts`, change:
  ```typescript
  it.failing('[KNOWN BUG-020] joinUrl passes absolute URLs through without prepending base URL', ...
  ```
  to:
  ```typescript
  it('[KNOWN BUG-020] joinUrl passes absolute URLs through without prepending base URL', ...
  ```

---

### BUG-021: Provider Booking Request Screen Formats Midnight Offset Instead of `scheduledTime`

- **Location**: `apps/mobile/test/t15-mobile-formatting.spec.ts`
- **Symptom**: In the provider booking request details screen, the appointment time displayed to the provider does not reflect `booking.scheduledTime` (e.g. `14:00`). Instead, it displays `02:00` (in CEST) or `00:00` (in UTC).
- **Root Cause**: In `apps/mobile/src/app/(provider)/booking-request/[id].tsx` (lines 195–204), time formatting is performed via:
  ```typescript
  const d = new Date(booking.scheduledDate);
  const timeStr = d.toLocaleTimeString(lang === 'en' ? 'en-US' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
  ```
  `booking.scheduledDate` is an ISO date string without time (`"2026-09-28"`). Passing it to `new Date()` constructs midnight UTC, completely ignoring `booking.scheduledTime`.
- **Fix Required**:
  Format `booking.scheduledTime` directly using the helper or combine date and time:
  ```typescript
  const timeStr = booking.scheduledTime || '—';
  ```
- **How to Activate Test**:
  In `apps/mobile/test/t15-mobile-formatting.spec.ts`, change:
  ```typescript
  it.failing('[KNOWN BUG-021] booking-request screen formats scheduledTime instead of scheduledDate midnight offset', ...
  ```
  to:
  ```typescript
  it('[KNOWN BUG-021] booking-request screen formats scheduledTime instead of scheduledDate midnight offset', ...
  ```

---

### BUG-023: Appointment Start Window Rejects Berlin Wall-Clock Time [RESOLVED]

- **Status**: **RESOLVED** (`it` tests active in `packages/backend/test/t11-berlin-time.spec.ts`)
- **Location**: `packages/backend/test/t11-berlin-time.spec.ts`
- **Symptom**: An appointment scheduled for `09:00` Berlin time cannot be started at `09:29` Berlin time. The backend returns HTTP 400 stating that it is too early to start the booking.
- **Root Cause**: In `packages/backend/src/bookings/bookings.service.ts` (`startBooking` method), the server constructed local appointment time via naive `new Date(...)`. Because the server runs in UTC, `09:00` wall-clock time was interpreted as `09:00 UTC` (which corresponds to `11:00 CEST`). At `07:29 UTC` (`09:29 CEST`), the server calculated earliest allowed start as `08:30 UTC`, rejecting `07:29 UTC` as 61 minutes too early. Similar UTC assumptions existed in `AppointmentSchedulerService` cron jobs and `ProvidersService` slot calculation.
- **Resolution**: Created `packages/backend/src/common/utils/berlin-time.util.ts` (`berlinWallClockToUtcMs`, `getBerlinToday`, `getBerlinNowMinutes`) with zero external dependencies using `Intl.DateTimeFormat`. Applied across `BookingsService`, `AppointmentSchedulerService`, and `ProvidersService`. All 6 tests in T11 and 10 unit tests in `berlin-time.spec.ts` activated and passing.

---

### BUG-024: Real Dashboard Provider Stats [RESOLVED]

- **Status**: **RESOLVED** (`it` tests active in `packages/backend/test/t10-cancellation-stats.spec.ts`)
- **Location**: `packages/backend/test/t10-cancellation-stats.spec.ts`
- **Symptom**: In provider dashboard stats (`GET /api/v1/providers/me/stats`), `todayAppointments` counted CANCELLED and NO_SHOW bookings, while `nextAppointmentTime` was hardcoded to `null` and `weeklyNewBookings` was hardcoded to `0`.
- **Root Cause**: `getMyStats` in `packages/backend/src/providers/providers.service.ts` returned stub values and queried today bookings without status filtering.
- **Resolution**: Implemented real stats calculation in `getMyStats`:
  - `todayAppointments`: counts today's bookings excluding `CANCELLED` and `NO_SHOW`.
  - `nextAppointmentTime`: queries earliest upcoming `CONFIRMED` booking for today (at or after current Berlin time) or future dates, formatted as `HH:mm`.
  - `weeklyNewBookings`: counts bookings created in the last 7 days excluding `CANCELLED`.
  - Added deadlock retry handling in test bootstrap. All 3 tests in T10 activated and passing.

---

### BUG-028: Bookings Allowed in the Past [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `packages/backend/test/t08-booking-conflicts.spec.ts`)
- **Location**: `packages/backend/test/t08-booking-conflicts.spec.ts`
- **Symptom**: `POST /api/v1/bookings` accepted appointments scheduled with past dates or times (e.g. yesterday).
- **Root Cause**: `validateBookingSlot` in `packages/backend/src/bookings/bookings.service.ts` checked provider status, working hours, and time blocks, but omitted a check against the current timestamp.
- **Resolution**: Added validation at the entry of `validateBookingSlot` using `berlinWallClockToUtcMs(scheduledDate, scheduledTime)`: if `scheduledUtcMs < Date.now()`, rejects with `BadRequestException('Buchungen in der Vergangenheit sind nicht möglich.')`. Protects both new bookings and reschedules. T08 yesterday test activated and passing.
