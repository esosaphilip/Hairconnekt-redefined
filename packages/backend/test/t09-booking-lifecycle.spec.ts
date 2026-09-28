import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestBooking } from './test-factories';
import { BookingStatus } from '../src/entities/booking.entity';
import { freezeClock, unfreezeClock } from './test-time';

describe('T09: Booking Lifecycle and Permissions', () => {
  let ctx: TestAppContext;
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await isDatabaseAvailable();
    if (dbReady) {
      ctx = await createTestApp();
    }
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(async () => {
    if (dbReady && ctx) {
      await truncateAllTables(ctx.dataSource);
    }
  });

  afterEach(() => {
    unfreezeClock();
  });

  const runTest = (testFn: () => Promise<void>) => {
    return async () => {
      if (!dbReady) {
        console.warn('Skipping test: Database not available locally (runs in CI container)');
        return;
      }
      await testFn();
    };
  };

  it('progresses booking through PENDING -> CONFIRMED -> IN_PROGRESS -> COMPLETED and rejects invalid transition from COMPLETED to CONFIRMED', runTest(async () => {
    // Freeze clock inside start window (09:45 UTC, within 30m of 10:00 scheduled time)
    freezeClock('2026-10-15T09:45:00Z');

    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);
    const { token: otherProviderToken } = await createTestProvider(ctx.dataSource);

    const scheduledDate = '2026-10-15';
    const scheduledTime = '10:00';

    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.PENDING,
      scheduledDate,
      scheduledTime,
    });

    // 1. Client cannot accept or start the booking: asserts HTTP 403 Forbidden
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/accept`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/start`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    // 2. Another provider cannot touch this booking: asserts HTTP 403 Forbidden
    const unauthorizedProviderRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/accept`)
      .set('Authorization', `Bearer ${otherProviderToken}`);
    expect([403, 404]).toContain(unauthorizedProviderRes.status);

    // 3. Provider accepts booking: asserts HTTP 200 and status CONFIRMED
    const acceptRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/accept`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(acceptRes.body.status).toBe('CONFIRMED');

    // 4. Provider starts booking within start window: asserts HTTP 200 and status IN_PROGRESS
    const startRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/start`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(startRes.body.status).toBe('IN_PROGRESS');

    // 5. Complete booking (cash-payment Phase 1 requires no extra body payload): asserts HTTP 200 and status COMPLETED
    const completeRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(completeRes.body.status).toBe('COMPLETED');

    // 6. Invalid transition: completed booking cannot be accepted again: asserts HTTP 400 Bad Request
    const invalidRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/accept`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(400);

    expect(invalidRes.body.message).toMatch(/Nur ausstehende Buchungen können bestätigt werden/i);
  }));

  it('provider declines a pending booking request via real decline route, asserting status CANCELLED and cancelledBy PROVIDER', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);
    const { token: otherProviderToken } = await createTestProvider(ctx.dataSource);

    const pendingBooking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.PENDING,
      scheduledDate: '2026-10-16',
      scheduledTime: '11:00',
    });

    // 1. Client cannot decline via provider route: asserts HTTP 403 Forbidden
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${pendingBooking.id}/decline`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    // 2. Another provider cannot decline this booking: asserts HTTP 403 Forbidden
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${pendingBooking.id}/decline`)
      .set('Authorization', `Bearer ${otherProviderToken}`)
      .expect(403);

    // 3. Assigned provider declines the booking via PATCH /bookings/:id/decline: asserts HTTP 200, status CANCELLED, and cancelledBy provider ('provider')
    const declineRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${pendingBooking.id}/decline`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(declineRes.body.status).toBe('CANCELLED');
    expect(declineRes.body.cancelledBy).toBe('provider');
  }));
});
