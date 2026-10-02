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
| **BUG-040 / BUG-041 / BUG-042 / BUG-044** | `apps/backend/test/t18-booking-location.spec.ts`, `apps/mobile/test/t20-mobile-address-location.spec.ts` | T18 backend + T20 mobile: Mobile screens display correct booking location per role & status privacy rules, saved-address badge live count, booking-address-field refactor | `RESOLVED` (Active `it`) |
| **BUG-043** | `apps/mobile/test/t20-mobile-address-location.spec.ts` | T20 mobile only: Maps chooser on Route button press — iOS action sheet when GM installed else Apple Maps direct; Android geo intent; web fallback; no unhandled rejections | `RESOLVED` (Active `it`) |
| **BUG-045** | `apps/backend/test/t16-booking-response-privacy.spec.ts`, `apps/backend/test/t17-private-id-storage.spec.ts` | `T16: Booking Response Privacy & Allowed Field Serialization; T17: Private ID Document Storage & Migration` | `RESOLVED` (Active `it`) |
| **BUG-041 / BUG-042** | `apps/backend/test/t18-booking-location.spec.ts` | `T18: Booking Location Privacy & Default Address Rules` | `RESOLVED` (Active `it`) |
| **BUG-048** | `apps/mobile/test/t20-mobile-address-location.spec.ts` | T20 mobile only: Client profile addresses menu badge uses live server count from GET /users/me/addresses, hidden on load/error | `RESOLVED` (Active `it`) |
| **BUG-050** | `apps/backend/test/t19-admin-id-document-corp.spec.ts` | `Admin provider ID document Cross-Origin-Resource-Policy same-site on 302 success, same-origin on errors and sibling routes` | `RESOLVED` (Active `it`) |

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

---

### BUG-045: Booking Responses Leak Sensitive Nested Entity Fields [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/backend/test/t16-booking-response-privacy.spec.ts`)
- **Location**: `apps/backend/src/bookings/booking-response.mapper.ts`, `apps/backend/src/bookings/bookings.service.ts`
- **Symptom**: `GET /bookings`, `GET /bookings/:id`, `POST /bookings`, and booking transition actions (`accept`, `decline`, `start`, `complete`, `reschedule`, `cancel`) returned full unmapped `Booking` entities with relations `provider`, `provider.user`, and `client`. Because `Booking.toJSON()` returned `{ ...this }` and no response serializer was registered, sensitive provider and user fields leaked in responses:
  - Provider: `idDocumentUrl` (critical ID document link), `street`, `houseNumber`, `postalCode`, `lat`, `lng`, `status`, `bufferMinutes`, `portfolioMarketingConsent`, `portfolioMarketingConsentAt`, internal timestamps.
  - User (`provider.user` and `client`): `email`, `birthDate`, `gender`, `googleId`, `expoPushToken`, verification flags, timestamps.
- **Root Cause**: Absence of response filtering or allowlist mapping when returning booking entities across all booking controller/service methods.
- **Resolution (Step 1)**:
  1. Created explicit allowlist mapper `toBookingResponse(booking, actor)` in `apps/backend/src/bookings/booking-response.mapper.ts`:
     - Top-level booking fields and `services` preserved.
     - `provider`: strictly allowlisted to `id`, `userId`, `businessName`, `providerType`, `bio`, `city`, `avatarUrl`, `avgRating`, `totalReviews`, `cancellationPolicy`, `languages`, `serviceRadius`, `experienceYears`, `isOnline`.
     - `provider.user`: allowlisted to `id`, `firstName`, `lastName`, `avatarUrl`, `phone`.
     - `client`: allowlisted to `id`, `firstName`, `lastName`, `avatarUrl`, `phone`.
     - **Address Rule**: Provider street address (`street`, `houseNumber`, `postalCode`) is included ONLY when the caller is the client of that booking AND the booking status is `CONFIRMED`, `IN_PROGRESS`, or `COMPLETED`. In all other cases (e.g., `PENDING`, `CANCELLED`, or provider querying), the street address fields are omitted. `provider.city` is always included. `lat` and `lng` are never returned in booking responses.
  2. Applied `toBookingResponse` across `createBooking`, `findOne`, and `findAll` (and all actions returning `this.findOne`).
  3. Added comprehensive test suite `apps/backend/test/t16-booking-response-privacy.spec.ts` verifying recursive absence of sensitive fields, address rule enforcement, and preservation of required fields.

