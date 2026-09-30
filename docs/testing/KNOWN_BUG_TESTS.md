# Known Bug Tests in HairConnekt

This document catalogs all regression tests marked with `it.failing` that track known existing issues in the HairConnekt codebase.

Because HairConnekt follows a strict **zero production code change** rule during test suite setup, these tests capture known defects and ensure that:
1. CI remains completely green today.
2. When the bug is fixed in the future, the test automatically breaks CI until `.failing` is removed (acting as a double-sided verification guard).

---

## Catalog of Tracked Bugs

| Bug ID | Test Suite | Test Name | Status |
| :--- | :--- | :--- | :--- |
| **BUG-019** | `apps/backend/test/t06-admin-contract.spec.ts` | `admin category create accepts isActive field without 400 rejection` | `RESOLVED` (Active `it`) |
| **BUG-020** | `apps/mobile/test/t14-mobile-logic.spec.ts` | `[KNOWN BUG-020] joinUrl passes absolute URLs through without prepending base URL` | `RESOLVED` (Active `it`) |
| **BUG-021** | `apps/mobile/test/t15-mobile-formatting.spec.ts` | `[KNOWN BUG-021] booking-request screen formats scheduledTime instead of scheduledDate midnight offset` | `RESOLVED` (Active `it`) |
| **BUG-023** | `apps/backend/test/t11-berlin-time.spec.ts` | `appointment at 09:00 Berlin can be started at SUMMER_NOW (09:29 Berlin)` | `RESOLVED` (Active `it`) |
| **BUG-024** | `apps/backend/test/t10-cancellation-stats.spec.ts` | `cancelled bookings are not counted in provider today appointments stat` | `RESOLVED` (Active `it`) |
| **BUG-028** | `apps/backend/test/t08-booking-conflicts.spec.ts` | `rejects booking with yesterday date` | `RESOLVED` (Active `it`) |
| **BUG-033** | `apps/backend/test/booking-address.spec.ts`, `t08-booking-conflicts.spec.ts`, `apps/mobile/test/t14-mobile-logic.spec.ts` | `Mobile booking address collection and snapshot persistence` | `RESOLVED` (Active `it`) |
| **BUG-036** | `apps/backend/test/t07-provider-setup.spec.ts` | `[KNOWN BUG-036] provider can edit an existing service including its category` | `RESOLVED` (Active `it`) |

---

### BUG-019: Category Create DTO Rejects `isActive` Flag [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/backend/test/t06-admin-contract.spec.ts`)
- **Location**: `apps/backend/test/t06-admin-contract.spec.ts`
- **Symptom**: When the admin dashboard creates a service category and passes `isActive: true` (or `false`), NestJS `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` rejects the payload with HTTP 400: `property isActive should not exist`.
- **Root Cause**: `CreateCategoryDto` in `apps/backend/src/categories/dto/create-category.dto.ts` omitted `@IsBoolean() @IsOptional() isActive?: boolean;`.
- **Resolution**: Merged `bug-019-category-isactive` branch into `ci-safety-net`, adding `isActive?: boolean` to `CreateCategoryDto`. Both category creation tests flipped from `it.failing` to `it`.

---

### BUG-020: `joinUrl` Prepends Base URL to Absolute URLs [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/mobile/test/t14-mobile-logic.spec.ts`)
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
- **Resolution**:
  Updated `joinUrl` to return `path` immediately if it matches `^https?://`:
  ```typescript
  const joinUrl = (base: string, path: string): string => {
    if (/^https?:\/\//i.test(path)) return path;
    const b = base.replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${b}${p}`;
  };
  ```
  Flipped test from `it.failing` to active `it`.

---

### BUG-021: Provider Booking Request Screen Formats Midnight Offset Instead of `scheduledTime` [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/mobile/test/t15-mobile-formatting.spec.ts`)
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
- **Resolution**:
  Introduced `formatBookingTime(time, language)` in `apps/mobile/src/utils/format.ts` and updated `booking-request/[id].tsx` as well as all screens displaying appointment times. Static scan test and unit tests flipped from `it.failing` to active `it`.

---

### BUG-023: Appointment Start Window Rejects Berlin Wall-Clock Time [RESOLVED]

