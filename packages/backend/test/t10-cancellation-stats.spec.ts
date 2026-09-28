import request from 'supertest';
import { createTestApp, closeTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider, createTestBooking } from './test-factories';
import { BookingStatus } from '../src/entities/booking.entity';

describe('T10: Cancellation, Policy Windows and Stats', () => {
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

  it('allows client to cancel booking and frees up the slot for a new booking', runTest(async () => {
    const { user: client, token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services } = await createTestProvider(ctx.dataSource);

    const scheduledDate = '2026-11-25';
    const scheduledTime = '14:00';

    const booking = await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.PENDING,
      scheduledDate,
      scheduledTime,
    });

    // 1. Client cancels the booking
    const cancelRes = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        reason: 'Andere Pläne',
        notes: 'Change of schedule',
      })
      .expect(200);

    expect(cancelRes.body.status).toBe('CANCELLED');

    // 2. The slot is now bookable again (same provider, same date, same time)
    const { token: otherClientToken } = await createTestClient(ctx.dataSource);
    const newBookingRes = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate,
        scheduledTime,
        isMobile: false,
      })
      .expect(201);

    expect(newBookingRes.body.booking?.status || newBookingRes.body.status).toBe('PENDING');
  }));

  // KNOWN BUG-024: Cancelled booking is still counted in provider's "today's appointments" stat
  it.failing('[KNOWN BUG-024] cancelled bookings are not counted in provider today appointments stat', runTest(async () => {
    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    const todayStr = new Date().toISOString().split('T')[0];

    // Create a CANCELLED booking for today
    await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CANCELLED,
      scheduledDate: todayStr,
      scheduledTime: '15:00',
    });

    // Fetch dashboard stats via GET /providers/me/stats
    const statsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me/stats')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    // BUG-024: todayAppointments should be 0 because the only booking for today is cancelled,
    // but the backend does count({ where: { providerId, scheduledDate: today } }) without filtering status
    expect(statsRes.body.todayAppointments).toBe(0);
  }, true));

  // KNOWN BUG-024: provider next appointment stat ignores cancelled bookings and reflects the next active booking
  it.failing('[KNOWN BUG-024] provider next appointment stat ignores cancelled bookings', runTest(async () => {
    const { user: client } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource);

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Cancelled booking earlier today at 10:00
    await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CANCELLED,
      scheduledDate: todayStr,
      scheduledTime: '10:00',
    });

    // 2. Confirmed booking later today at 14:00
    await createTestBooking(ctx.dataSource, {
      client,
      provider,
      services,
      status: BookingStatus.CONFIRMED,
      scheduledDate: todayStr,
      scheduledTime: '14:00',
    });

    // Fetch dashboard stats via GET /providers/me/stats: asserts nextAppointmentTime is '14:00' (ignoring cancelled 10:00 slot)
    // BUG-024: Backend currently returns nextAppointmentTime: null without calculating the next active appointment
    const statsRes = await request(ctx.app.getHttpServer())
      .get('/api/v1/providers/me/stats')
      .set('Authorization', `Bearer ${providerToken}`)
      .expect(200);

    expect(statsRes.body.nextAppointmentTime).toBe('14:00');
  }, true));
});