- **Resolution (Step 2)**:
  1. Created separate private Cloudflare R2 bucket configuration (`R2_PRIVATE_BUCKET_NAME`) across `render.yaml`, `apps/backend/.env.example`, `.github/workflows/ci.yml`, `test/env-guard.ts`, and `src/main.ts`.
  2. Updated `R2Service` (`apps/backend/src/common/storage/r2.service.ts`):
     - Fails fast on initialization if `R2_PRIVATE_BUCKET_NAME` is missing, empty, or equals `R2_BUCKET_NAME`.
     - On module initialization in production, sends `HeadBucketCommand` against the private bucket.
     - `uploadPrivateFile`: writes private files (including provider ID documents) strictly to `this.privateBucket` with `Cache-Control: private, no-cache, no-store`.
     - Added `deletePrivateByKey(key)` to delete objects from `this.privateBucket`.
     - `createSignedReadUrl`: checks the private bucket first; falls back to public bucket only on 404 (`NotFound`), logging a warning with no object key or credentials; rethrows any other errors immediately.
     - Preserved public file methods (`uploadFile`, `uploadFileWithKey`, `deleteFile`, `deleteByKey`) targeting `this.bucket`.
  3. Created migration script `apps/backend/scripts/migrate-id-documents-to-private-bucket.ts` supporting `--dry-run`, `--copy`, and `--purge-source` with strict prefix isolation, size/ETag verification, and safe pagination.
  4. Added comprehensive test suite `apps/backend/test/t17-private-id-storage.spec.ts` (14 passing tests) verifying bucket validation, upload separation, dual-read fallback, startup checks, and migration logic.

---

### BUG-041 & BUG-042: Mobile Booking Address Privacy & Default Address Rules [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/backend/test/t18-booking-location.spec.ts`)
- **Location**: `apps/backend/src/bookings/booking-response.mapper.ts`, `apps/backend/src/users/users.service.ts`
- **Symptom**:
  1. For mobile bookings (`isMobile = true`), providers received the client's full address (including street and house number) at all statuses, including `PENDING`, leaking the client's exact home location before appointment acceptance. Additionally, raw snapshot columns `addressStreet`, `addressHouseNumber`, `addressCity`, `addressPostalCode` leaked at the top level.
  2. In `UsersService`, creating a user's first address did not mark it as default; deleting a default address left remaining addresses without a default; and unsetting the default on the only default address left a user with zero default addresses.
- **Root Cause**: Missing address privacy rules for mobile bookings in `toBookingResponse`, and lack of default address lifecycle management in `UsersService`.
- **Resolution**:
  1. Updated `toBookingResponse` in `apps/backend/src/bookings/booking-response.mapper.ts`:
     - Omitted top-level raw snapshot columns `addressStreet`, `addressHouseNumber`, `addressCity`, `addressPostalCode` for all callers.
     - When caller is client who owns the booking: `address` is unchanged (full street address).
     - When caller is provider: full `address` is returned only when status is `CONFIRMED`, `IN_PROGRESS`, or `COMPLETED`. For `PENDING`, `CANCELLED`, etc., `street` and `houseNumber` are masked as `null`, while `postalCode` and `city` are preserved.
     - For studio bookings: `address` is `null` for both roles.
  2. Updated `UsersService` in `apps/backend/src/users/users.service.ts`:
     - `createAddress`: automatically sets `isDefault: true` if the user has no existing addresses.
     - `deleteAddress`: executed inside a database transaction; if the deleted address was default and other addresses remain, promotes the oldest remaining address (by `createdAt`) to `isDefault: true`.
     - `updateAddress`: ignores requests to set `isDefault: false` on the user's only default address while other addresses exist.
  3. Added regression test suite `apps/backend/test/t18-booking-location.spec.ts` (7 passing tests).

---

### BUG-050: Admin Provider ID Document Blocked by Helmet Cross-Origin-Resource-Policy [RESOLVED]

- **Status**: **RESOLVED** (`it` tests active in `apps/backend/test/t19-admin-id-document-corp.spec.ts`)
- **Location**: `apps/backend/src/admin/admin-providers.controller.ts` (`getIdDocument` handler)
- **Symptom**: Admin panel (`admin.hairconnekt.de`) → Provider details dialog → "AUSWEISDOKUMENT" section rendered the API endpoint URL (`https://api.hairconnekt.de/api/v1/admin/providers/<id>/id-document`) as an `<img src>`. Chrome DevTools reported the request as `(blocked:CORP not "same-origin")` with 0 bytes, so the image never appeared. The admin panel's avatar and popular-style images continued to load normally because they came directly from the public R2 host, not the API origin.
- **Root Cause**: `app.use(helmet())` with default options (Helmet 8.1.0) sets `Cross-Origin-Resource-Policy: same-origin` on every response, including the 302 redirect emitted by `getIdDocument`. `admin.hairconnekt.de` and `api.hairconnekt.de` are two different origins, so the browser refused to hand the API-origin response to the admin-origin document as a subresource image load. No `Domain=.hairconnekt.de` cookie scope or SameSite mismatch was the blocker; the CORP header enforcement happened before any auth cookie logic.
- **Resolution**:
  1. In `apps/backend/src/admin/admin-providers.controller.ts`, immediately before the success-path `return res.redirect(signedUrl)` inside `getIdDocument`, added `res.setHeader('Cross-Origin-Resource-Policy', 'same-site')`. Because this line runs **after** the 401/403 guard chain and **after** the 404 `idDocumentUrl` presence check, only the 302 success response is relaxed; all error paths (401, 403, 404) still throw before reaching it and retain Helmet's strict `same-origin` default. All other routes in the API also keep `same-origin` because no other handler overwrites the header.
  2. `same-site` permits subresource reads from any origin within the same registrable domain (both subdomains under `hairconnekt.de`) while still blocking every foreign origin (`*.com`, `*.net`, attacker sites). Combined with the unchanged guard chain, this is the narrowest correct relaxation.
  3. Added regression suite `apps/backend/test/t19-admin-id-document-corp.spec.ts` (5 active tests) verifying:
     - 302 success has CORP `same-site` and non-empty Location.
     - Sibling `GET /admin/providers/:id` details endpoint still has CORP `same-origin`.
     - Unauthenticated 401 has CORP `same-origin` and no Location.
     - Admin 404 for a provider with no ID document has CORP `same-origin` and no Location.
     - Authenticated non-admin (client role) is 403 rejected with no Location.

