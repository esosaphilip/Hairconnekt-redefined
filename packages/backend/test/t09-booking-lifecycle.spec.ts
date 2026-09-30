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

  it('client reschedules a confirmed booking to a new valid slot, freeing the old slot and occupying the new slot', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);
    const { user: otherClient, token: otherClientToken } = await createTestClient(ctx.dataSource);

    const originalDate = '2026-11-20';
    const originalTime = '10:00';
    const rescheduledDate = '2026-11-20';
    const rescheduledTime = '14:00';

    // 1. Create a confirmed booking for client at originalDate / originalTime
    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: originalDate,
      scheduledTime: originalTime,
    });

    // 2. Provider cannot reschedule booking: asserts HTTP 403 Forbidden (RolesGuard restricts to CLIENT)
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/reschedule`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        scheduledDate: rescheduledDate,
        scheduledTime: rescheduledTime,
        reason: 'Provider trying to reschedule',
      })
      .expect(403);

    // 3. Another client cannot reschedule this client's booking: asserts HTTP 403 Forbidden (AccessService check)
    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/reschedule`)
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({
        scheduledDate: rescheduledDate,
        scheduledTime: rescheduledTime,
        reason: 'Unauthorized client trying to reschedule',
      })
      .expect(403);

    // 4. Owning client reschedules booking to rescheduledDate / rescheduledTime: asserts HTTP 200
    const rescheduleRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/reschedule`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        scheduledDate: rescheduledDate,
        scheduledTime: rescheduledTime,
        reason: 'Need afternoon appointment instead',
      })
      .expect(200);

    expect(rescheduleRes.body.scheduledDate).toBe(rescheduledDate);
    expect(rescheduleRes.body.scheduledTime).toMatch(/^14:00(:00)?$/);
    expect(rescheduleRes.body.status).toBe(BookingStatus.PENDING);

    // 5. Confirm booking's date and time actually changed via GET /api/v1/bookings/:id
    const fetchRes = await request(ctx.app.getHttpServer())
      .get(`/api/v1/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    expect(fetchRes.body.scheduledDate).toBe(rescheduledDate);
    expect(fetchRes.body.scheduledTime).toMatch(/^14:00(:00)?$/);

    // 6. Confirm the OLD slot is now available again for someone else to book
    const oldSlotBookingRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: originalDate,
        scheduledTime: originalTime,
        isMobile: false,
      })
      .expect(201);

    const newBookingId = oldSlotBookingRes.body.booking?.id || oldSlotBookingRes.body.id;
    expect(newBookingId).toBeDefined();

    // 7. Confirm the NEW slot is now occupied and rejects another booking with HTTP 409 Conflict
    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: rescheduledDate,
        scheduledTime: rescheduledTime,
        isMobile: false,
      })
      .expect(409);
  }));
});
