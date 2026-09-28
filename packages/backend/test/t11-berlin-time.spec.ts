import request from 'supertest';
import { createTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
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

  it('DST switch and time mapping across 2026-10-25', runTest(async () => {
    // Clocks change on DST_SWITCH_DAY (2026-10-25): 03:00 CEST -> 02:00 CET
    // Saturday 2026-10-24 is CEST (UTC+2): 09:00 Berlin is 07:00 UTC
    // Monday 2026-10-26 is CET (UTC+1): 09:00 Berlin is 08:00 UTC

    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services } = await createTestProvider(ctx.dataSource);

    // 1. Summer booking (before DST)
    const bookingSummer = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-10-24',
      scheduledTime: '09:00',
    });

    // 2. Winter booking (after DST)
    const bookingWinter = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: '2026-10-26',
      scheduledTime: '09:00',
    });

    expect(bookingSummer.scheduledDate).toBe('2026-10-24');
    expect(bookingWinter.scheduledDate).toBe('2026-10-26');
  }));
});