- **Status**: **RESOLVED** (`it` tests active in `apps/backend/test/t11-berlin-time.spec.ts`)
- **Location**: `apps/backend/test/t11-berlin-time.spec.ts`
- **Symptom**: An appointment scheduled for `09:00` Berlin time cannot be started at `09:29` Berlin time. The backend returns HTTP 400 stating that it is too early to start the booking.
- **Root Cause**: In `apps/backend/src/bookings/bookings.service.ts` (`startBooking` method), the server constructed local appointment time via naive `new Date(...)`. Because the server runs in UTC, `09:00` wall-clock time was interpreted as `09:00 UTC` (which corresponds to `11:00 CEST`). At `07:29 UTC` (`09:29 CEST`), the server calculated earliest allowed start as `08:30 UTC`, rejecting `07:29 UTC` as 61 minutes too early. Similar UTC assumptions existed in `AppointmentSchedulerService` cron jobs and `ProvidersService` slot calculation.
- **Resolution**: Created `apps/backend/src/common/utils/berlin-time.util.ts` (`berlinWallClockToUtcMs`, `getBerlinToday`, `getBerlinNowMinutes`) with zero external dependencies using `Intl.DateTimeFormat`. Applied across `BookingsService`, `AppointmentSchedulerService`, and `ProvidersService`. All 6 tests in T11 and 10 unit tests in `berlin-time.spec.ts` activated and passing.

---

### BUG-024: Real Dashboard Provider Stats [RESOLVED]

- **Status**: **RESOLVED** (`it` tests active in `apps/backend/test/t10-cancellation-stats.spec.ts`)
- **Location**: `apps/backend/test/t10-cancellation-stats.spec.ts`
- **Symptom**: In provider dashboard stats (`GET /api/v1/providers/me/stats`), `todayAppointments` counted CANCELLED and NO_SHOW bookings, while `nextAppointmentTime` was hardcoded to `null` and `weeklyNewBookings` was hardcoded to `0`.
- **Root Cause**: `getMyStats` in `apps/backend/src/providers/providers.service.ts` returned stub values and queried today bookings without status filtering.
- **Resolution**: Implemented real stats calculation in `getMyStats`:
  - `todayAppointments`: counts today's bookings excluding `CANCELLED` and `NO_SHOW`.
  - `nextAppointmentTime`: queries earliest upcoming `CONFIRMED` booking for today (at or after current Berlin time) or future dates, formatted as `HH:mm`.
  - `weeklyNewBookings`: counts bookings created in the last 7 days excluding `CANCELLED`.
  - Added deadlock retry handling in test bootstrap. All 3 tests in T10 activated and passing.

---

### BUG-028: Bookings Allowed in the Past [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/backend/test/t08-booking-conflicts.spec.ts`)
- **Location**: `apps/backend/test/t08-booking-conflicts.spec.ts`
- **Symptom**: `POST /api/v1/bookings` accepted appointments scheduled with past dates or times (e.g. yesterday).
- **Root Cause**: `validateBookingSlot` in `apps/backend/src/bookings/bookings.service.ts` checked provider status, working hours, and time blocks, but omitted a check against the current timestamp.
- **Resolution**: Added validation at the entry of `validateBookingSlot` using `berlinWallClockToUtcMs(scheduledDate, scheduledTime)`: if `scheduledUtcMs < Date.now()`, rejects with `BadRequestException('Buchungen in der Vergangenheit sind nicht möglich.')`. Protects both new bookings and reschedules. T08 yesterday test activated and passing.
 
---

### BUG-033: Mobile Bookings Send No Address / Backend Ignores Address [RESOLVED]

