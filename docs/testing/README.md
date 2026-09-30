# HairConnekt Testing & CI Safety-Net

This repository contains automated regression tests and a GitHub Actions CI pipeline designed to protect core user flows, prevent regressions, and enforce production safety.

---

## 1. Quick Start: Running Tests Locally

### Backend Tests (T01–T13 & Safety Guard)

Backend tests reside in `apps/backend/test/` and run using Jest against an isolated test database.

```bash
cd apps/backend
npm test
```

#### Running a Specific Backend Test Suite
```bash
npm test -- test/t01-client-auth.spec.ts
npm test -- test/t13-upload-contract.spec.ts
```

#### Local Database Requirements
- Backend integration tests require a local PostgreSQL instance (e.g. running via Docker or native service on port 5432).
- Example Docker command for local test database:
  ```bash
  docker run --rm -d \
    --name hairconnekt-test-db \
    -e POSTGRES_USER=testuser \
    -e POSTGRES_PASSWORD=testpass \
    -e POSTGRES_DB=hairconnekt_test \
    -p 5432:5432 \
    postgis/postgis:16-3.5
  ```
- Run migrations before running integration tests:
  ```bash
  DATABASE_URL=postgres://testuser:testpass@127.0.0.1:5432/hairconnekt_test npm run migration:run:dev
  ```
- **Safety Fallback**: If no local database is running, the test suite detects this automatically via an early probe and skips database-dependent assertions while passing unit tests (such as `test-guard.spec.ts` and `t13-upload-contract.spec.ts`). In CI, PostgreSQL is guaranteed by a dedicated service container.

---

### Mobile Tests (T14–T15)

Mobile tests reside in `apps/mobile/test/` and verify API URL construction, German error mapping, secure storage contracts, and time formatting.

```bash
cd apps/mobile
npm test
```

#### Running a Specific Mobile Test Suite
```bash
npm test -- test/t14-mobile-logic.spec.ts
npm test -- test/t15-mobile-formatting.spec.ts
```

#### Mobile Type-Check
```bash
cd apps/mobile
npm run type-check
```

---

### Admin Dashboard (Build & Type-Check)

The admin dashboard is a Vite application with strict TypeScript checking:

```bash
cd apps/admin
npm run build
```

---

## 2. Test Suite Map

| Suite ID | File | Target Scope |
| :--- | :--- | :--- |
| **Guard** | `apps/backend/test/test-guard.spec.ts` | Enforces R11 host allowlist (`localhost`, `127.0.0.1`, `postgres`), blocks `neon` |
| **T01** | `apps/backend/test/t01-client-auth.spec.ts` | Client registration, mailer OTP extraction, verification, password security, `/users/me` exclusion |
| **T02** | `apps/backend/test/t02-password-reset.spec.ts` | Password reset OTP via mailer, `verify-otp`, `reset-password`, old password invalidation |
| **T03** | `apps/backend/test/t03-auth-guards.spec.ts` | 401 on missing/malformed tokens, role guards (`Role.CLIENT`, `Role.PROVIDER`), refresh rotation |
| **T04** | `apps/backend/test/t04-provider-onboarding.spec.ts` | Provider profile completion, avatar upload, ID document upload, portfolio, status `pending` |
| **T05** | `apps/backend/test/t05-account-recovery.spec.ts` | Verified provider without profile recovery via password, fresh onboarding token generation |
| **T06** | `apps/backend/test/t06-admin-contract.spec.ts` | Admin CSRF step, login, approve/reject/suspend transitions, category CRUD, [BUG-019] |
| **T07** | `apps/backend/test/t07-provider-setup.spec.ts` | Service CRUD, 7-day availability schedule, online toggle, time blocks creation and deletion |
| **T08** | `apps/backend/test/t08-booking-conflicts.spec.ts` | Provider search, booking creation (`HC-YYYYMMDD-NNNN`), pricing sum, double-booking 409 rejection |
| **T09** | `apps/backend/test/t09-booking-lifecycle.spec.ts` | Booking status transitions (`PENDING` -> `CONFIRMED` -> `IN_PROGRESS` -> `COMPLETED`) |
| **T10** | `apps/backend/test/t10-cancellation-stats.spec.ts` | Client cancellation, slot release, provider dashboard stats, [BUG-024] |
| **T11** | `apps/backend/test/t11-berlin-time.spec.ts` | Berlin wall-clock vs UTC server, DST transition across 2026-10-25, [BUG-023] |
| **T12** | `apps/backend/test/t12-reviews-ratings.spec.ts` | Client review creation after completion, duplicate review block, 1–5 range, provider rating recalculation |
| **T13** | `apps/backend/test/t13-upload-contract.spec.ts` | Static contract matching mobile/admin `FormData` fields to backend `FileInterceptor` fields |
| **T14** | `apps/mobile/test/t14-mobile-logic.spec.ts` | `apiFetch` URL builder, [BUG-020], static URL audit, `mapHttpError` German mapping, draft storage (BUG-016), resend timer (BUG-014) |
| **T15** | `apps/mobile/test/t15-mobile-formatting.spec.ts` | Time string formatters, currency formatting, [BUG-021] booking request screen time offset |

