import request from 'supertest';
import { createTestApp, truncateAllTables, isDatabaseAvailable, TestAppContext } from './test-bootstrap';
import { createTestClient, createTestProvider } from './test-factories';

describe('T08: Booking Creation and Conflicts', () => {
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

  const runTest = (testFn: () => Promise<void>) => {
    return async () => {
      if (!dbReady) {
        console.warn('Skipping test: Database not available locally (runs in CI container)');
        return;
      }
      await testFn();
    };
  };

  it('creates booking with HC-YYYYMMDD-NNNN number, calculates total price, and rejects conflicts/past dates', runTest(async () => {
    const { token: clientToken } = await createTestClient(ctx.dataSource);
    const { provider, services, token: providerToken } = await createTestProvider(ctx.dataSource, { serviceCount: 2 });

    const scheduledDate = '2026-11-18'; // Wednesday
    const scheduledTime = '11:00';
    const expectedPrice = services.reduce((sum, s) => sum + Number(s.price), 0);

    // 1. Create first booking
    const bookingRes1 = await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: services.map((s) => s.id),
        scheduledDate,
        scheduledTime,
        isMobile: false,
        clientNotes: 'First booking',
      })
      .expect(201);

    const booking1 = bookingRes1.body.booking || bookingRes1.body;
    expect(booking1.status).toBe('PENDING');
    expect(booking1.bookingNumber).toMatch(/^HC-\d{8}-\d{4}$/);
    expect(Number(booking1.totalPrice)).toBe(expectedPrice);

    // 2. Attempting to book the SAME slot twice returns 409 Conflict
    const { token: otherClientToken } = await createTestClient(ctx.dataSource);
    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${otherClientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate,
        scheduledTime,
        isMobile: false,
      })
      .expect(409);

    // 3. Booking in the past is rejected
    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: '2020-01-01',
        scheduledTime: '10:00',
        isMobile: false,
      })
      .expect(400);

    // 4. Booking on a blocked time is rejected
    const blockDate = '2026-11-20';
    await request(ctx.app.getHttpServer())
      .post('/api/v1/providers/me/blocks')
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        startDate: blockDate,
        endDate: blockDate,
        isAllDay: true,
        reason: 'Vacation',
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        providerId: provider.id,
        serviceIds: [services[0].id],
        scheduledDate: blockDate,
        scheduledTime: '10:00',
        isMobile: false,
      })
      .expect(409);
  }));
});
