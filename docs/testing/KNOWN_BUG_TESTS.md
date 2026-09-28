# Known Bug Tests in HairConnekt

This document catalogs all regression tests marked with `it.failing` that track known existing issues in the HairConnekt codebase.

Because HairConnekt follows a strict **zero production code change** rule during test suite setup, these tests capture known defects and ensure that:
1. CI remains completely green today.
2. When the bug is fixed in the future, the test automatically breaks CI until `.failing` is removed (acting as a double-sided verification guard).

---

## Catalog of Tracked Bugs

| Bug ID | Test Suite | Test Name | Status |
| :--- | :--- | :--- | :--- |
| **BUG-019** | `packages/backend/test/t06-admin-contract.spec.ts` | `[KNOWN BUG-019] admin category create accepts isActive field without 400 rejection` | `it.failing` |
| **BUG-020** | `apps/mobile/test/t14-mobile-logic.spec.ts` | `[KNOWN BUG-020] joinUrl passes absolute URLs through without prepending base URL` | `it.failing` |
| **BUG-021** | `apps/mobile/test/t15-mobile-formatting.spec.ts` | `[KNOWN BUG-021] booking-request screen formats scheduledTime instead of scheduledDate midnight offset` | `it.failing` |
| **BUG-023** | `packages/backend/test/t11-berlin-time.spec.ts` | `[KNOWN BUG-023] appointment at 09:00 Berlin can be started at SUMMER_NOW (09:29 Berlin)` | `it.failing` |
| **BUG-024** | `packages/backend/test/t10-cancellation-stats.spec.ts` | `[KNOWN BUG-024] cancelled bookings are not counted in provider today appointments stat` | `it.failing` |

---

### BUG-019: Category Create DTO Rejects `isActive` Flag

- **Location**: `packages/backend/test/t06-admin-contract.spec.ts`
- **Symptom**: When the admin dashboard creates a service category and passes `isActive: true` (or `false`), NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` rejects the payload with HTTP 400: `property isActive should not exist`.
- **Root Cause**: `CreateCategoryDto` in `packages/backend/src/categories/dto/create-category.dto.ts` omits `@IsBoolean() @IsOptional() isActive?: boolean;`.
- **Fix Required**:
  Add `isActive?: boolean` to `CreateCategoryDto`:
  ```typescript
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
  ```
- **How to Activate Test**:
  In `packages/backend/test/t06-admin-contract.spec.ts`, change:
  ```typescript
  it.failing('[KNOWN BUG-019] admin category create accepts isActive field without 400 rejection', ...
  ```
  to:
  ```typescript
  it('[KNOWN BUG-019] admin category create accepts isActive field without 400 rejection', ...
  ```

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

### BUG-023: Appointment Start Window Rejects Berlin Wall-Clock Time

- **Location**: `packages/backend/test/t11-berlin-time.spec.ts`
- **Symptom**: An appointment scheduled for `09:00` Berlin time cannot be started at `09:29` Berlin time. The backend returns HTTP 400 stating that it is too early to start the booking.
- **Root Cause**: In `packages/backend/src/bookings/bookings.service.ts` (`startBooking` method), the server constructs local appointment time via `new Date(year, month - 1, day, hour, minute)`. Because the server runs in UTC, `09:00` wall-clock time is interpreted as `09:00 UTC` (which corresponds to `11:00 CEST`). At `07:29 UTC` (`09:29 CEST`), the server calculates the earliest allowed start (30 min before `09:00 UTC` = `08:30 UTC`), rejecting `07:29 UTC` as 61 minutes too early.
- **Fix Required**:
  Parse `scheduledDate` and `scheduledTime` using a timezone-aware helper (e.g. `luxon`, `date-fns-tz`, or temporal parsing configured for `Europe/Berlin`) to convert Berlin wall-clock time to its true UTC timestamp before comparing with `new Date()`.
- **How to Activate Test**:
  In `packages/backend/test/t11-berlin-time.spec.ts`, change:
  ```typescript
  it.failing('[KNOWN BUG-023] appointment at 09:00 Berlin can be started at SUMMER_NOW (09:29 Berlin)', ...
  ```
  to:
  ```typescript
  it('[KNOWN BUG-023] appointment at 09:00 Berlin can be started at SUMMER_NOW (09:29 Berlin)', ...
  ```

---

### BUG-024: Cancelled Bookings Counted in Today's Appointments Stat

- **Location**: `packages/backend/test/t10-cancellation-stats.spec.ts`
- **Symptom**: When a provider queries their dashboard stats (`GET /api/v1/providers/me/stats`), `todayAppointments` includes bookings with status `CANCELLED`.
- **Root Cause**: In `packages/backend/src/providers/providers.service.ts` (`getMyStats` method), the repository count query filters by `providerId` and `scheduledDate: today`, but does not exclude `BookingStatus.CANCELLED`:
  ```typescript
  this.bookingRepo.count({
    where: { providerId: provider.id, scheduledDate: today },
  });
  ```
- **Fix Required**:
  Add `status: Not(BookingStatus.CANCELLED)` or filter only active statuses (`CONFIRMED`, `IN_PROGRESS`, `COMPLETED`):
  ```typescript
  this.bookingRepo.count({
    where: {
      providerId: provider.id,
      scheduledDate: today,
      status: Not(BookingStatus.CANCELLED),
    },
  });
  ```
- **How to Activate Test**:
  In `packages/backend/test/t10-cancellation-stats.spec.ts`, change:
  ```typescript
  it.failing('[KNOWN BUG-024] cancelled bookings are not counted in provider today appointments stat', ...
  ```
  to:
  ```typescript
  it('[KNOWN BUG-024] cancelled bookings are not counted in provider today appointments stat', ...
  ```