---

## 3. GitHub Actions CI Architecture

The CI workflow `.github/workflows/ci.yml` triggers on every `push` and `pull_request` across all branches.

### Concurrency
Uses `cancel-in-progress: true` so rapid commits cancel superseded runs immediately, saving GitHub Actions minutes:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### Parallel Jobs
1. **Backend**:
   - Spawns a `postgis/postgis:16-3.5` service container on port 5432.
   - Runs database migrations with `npm run migration:run:dev`.
   - Runs all 14 test suites in `apps/backend` using safe dummy environment variables.
2. **Mobile**:
   - Runs `npm run type-check` (`tsc --noEmit`).
   - Runs Jest test suites T14 and T15.
3. **Admin**:
   - Runs `npm run build` (`tsc -b && vite build`).
4. **Summary**:
   - Compiles execution results into a formatted GitHub Step Summary table.

---

## 4. Production Safety Rules

The test environment strictly enforces isolation from production:
- **No Production Database Connection**: `test/env-guard.ts` intercepts database connections and throws a fatal error if the host is anything other than `localhost`, `127.0.0.1`, or `postgres`, or if the connection string contains `neon`.
- **No Third-Party API Calls**: Brevo mailer, Cloudflare R2, Google Geocoding, and Expo Push notifications are replaced with in-memory test doubles (`FakeMailer`, `FakeR2Service`, `FakeGeocodingService`).
- **Clock Freezing**: `test/test-time.ts` provides helpers to freeze the test clock at fixed instants (`SUMMER_NOW`, `WINTER_NOW`) without leaking timer side-effects.

---

## 5. Template: Adding a New Regression Test

When a bug is reported or discovered, follow this workflow:

1. **Write the test first**: Reproduce the exact bug scenario using the existing test harness.
2. **Mark as expected failure** using `it.failing` (do NOT let a broken test block unrelated work before the fix is ready).
3. **Document in `docs/testing/KNOWN_BUG_TESTS.md`**: Record the bug ID, root cause, and remediation steps.
4. **Fix the bug in production code** in a dedicated fix commit/branch.
5. **Convert `it.failing` to `it`**: The test will now assert that the bug stays fixed forever.

### Example Backend Test Template

```typescript
import { request, setupTestApp, createTestClient, createTestProvider } from './test-bootstrap';

describe('Regression BUG-XXX: Description of issue', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it.failing('[KNOWN BUG-XXX] description of expected behavior', async () => {
    const { token } = await createTestClient(ctx.dataSource);

    const res = await request(ctx.app.getHttpServer())
      .post('/api/v1/some-endpoint')
      .set('Authorization', `Bearer ${token}`)
      .send({ someField: 'value' });

    expect(res.status).toBe(200);
    expect(res.body.expectedField).toBeDefined();
  });
});
```