- **Status**: **RESOLVED** (`it` tests active in `apps/backend/test/booking-address.spec.ts`, `apps/backend/test/t08-booking-conflicts.spec.ts`, and `apps/mobile/test/t14-mobile-logic.spec.ts`)
- **Location**: `apps/backend/test/booking-address.spec.ts`, `apps/backend/test/t08-booking-conflicts.spec.ts`, `apps/mobile/test/t14-mobile-logic.spec.ts`
- **Symptom**: When a client enabled "Mobiler Service" on the mobile booking details screen (`(client)/booking/details.tsx`), only `isMobile: true` was sent with no address selected or collected. In the backend, even if an `addressId` was provided in `CreateBookingDto`, `createBooking` in `BookingsService` completely ignored it, leaving the booking entity's snapshot columns (`addressStreet`, `addressHouseNumber`, `addressCity`, `addressPostalCode`) null. Providers receiving mobile booking requests had no address information.
- **Root Cause**:
  1. **Frontend**: The mobile booking screen had a toggle for mobile service without any address selection or address input form.
  2. **DTO**: `CreateBookingDto.addressId` was optional with no conditional validation requiring it when `isMobile: true`.
  3. **Backend Service**: `createBooking` did not inject or query the `Address` repository, never verified address ownership by the authenticated client, and never copied address fields to the booking entity.
  4. **Entity Serialization**: Booking entities stored snapshot columns but did not expose or serialize a nested `address` object (`{ street, houseNumber, postalCode, city }`) expected by consumer screens such as `booking-request/[id].tsx`.
- **Resolution**:
  1. **Backend DTO**: Added conditional validation with `@ValidateIf((o) => o.isMobile === true)` and `@IsNotEmpty()` + `@IsUUID('4')` on `addressId` in `CreateBookingDto`. Non-mobile studio bookings continue to require no address.
  2. **Backend Service**: Registered `Address` in `BookingsModule`. In `BookingsService.createBooking`, when `isMobile: true`, verified that `addressId` exists and belongs to the authenticated client (`address.userId === clientId`), then copied `street`, `houseNumber`, `city`, and `postalCode` onto the booking snapshot columns.
  3. **Entity Serialization**: Added `@AfterLoad()`, `@AfterInsert()`, `@AfterUpdate()`, and custom `toJSON()` on `Booking` entity to ensure the nested `address` object is consistently populated and serialized across all endpoints (`res.json()`).
  4. **Mobile Client**: In `apps/mobile/src/app/(client)/booking/details.tsx`, when mobile service is toggled on:
     - Fetches saved addresses from `GET /users/me/addresses`.
     - Displays the default/first saved address with options to pick another saved address or enter a new address.
     - If entering a new address, displays a 4-field form (Straße, Hausnummer, PLZ, Stadt) matching `provider-register/step2.tsx` layout, plus a "Als Standardadresse speichern" switch.
     - On submission with a new address, calls `POST /users/me/addresses` first to save the address, then uses the returned ID as `addressId` in `POST /bookings`.
     - Validates and blocks submission with `"Bitte gib eine Adresse für den mobilen Service ein."` if no address is provided.
  5. **Regression Tests**: Added unit tests for DTO and entity serialization in `booking-address.spec.ts`, integration tests in `t08-booking-conflicts.spec.ts`, and translation/contract tests in `t14-mobile-logic.spec.ts`.

---

### BUG-036: Service Edit Fails with "property categoryId should not exist" [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/backend/test/t07-provider-setup.spec.ts`)
- **Location**: `apps/backend/test/t07-provider-setup.spec.ts`
- **Symptom**: When a provider edits an existing service on the mobile Edit Service screen (`apps/mobile/src/app/(provider)/services/[id].tsx`), saving fails with HTTP 400 Bad Request: `property categoryId should not exist`.
- **Root Cause**: The mobile edit form always submits `categoryId` in the save payload:
  ```typescript
  const payload = {
    name: form.name.trim(),
    categoryId: form.categoryId,
    description: form.description.trim() || undefined,
    durationMin: Number(form.durationMin),
    priceType: form.priceType,
    price: Number(form.price),
    isActive: form.isActive,
  };
  ```
  However, `UpdateServiceDto` in `apps/backend/src/providers/dto/provider-endpoints.dto.ts` did not declare `categoryId?: string`. Because NestJS uses global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, any request to `PATCH /api/v1/providers/me/services/:id` with `categoryId` in the body was rejected with HTTP 400 (`property categoryId should not exist`).
- **Resolution**: Added `@IsUUID() @IsOptional() categoryId?: string;` to `UpdateServiceDto` in `apps/backend/src/providers/dto/provider-endpoints.dto.ts`. Flipped regression test in `t07-provider-setup.spec.ts` from `it.failing` to active `it`.