---

### BUG-040 & BUG-044: Mobile Booking Location Privacy, Live Address Badge & Address-Field Refactor [RESOLVED]

- **Status**: **RESOLVED** (`it` tests active in `apps/mobile/test/t20-mobile-address-location.spec.ts` and `apps/backend/test/t18-booking-location.spec.ts`)
- **Location**: `apps/mobile/src/utils/address.ts`, `apps/mobile/src/utils/location.ts`, `apps/mobile/src/app/(client)/booking/details.tsx`, `apps/mobile/src/app/(provider)/booking-request/[id].tsx`
- **Symptom**: Mobile booking screens displayed inconsistent booking location per role/status; saved-address badge count was stale or hardcoded; booking-address field logic was duplicated inline across screens without reusable utilities.
- **Root Cause**: Absence of centralized mobile-side address privacy helpers; screens reimplemented address rendering and badge counts without live server state.
- **Resolution**: Extracted `formatAddressForRole(booking, actor)` and `useAddressesCount()` into `apps/mobile/src/utils/`, refactored booking screens to use shared `BookingAddressField` components, and wired saved-address badges to the live `GET /users/me/addresses` response length.
- **Tests**: Active `it` tests in T18 backend (`apps/backend/test/t18-booking-location.spec.ts`) and T20 mobile (`apps/mobile/test/t20-mobile-address-location.spec.ts`).

---

### BUG-043: Route Button Maps Chooser (iOS Action Sheet / Android geo / Web Fallback) [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/mobile/test/t20-mobile-address-location.spec.ts`)
- **Location**: `apps/mobile/src/utils/maps.ts`, `apps/mobile/src/app/(provider)/booking-request/[id].tsx`, `apps/mobile/src/app/(client)/bookings/[id].tsx`
- **Symptom**: Tapping the "Route" navigation button produced unhandled promise rejections on unsupported schemes, silently failed on web, and had no platform-aware chooser between Google Maps, Apple Maps, and browser fallback.
- **Root Cause**: Raw `Linking.openURL(url)` calls without `canOpenURL` guards, and no iOS/Android/web platform branching for map navigation schemes.
- **Resolution**: Implemented `openMapsRouter(address)` in `apps/mobile/src/utils/maps.ts` detecting Google Maps installation on iOS and presenting an action sheet or falling back to Apple Maps direct; on Android opens a `geo:` intent; on web falls back to Google Maps URL; all promise chains catch errors with no unhandled rejections.
- **Tests**: Active `it` tests in T20 mobile (`apps/mobile/test/t20-mobile-address-location.spec.ts`).

---

### BUG-048: Client Profile Addresses Menu Badge Uses Live Server Count [RESOLVED]

- **Status**: **RESOLVED** (`it` test active in `apps/mobile/test/t20-mobile-address-location.spec.ts`)
- **Location**: `apps/mobile/src/utils/useAddresses.ts`, `apps/mobile/src/app/(client)/profile/index.tsx`
- **Symptom**: The client profile "Addresses" menu item displayed a hardcoded or stale badge value, and the badge remained visible during loading and after fetch errors, misleading users about how many saved addresses they had.
- **Root Cause**: Badge value was a static literal; no hook wired to `GET /users/me/addresses`, and no conditional visibility tied to `isLoading` / `isError` state.
- **Resolution**: Added `useAddresses()` hook in `apps/mobile/src/utils/useAddresses.ts` fetching live `GET /users/me/addresses` and exposing `count`, `isLoading`, and `isError`; profile menu badge now hides on load/error and displays the server-returned array length.
- **Tests**: Active `it` tests in T20 mobile (`apps/mobile/test/t20-mobile-address-location.spec.ts`).
