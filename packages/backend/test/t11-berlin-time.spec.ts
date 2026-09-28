import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestBooking } from './test-factories';
import { BookingStatus } from '../src/entities/booking.entity';
import { SUMMER_NOW, WINTER_NOW, DST_SWITCH_DAY, freezeClock, unfreezeClock } from './test-time';

describe('T11: Berlin Time Correctness (server in UTC)', () => {
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

  const runTest = (testFn: () => Promise<void>, isFailing = false) => {
    return async () => {
      if (!dbReady) {
        console.warn('Skipping test: Database not available locally (runs in CI container)');
        if (isFailing) {
          throw new Error('Database not available locally');
        }
        return;
      }
      await testFn();
    };
  };

  // KNOWN BUG-023: server reads Berlin wall-clock time as UTC, so starting an appointment at 09:29 Berlin is rejected as "too early"
  it.failing('[KNOWN BUG-023] appointment at 09:00 Berlin can be started at SUMMER_NOW (09:29 Berlin)', runTest(async () => {
    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    // Freeze clock at SUMMER_NOW: 2026-09-28T07:29:00Z (which is 09:29 in Berlin, UTC+2)
    freezeClock(SUMMER_NOW);

    // Appointment scheduled for 2026-09-28 at 09:00 (Berlin local time)
    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-09-28',
      scheduledTime: '09:00',
    });

    // BUG-023: In Berlin, 09:29 is AFTER 09:00, so starting the appointment should succeed.
    // But because server runs in UTC and does new Date(year, month, day, 9, 0), it creates 09:00 UTC (11:00 Berlin).
    // At 07:29 UTC (09:29 Berlin), it calculates earliestStartMs as 08:30 UTC, rejecting with 400.
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/start`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  }, true));

  // Summer boundary 1: 06:29Z is before the 30-min start window (window begins at 06:30Z for 09:00 Berlin / 07:00Z)
  it('summer, 09:00 Berlin: rejected at 06:29Z (before 30m start window)', runTest(async () => {
    freezeClock('2026-09-28T06:29:00Z');

    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-09-28',
      scheduledTime: '09:00',
    });

    // Asserts HTTP 400 rejection because 06:29Z is 1 minute before allowed start window
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/start`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(400);

    expect(res.body.message).toMatch(/30 Minuten vor der geplanten Zeit/i);
  }));

  // Summer boundary 2: 06:30Z is exact 30-min start window boundary (09:00 Berlin = 07:00Z, so 07:00Z - 30m = 06:30Z)
  // KNOWN BUG-023: server interprets 09:00 wall-clock as 09:00 UTC (earliest start 08:30 UTC), rejecting 06:30Z with 400
  it.failing('[KNOWN BUG-023] summer, 09:00 Berlin: allowed to start at 06:30Z (exact 30m boundary)', runTest(async () => {
    freezeClock('2026-09-28T06:30:00Z');

    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-09-28',
      scheduledTime: '09:00',
    });

    // Asserts HTTP 200 OK and status IN_PROGRESS at 06:30Z
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/start`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  }, true));

  // Winter boundary 1: 07:29Z is before the 30-min start window for 09:00 Berlin (winter 2026-11-03, 09:00 Berlin = 08:00Z, window at 07:30Z)
  it('winter (2026-11-03, 09:00 Berlin = 08:00Z): rejected at 07:29Z (before 30m start window)', runTest(async () => {
    freezeClock('2026-11-03T07:29:00Z');

    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-11-03',
      scheduledTime: '09:00',
    });

    // Asserts HTTP 400 rejection because 07:29Z is 1 minute before allowed start window
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/start`)
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(400);

    expect(res.body.message).toMatch(/30 Minuten vor der geplanten Zeit/i);
  }));

  // Winter boundary 2: 07:30Z is exact 30-min start window boundary (09:00 Berlin = 08:00Z, so 08:00Z - 30m = 07:30Z)
  // KNOWN BUG-023: server interprets 09:00 as 09:00 UTC (earliest start 08:30 UTC), rejecting 07:30Z with 400
  it.failing('[KNOWN BUG-023] winter (2026-11-03, 09:00 Berlin = 08:00Z): allowed to start at 07:30Z (exact 30m boundary)', runTest(async () => {
    freezeClock('2026-11-03T07:30:00Z');

    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-11-03',
      scheduledTime: '09:00',
    });

    // Asserts HTTP 200 OK and status IN_PROGRESS at 07:30Z
    const res = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/start`)
      .set('Authorization', `Bearer ${providerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('IN_PROGRESS');
  }, true));

  // KNOWN BUG-023: At 00:30 Berlin time (22:30Z previous UTC day), provider today's stats evaluates today via UTC midnight
  it.failing('[KNOWN BUG-023] 00:30 Berlin belongs to the right day for today provider stats', runTest(async () => {
    // 2026-09-28T22:30:00Z is 2026-09-29 00:30:00 CEST (Berlin local time)
    freezeClock('2026-09-28T22:30:00Z');

    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    // Create a confirmed booking for 2026-09-29 ("today" in Berlin)
    await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-09-29',
      scheduledTime: '10:00',
    });

    // Query GET /api/v1/providers/me/stats: asserts todayAppointments is 1
    // BUG-023: server uses new Date().toISOString().split('T')[0] which evaluates to '2026-09-28', returning 0
    const statsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me/stats')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(statsRes.body.todayAppointments).toBe(1);
  }, true));
});
